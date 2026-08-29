export interface PaddleTextRegion {
  text: string;
  confidence?: number;
}

export function markLowConfidenceRegions(regions: PaddleTextRegion[], threshold = 0.8) {
  const lowConfidenceRegions = regions.filter((region) => typeof region.confidence === 'number' && region.confidence < threshold);
  const lowConfidenceSet = new Set(lowConfidenceRegions);
  const text = regions.map((region) => `${lowConfidenceSet.has(region) ? '[不確定]' : ''}${region.text}`).join('');
  return { text, lowConfidenceRegions, needsManualReview: lowConfidenceRegions.length > 0 };
}
