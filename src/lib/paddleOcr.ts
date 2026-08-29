import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { markLowConfidenceRegions, type PaddleTextRegion } from './paddleConfidence.js';

const execFileAsync = promisify(execFile);
const DEFAULT_SCRIPT_PATH = 'D:\\工作用\\ocr.py';
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

export interface PaddleOcrOptions {
  scriptPath?: string;
  token?: string;
  command?: string;
  timeout?: number;
  execute?: (command: string, args: string[], options: { timeout: number; maxBuffer: number; env: NodeJS.ProcessEnv }) => Promise<{ stdout: string; stderr: string }>;
}

export interface PaddleOcrResult {
  text: string;
  source: 'paddleocr';
  confidenceAvailable: boolean;
  needsManualReview: boolean;
  lowConfidenceRegions: PaddleTextRegion[];
}

export function parseResult(stdout: string): { text: string; status?: string; confidence_regions?: unknown } {
  const starts = [...stdout.matchAll(/(?:^|\n)[ \t]*\{/g)].map((match) => match.index! + match[0].lastIndexOf('{'));
  for (const start of starts.reverse()) {
    try {
      const result = JSON.parse(stdout.slice(start)) as { text?: unknown; status?: string; confidence_regions?: unknown };
      if (typeof result.text !== 'string') continue;
      return {
        text: result.text as string,
        ...(result.status === undefined ? {} : { status: result.status }),
        ...(result.confidence_regions === undefined ? {} : { confidence_regions: result.confidence_regions })
      };
    } catch {
      // Try the next line that could contain the outer JSON object.
    }
  }
  throw Object.assign(new Error('Paddle OCR returned invalid JSON'), { code: 'PADDLE_OCR_INVALID_RESPONSE' });
}

export async function runPaddleOcrPdf(pdf: Buffer, options: PaddleOcrOptions = {}): Promise<PaddleOcrResult> {
  if (!options.token?.trim()) {
    throw Object.assign(new Error('Paddle OCR token is not configured'), { code: 'PADDLE_OCR_NOT_CONFIGURED' });
  }
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'judicial-paddle-'));
  const pdfPath = path.join(tempDir, 'input.pdf');
  await writeFile(pdfPath, pdf);
  const command = options.command ?? process.env.PYTHON ?? 'python';
  const args = [options.scriptPath ?? process.env.PADDLE_OCR_SCRIPT ?? DEFAULT_SCRIPT_PATH, pdfPath, '--extract-text-only'];
  const execute = options.execute ?? ((cmd, commandArgs, executeOptions) => execFileAsync(cmd, commandArgs, executeOptions));
  try {
    const { stdout } = await execute(command, args, {
      timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, PADDLE_OCR_TOKEN: options.token }
    });
    const result = parseResult(stdout);
    const regions = Array.isArray(result.confidence_regions) ? result.confidence_regions as PaddleTextRegion[] : [];
    const marked = markLowConfidenceRegions(regions);
    return {
      text: regions.length > 0 ? marked.text : result.text,
      source: 'paddleocr' as const,
      confidenceAvailable: regions.length > 0,
      needsManualReview: regions.length > 0 ? marked.needsManualReview : true,
      lowConfidenceRegions: marked.lowConfidenceRegions
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && error.code.startsWith('PADDLE_OCR_')) throw error;
    throw Object.assign(new Error('Paddle OCR execution failed'), { code: 'PADDLE_OCR_FAILED', cause: error });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
