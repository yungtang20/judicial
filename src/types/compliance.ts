export type RequirementLevel = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';

export interface Party {
  id: string;
  role: string;
  name: string;
  address?: string;
  identifiers?: Record<string, string>;
  addressProtection?: {
    requested?: boolean;
    actualAddressStorage?: string;
  };
  relationship?: string;
  [key: string]: any;
}

export interface CaseFact {
  id: string;
  content: string;
  sourceLevel?: string;
  evidenceIds?: string[];
}

export interface CaseClaim {
  id: string;
  statement: string;
  factIds: string[];
  evidenceIds?: string[];
}

export interface CaseEvidence {
  id: string;
  content: string;
}

export interface CaseInput {
  id: string;
  caseType: string;
  pleadingType: string;
  styleProfile?: string;
  parties: Party[];
  representatives?: Party[];
  facts: CaseFact[];
  claims: CaseClaim[];
  evidence: CaseEvidence[];
  attachments: CaseEvidence[];
  proceeding: string;
  court: string;
  documentDate: string;
  signature: string;
  sectionInputs?: Record<string, { content: string; [key: string]: any }>;
  [key: string]: any;
}

export interface ContentRule {
  id: string;
  basis?: string;
  level: RequirementLevel;
  appliesTo: string[];
  pleadingTypes?: string[];
  sourceReference?: string;
  sourceReferences?: string[];
  targetSection: string;
  description: string;
  validatorId?: string;
  requirementLevel?: RequirementLevel;
  legalBasis?: string[];
}

export interface PleadingRuleProfile {
  id: string;
  version: string;
  caseType: string;
  supportedPleadingTypes: string[];
  formatProfileId?: string;
  sourceAuthority?: string;
  sourceReference?: string;
  effectiveDate?: string;
  verificationStatus: string;
  rules: ContentRule[];
}

export interface PleadingStructureSection {
  id: string;
  title: string;
  required: boolean;
}

export interface PleadingStructure {
  id: string;
  name: string;
  sections: PleadingStructureSection[];
}

export interface DraftSection {
  id: string;
  title: string;
  content: string;
  sourceClaimIds?: string[];
  sourceFactIds?: string[];
  sourceEvidenceIds?: string[];
}

export interface MissingInput {
  field: string;
  sectionId?: string;
  description?: string;
}

export interface StructuredPleadingDraft {
  id: string;
  caseInputId: string;
  ruleProfileId: string;
  ruleProfileVersion: string;
  structureVersion?: string;
  sections: DraftSection[];
  claimsUsed: string[];
  claimsUnused: string[];
  factsUsed: string[];
  factsUnused: string[];
  evidenceUsed: string[];
  evidenceUnused: string[];
  missingInputs: MissingInput[];
  generatedAt?: string;
}

export interface ComplianceFinding {
  ruleId: string;
  status: 'COMPLIANT' | 'WARNING' | 'CONFLICT' | 'NOT_APPLICABLE' | 'MISSING' | 'UNVERIFIED';
  evidenceLocation?: string;
  note?: string;
  basis?: string[];
}

export interface LegalReference {
  sourceReference: string;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'REJECTED';
  contentHash: string;
}
