import { CitationVerificationResult } from '../types';
import { verifyLegalCitations } from './citationVerifier';

export type LegalInputMode = 'generation' | 'analysis';
type LegalInputPrecheckStatus = 'pass' | 'needs_review' | 'reject';

interface LegalInputPrecheckIssue {
  code: 'INVALID_REQUEST' | 'MALFORMED_CITATION' | 'UNVERIFIED_CITATION';
  message: string;
  citation?: string;
}

export interface LegalInputPrecheckResult {
  status: LegalInputPrecheckStatus;
  checkerKind: 'heuristic';
  explicitCitations: CitationVerificationResult[];
  issues: LegalInputPrecheckIssue[];
}

/**
 * Validate request text and explicitly supplied citations before generation.
 * This is a local heuristic pre-check, not an official government verification.
 */
export function precheckLegalInput(input: unknown, mode: LegalInputMode = 'analysis'): LegalInputPrecheckResult {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return {
      status: 'reject',
      checkerKind: 'heuristic',
      explicitCitations: [],
      issues: [{ code: 'INVALID_REQUEST', message: '法律輸入內容不得為空。' }]
    };
  }

  const verification = verifyLegalCitations(input);
  const issues: LegalInputPrecheckIssue[] = verification.results
    .filter(citation => !citation.verified)
    .map(citation => ({
      code: citation.isGhostOrFake ? 'MALFORMED_CITATION' : 'UNVERIFIED_CITATION',
      message: citation.isGhostOrFake
        ? '引用格式或案號被本機規則判定為高度可疑。'
        : '引用未收錄於本機索引，無法由 heuristic 確認。',
      citation: citation.citationText
    }));

  const hasMalformed = verification.results.some(citation => citation.isGhostOrFake);
  const hasUnverified = verification.results.some(citation => !citation.verified);
  const status: LegalInputPrecheckStatus = hasMalformed || (mode === 'generation' && hasUnverified)
    ? 'reject'
    : hasUnverified
      ? 'needs_review'
      : 'pass';

  return { status, checkerKind: 'heuristic', explicitCitations: verification.results, issues };
}
