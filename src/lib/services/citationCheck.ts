/**
 * Unified Citation Verification Service
 *
 * Merges: citationVerifier (local verification) + externalCitationVerifier (dr-lawbot cross-check)
 * Provides a single entry point for all citation validation workflows.
 */

import type { CitationVerificationResult } from '../../types';
import {
  type VerifyCitationsOptions,
  verifyLegalCitations as _verifyLegalCitations,
  VERIFIED_REAL_STATUTES,
  VERIFIED_REAL_PRECEDENTS,
} from '../citationVerifier';
import {
  type ExternalCitationStatus,
  type ExternalCitationResult,
  parsePrecedentCitation as _parsePrecedentCitation,
  verifyExternalPrecedent as _verifyExternalPrecedent,
  verifyExternalPrecedents as _verifyExternalPrecedents,
} from '../externalCitationVerifier';

// ── Re-export low-level helpers ───────────────────────────────────────────────
export {
  type VerifyCitationsOptions,
  type ExternalCitationStatus,
  type ExternalCitationResult,
  VERIFIED_REAL_STATUTES,
  VERIFIED_REAL_PRECEDENTS,
  _verifyLegalCitations as verifyLegalCitations,
  _verifyLegalCitations as verifyLegalCitationsLocally,
  _parsePrecedentCitation as parsePrecedentCitation,
  _verifyExternalPrecedent as verifyExternalPrecedent,
  _verifyExternalPrecedents as verifyExternalPrecedents,
};

// ── Unified high-level APIs ───────────────────────────────────────────────────

/**
 * Verify citations using the local verifier only (fast, no network).
 * Returns { totalChecked, ghostCount, results, sanitizedText }.
 */
export function verifyCitationsLocally(
  text: string,
  options?: VerifyCitationsOptions
) {
  return _verifyLegalCitations(text, options);
}

/**
 * Verify citations using the external dr-lawbot API (slower, network required).
 * Extracts precedent citations from text and batch-verifies them.
 */
export async function verifyCitationsExternally(
  text: string,
  fetchImpl?: typeof fetch
): Promise<ExternalCitationResult[]> {
  const citationPattern = /(\d+)\s*年度\s*([^\d\s]+?)\s*字第?\s*(\d+)\s*號/g;
  const citations: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = citationPattern.exec(text)) !== null) {
    citations.push(match[0]);
  }
  return _verifyExternalPrecedents(citations, fetchImpl);
}

/**
 * Full citation verification pipeline:
 * 1. Local verification (fast, offline)
 * 2. External cross-check for unverified precedents (slower, online)
 * 3. Merged results with overall summary
 */
export async function verifyCitationsFull(
  text: string,
  options?: {
    localOnly?: boolean;
    skipExternal?: boolean;
    fetchImpl?: typeof fetch;
  }
) {
  const localResult = _verifyLegalCitations(text);
  const localPassed = localResult.results.filter((r) => r.verified).length;
  const localFailed = localResult.ghostCount;

  let externalResults: ExternalCitationResult[] = [];
  if (!options?.skipExternal && !options?.localOnly) {
    externalResults = await verifyCitationsExternally(text, options?.fetchImpl);
  }

  const externalVerified = externalResults.filter(
    (r) => r.status === 'verified'
  ).length;
  const externalFailed = externalResults.filter(
    (r) => r.status === 'not_found' || r.status === 'unknown'
  ).length;

  const totalChecked = localResult.totalChecked + externalResults.length;
  const overallSafe = localFailed === 0 && externalFailed === 0;

  return {
    localResult,
    externalResults,
    summary: {
      totalChecked,
      localPassed,
      localFailed,
      externalVerified,
      externalFailed,
      overallSafe,
    },
  };
}
