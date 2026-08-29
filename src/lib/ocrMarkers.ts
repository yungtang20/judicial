export interface OcrTextSegment {
  text: string;
  uncertain: boolean;
}

export function splitOcrUncertainty(text: string): OcrTextSegment[] {
  return text.split(/(\[不確定\])/g).filter(Boolean).map((segment) => ({
    text: segment,
    uncertain: segment === '[不確定]'
  }));
}
