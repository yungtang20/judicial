export interface OcrQuality {
  needsManualReview: boolean;
  untrustedFields: string[];
}

export function validateImagePixels(pixels: ArrayLike<number> | { min: number; max: number }) {
  if ('min' in pixels && 'max' in pixels) {
    return pixels.max - pixels.min <= 1
      ? { ok: false as const, error: 'IMAGE_BLANK_OR_SOLID' }
      : { ok: true as const };
  }
  if (!pixels.length) return { ok: false, error: 'IMAGE_BLANK_OR_SOLID' } as const;
  let min = 255;
  let max = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const value = pixels[i];
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return max - min <= 1
    ? ({ ok: false, error: 'IMAGE_BLANK_OR_SOLID' } as const)
    : ({ ok: true } as const);
}

export function assessOcrText(text: string): OcrQuality {
  const markers = text.match(/\[不確定\]/g) || [];
  const markerChars = markers.length * '[不確定]'.length;
  const markerRatio = text.length ? markerChars / text.length : 0;
  const fieldPattern = /(身分證(?:號|字號)|統一編號|電話|地址|姓名)[^\n]{0,40}(?:\[不確定\])/g;
  const untrustedFields = [...text.matchAll(fieldPattern)].map((match) => match[1]);
  return {
    needsManualReview: markers.length > 0 && (markerRatio >= 0.1 || untrustedFields.length > 0),
    untrustedFields: [...new Set(untrustedFields)]
  };
}
