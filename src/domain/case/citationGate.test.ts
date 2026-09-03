import { describe, expect, it } from 'vitest';
import { findUnreadRetrievedCitations } from './citationGate';

const citation = (status?: 'RETRIEVED_UNREAD' | 'FULLTEXT_READ' | 'HUMAN_CONFIRMED') => ({
  id: 'j1', type: '裁判', citation: '最高法院112年度台上字第9號', summary: '', applicationReason: '', selected: true,
  sourceProvider: 'tw-legal-rag' as const, sourceStatus: status, sourceId: 'j1'
});

describe('citationGate', () => {
  it('fails closed for non-arrays and malformed entries', () => {
    expect(findUnreadRetrievedCitations(undefined)).toEqual([]);
    expect(findUnreadRetrievedCitations([null, 'bad', {}])).toEqual([]);
  });

  it('only blocks unread retrieved sources', () => {
    expect(findUnreadRetrievedCitations([citation(), citation('FULLTEXT_READ'), citation('HUMAN_CONFIRMED')])).toHaveLength(1);
    expect(findUnreadRetrievedCitations([{ ...citation(), sourceProvider: 'manual' as const }])).toEqual([]);
  });
});
