export type LegalFitStatus = 'ESTABLISHED' | 'INSUFFICIENT_EVIDENCE' | 'NOT_ESTABLISHED' | 'SUBJECT_MISMATCH';

export interface CaseParty {
  id: string;
  role: string;
  name?: string;
}

export interface CaseFacts {
  narrative: string;
  evidence?: string[];
  claimantPartyId?: string;
  isDebtorSelf?: boolean;
}

export interface LegalClaim {
  id: string;
  legalBasis: string;
  citationId?: string;
  standingRequirement: string;
  positiveElements: string[];
  evidenceRequirements: string[];
}

export interface StandingFinding {
  claimId: string;
  claimantPartyId?: string;
  eligiblePartyRoles: string[];
  status: Extract<LegalFitStatus, 'SUBJECT_MISMATCH' | 'ESTABLISHED'>;
  reason: string;
}

export interface ElementAssessment {
  element: string;
  status: '符合' | '不符合' | '證據不足';
  supportingEvidence?: string[];
}

export interface LegalFitResult {
  claimId: string;
  status: LegalFitStatus;
  assessments: ElementAssessment[];
  missingEvidence: string[];
  reason?: string;
}

export interface DocumentBundle {
  domainId: string;
  summary: string;
  recommendedDocumentIds: string[];
  legalClaims: LegalClaim[];
  standing: StandingFinding[];
  fit: LegalFitResult[];
  warnings: string[];
}
