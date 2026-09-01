import { PrecedentItem } from '../../types';

export function findUnreadRetrievedCitations(citations: unknown): PrecedentItem[] {
  if (!Array.isArray(citations)) return [];
  return citations.filter((item): item is PrecedentItem => {
    if (!item || typeof item !== 'object') return false;
    const citation = item as PrecedentItem;
    return citation.sourceProvider === 'tw-legal-rag' && !['FULLTEXT_READ', 'HUMAN_CONFIRMED'].includes(citation.sourceStatus || '');
  });
}
