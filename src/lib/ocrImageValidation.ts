import { Worker } from 'node:worker_threads';
import { validateImagePixels } from './ocrQuality.js';

const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_PIXELS = 25 * 1000 * 1000;
const DEFAULT_DECODE_TIMEOUT_MS = 2000;

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function inspectPngDimensions(bytes: Uint8Array) {
  if (bytes.byteLength < 24 || !PNG_SIGNATURE.every((value, index) => bytes[index] === value)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (Buffer.from(bytes.subarray(12, 16)).toString('ascii') !== 'IHDR') return null;
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

const decodeWorkerSource = `
  const { parentPort } = require('node:worker_threads');
  const jpeg = require('jpeg-js');
  const { PNG } = require('pngjs');
  parentPort.on('message', ({ format, bytes }) => {
    try {
      const pixels = format === 'image/png' ? PNG.sync.read(Buffer.from(bytes)).data : jpeg.decode(Buffer.from(bytes), { useTArray: true }).data;
      let min = 255, max = 0;
      for (let index = 0; index < pixels.length; index += 4) { min = Math.min(min, pixels[index]); max = Math.max(max, pixels[index]); }
      parentPort.postMessage({ ok: true, min, max });
    } catch { parentPort.postMessage({ ok: false, error: 'IMAGE_INVALID_DATA' }); }
  });
`;

export async function decodeInWorker(format: string, bytes: Buffer, timeoutMs: number): Promise<{ ok: boolean; min?: number; max?: number; error?: string }> {
  const worker = new Worker(decodeWorkerSource, { eval: true });
  return await new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const timer = setTimeout(() => {
      void worker.terminate();
      resolve({ ok: false, error: 'IMAGE_DECODE_TIMEOUT' });
    }, timeoutMs);
    worker.once('message', (result) => {
      clearTimeout(timer);
      resolve(result);
    });
    worker.once('error', () => {
      clearTimeout(timer);
      resolve({ ok: false, error: 'IMAGE_INVALID_DATA' });
    });
    worker.postMessage({ format, bytes: Uint8Array.from(bytes) });
  }).finally(() => worker.terminate());
}

export async function validateImageDataUrl(dataUrl: string, options: { maxBytes?: number; maxPixels?: number; timeoutMs?: number } = {}) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { ok: false as const, error: 'IMAGE_INVALID_DATA_URL' };
  try {
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.byteLength > (options.maxBytes ?? DEFAULT_MAX_BYTES)) {
      return { ok: false as const, error: 'IMAGE_DECODE_TIMEOUT' };
    }
    if (match[1] !== 'image/png' && match[1] !== 'image/jpeg') {
      return { ok: false as const, error: 'IMAGE_UNSUPPORTED_FORMAT' };
    }
    if (match[1] === 'image/png') {
      const dimensions = inspectPngDimensions(bytes);
      if (dimensions && dimensions.width * dimensions.height > (options.maxPixels ?? DEFAULT_MAX_PIXELS)) {
        return { ok: false as const, error: 'IMAGE_DIMENSIONS_TOO_LARGE' };
      }
    }
    const result = await decodeInWorker(match[1], bytes, options.timeoutMs ?? DEFAULT_DECODE_TIMEOUT_MS);
    if (!result.ok) return result;
    return validateImagePixels({ min: result.min ?? 0, max: result.max ?? 0 });
  } catch {
    return { ok: false as const, error: 'IMAGE_INVALID_DATA' };
  }
}

export async function validateImageDataUrls(dataUrls: string[], options: { maxBytes?: number; maxPixels?: number; timeoutMs?: number } = {}) {
  const checks = [];
  for (const dataUrl of dataUrls) {
    checks.push(await validateImageDataUrl(dataUrl, options));
  }
  return checks;
}
