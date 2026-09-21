import type { ElementAssessment, LegalClaim, LegalFitResult } from './types';

export function evaluateElementFit(
  claim: LegalClaim,
  assessments: ElementAssessment[],
  subjectMismatch = false
): LegalFitResult {
  if (subjectMismatch) {
    return { claimId: claim.id, status: 'SUBJECT_MISMATCH', assessments, missingEvidence: [], reason: '主張人並非目前已確認的適格主體。' };
  }
  const missingEvidence = claim.evidenceRequirements.filter(required =>
    !assessments.some(item => item.supportingEvidence?.some(evidence => evidence.includes(required)))
  );
  const hasFailure = assessments.some(item => item.status === '不符合');
  const hasGap = assessments.some(item => item.status === '證據不足') || missingEvidence.length > 0;
  const status = hasFailure ? 'NOT_ESTABLISHED' : hasGap ? 'INSUFFICIENT_EVIDENCE' : 'ESTABLISHED';
  return { claimId: claim.id, status, assessments, missingEvidence };
}
