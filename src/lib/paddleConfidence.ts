export interface PaddleTextRegion {
  text: string;
  transcriptionConfidence?: number;
  layoutScore?: number;
}

export function markLowConfidenceRegions(regions: PaddleTextRegion[], threshold = 0.8) {
  const lowConfidenceRegions = regions.filter((region) => typeof region.transcriptionConfidence === 'number' && region.transcriptionConfidence < threshold);
  const lowConfidenceSet = new Set(lowConfidenceRegions);
  const text = regions.map((region) => `${lowConfidenceSet.has(region) ? '[不確定]' : ''}${region.text}`).join('');
  return { text, lowConfidenceRegions, needsManualReview: lowConfidenceRegions.length > 0 };
}
