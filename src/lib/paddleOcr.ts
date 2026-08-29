import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

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

function parseResult(stdout: string) {
  const start = stdout.lastIndexOf('\n{') + 1;
  const jsonText = start > 0 ? stdout.slice(start) : stdout.trim();
  try {
    const result = JSON.parse(jsonText) as { text?: unknown; status?: string };
    if (typeof result.text !== 'string') throw new Error('Paddle OCR response has no text');
    return { text: result.text as string, status: result.status };
  } catch {
    throw Object.assign(new Error('Paddle OCR returned invalid JSON'), { code: 'PADDLE_OCR_INVALID_RESPONSE' });
  }
}

export async function runPaddleOcrPdf(pdf: Buffer, options: PaddleOcrOptions = {}) {
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
    return { text: result.text, source: 'paddleocr' as const };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && error.code.startsWith('PADDLE_OCR_')) throw error;
    throw Object.assign(new Error('Paddle OCR execution failed'), { code: 'PADDLE_OCR_FAILED', cause: error });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
