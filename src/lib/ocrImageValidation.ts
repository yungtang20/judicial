import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import { validateImagePixels } from './ocrQuality.js';

const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;

export async function validateImageDataUrl(dataUrl: string, options: { maxBytes?: number } = {}) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { ok: false as const, error: 'IMAGE_INVALID_DATA_URL' };
  try {
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.byteLength > (options.maxBytes ?? DEFAULT_MAX_BYTES)) {
      return { ok: false as const, error: 'IMAGE_DECODE_TIMEOUT' };
    }
    const pixels = match[1] === 'image/png'
      ? PNG.sync.read(bytes).data
      : match[1] === 'image/jpeg'
        ? jpeg.decode(bytes, { useTArray: true }).data
        : null;
    if (!pixels) return { ok: false as const, error: 'IMAGE_UNSUPPORTED_FORMAT' };
    return validateImagePixels(pixels);
  } catch {
    return { ok: false as const, error: 'IMAGE_INVALID_DATA' };
  }
}

export async function validateImageDataUrls(dataUrls: string[], options: { maxBytes?: number } = {}) {
  const checks = [];
  for (const dataUrl of dataUrls) {
    checks.push(await validateImageDataUrl(dataUrl, options));
  }
  return checks;
}
