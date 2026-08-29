import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import { validateImagePixels } from './ocrQuality.js';

export async function validateImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { ok: false as const, error: 'IMAGE_INVALID_DATA_URL' };
  try {
    const bytes = Buffer.from(match[2], 'base64');
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
