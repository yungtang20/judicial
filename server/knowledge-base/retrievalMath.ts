export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function tokenizeLegalText(text: string): string[] {
  if (!text) return [];
  const clean = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').trim();
  const words = clean.split(/\s+/).filter(word => word.length >= 2);
  const tokenSet = new Set<string>(words);

  for (const word of words) {
    if (/[\u4e00-\u9fa5]/.test(word)) {
      for (let i = 0; i < word.length - 1; i++) {
        tokenSet.add(word.slice(i, i + 2));
      }
    }
  }
  return Array.from(tokenSet);
}

export function extractRelevantExcerpt(
  fullText: string,
  query: string,
  maxLength: number,
  contextPadding: number
): string {
  if (!fullText) return '';
  if (fullText.length <= maxLength) return fullText;

  const tokens = tokenizeLegalText(query);
  let bestPos = -1;
  for (const token of tokens) {
    const pos = fullText.indexOf(token);
    if (pos !== -1) {
      bestPos = pos;
      break;
    }
  }

  if (bestPos === -1) return fullText.slice(0, maxLength) + '…';

  const start = Math.max(0, bestPos - contextPadding);
  const end = Math.min(fullText.length, start + maxLength);
  const excerpt = fullText.slice(start, end);
  return (start > 0 ? '…' : '') + excerpt + (end < fullText.length ? '…' : '');
}
