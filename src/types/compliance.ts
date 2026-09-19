export type RequirementLevel =
  | 'REQUIRED'
  | 'RECOMMENDED'
  | 'UNVERIFIED'
  | 'RECOMMENDED_CANDIDATE';

export type ComplianceStatus =
  | 'COMPLIANT'
  | 'WARNING'
  | 'MISSING'
  | 'CONFLICT'
  | 'UNVERIFIED'
  | 'NOT_APPLICABLE';

export type CaseType =
  | 'civil'
  | 'civil_enforcement'
  | 'criminal'
  | 'administrative_litigation'
  | 'juvenile'
  | 'family'
  | 'non_contentious';

export type PleadingType =
  | 'complaint'
  | 'answer'
  | 'preparatory'
  | 'supplement'
  | 'motion'
  | 'report'
  | 'withdrawal'
  | 'appeal'
  | 'interlocutory_appeal'
  | 'retrial';

export type StyleProfile =
  | 'simple_procedural'
  | 'formal_motion'
  | 'civil_complaint'
  | 'litigation_brief'
  | 'appeal_brief'
  | 'family_protective'
  | 'criminal_complaint';

export type FactSourceLevel =
  | 'EVIDENCE_BACKED'
  | 'USER_PROVIDED_FACT'
  | 'DERIVED_FROM_VERIFIED_FACT'
  | 'UNVERIFIED';

export interface ContentRule {
  id: string;
  basis: string;
  description: string;
  level: RequirementLevel;
  appliesTo: CaseType[];
  pleadingTypes?: PleadingType[];
  targetSection?: string;
  sourceReferences?: string[];
  validatorId?: string;
}

export interface LegacyComplianceRule {
  id: string;
  description: string;
  targetSection?: string;
  validatorId?: string;
  requirementLevel: RequirementLevel;
  legalBasis: string[];
}

/** Temporary alias used only by the blocked P4 generator boundary. */
export type ComplianceRule = LegacyComplianceRule;

export interface FormatProfile {
  caseType: CaseType;
  formatRuleSource: string;
  formatConfirmed: boolean;
  paperSize: 'A4';
  writingDirection: 'vertical_horizontal_ltr';
  marginsCm?: { top: number; bottom: number; left: number; right: number } | null;
  fontSizePt?: { min: number; max: number } | null;
  lineSpacingPt?: { mode: 'single_or_fixed'; min: number; max: number } | null;
  pageNumbering: boolean;
  tocThresholdPages?: number | null;
  doubleSidedPrint: boolean;
}

export interface ComplianceFinding {
  ruleId: string;
  status: ComplianceStatus;
  evidenceLocation?: string;
  note?: string;
}

export type ReviewCategory =
  | 'STRUCTURAL'
  | 'LEGAL_CONTENT'
  | 'CITATION'
  | 'FACT_CONSISTENCY'
  | 'EVIDENCE_MAPPING'
  | 'FORMAT';

export interface ReviewFinding extends ComplianceFinding {
  id: string;
  category: ReviewCategory;
  objectiveBasis: string[];
  source: 'REVIEWER' | 'COMPLIANCE_ENGINE' | 'CITATION_VERIFIER' | 'FORMAT_VERIFIER';
}

export interface ReviewerObjectiveCheck {
  id: string;
  category: ReviewCategory;
  description: string;
}

export interface PleadingReviewReport {
  draftId: string;
  draftFingerprint: string;
  caseInputId: string;
  caseInputFingerprint: string;
  ruleProfileId: string;
  ruleProfileVersion: string;
  ruleProfileFingerprint: string;
  reviewerVersion: string;
  objectiveChecks: ReviewerObjectiveCheck[];
  findings: ReviewFinding[];
}

export type PleadingRevisionRequest =
  | {
      findingId: string;
      operation: 'RESTORE_SECTION_FROM_APPROVED_INPUT';
      targetSectionId: string;
    }
  | {
      findingId: string;
      operation: 'RESTORE_SECTION_STRUCTURE_FROM_APPROVED_PROFILE';
      targetSectionId: string;
    }
  | {
      findingId: string;
      operation: 'REBUILD_NEGATIVE_PROOF';
      scope: 'SOURCE_USAGE' | 'OMITTED_SECTIONS';
    };

export interface PleadingRevisionRecord {
  findingId: string;
  operation: PleadingRevisionRequest['operation'];
  fromDraftId: string;
  toDraftId: string;
  targetSectionId?: string;
  negativeProofScope?: 'SOURCE_USAGE' | 'OMITTED_SECTIONS';
  changedPaths: string[];
  sourceCaseInputId: string;
  sourceRuleProfileId: string;
  sourceRuleProfileVersion: string;
  requiresIndependentReview: true;
}

export interface PleadingRevisionResult {
  draft: StructuredPleadingDraft;
  record: PleadingRevisionRecord;
}

export type IndependentReReviewCheckId =
  | 'P8.ORIGINAL_FINDING'
  | 'P8.NO_NEW_FINDINGS'
  | 'P8.NO_FABRICATION'
  | 'P8.OTHER_RULES_PRESERVED';

export interface IndependentReReviewCheck {
  id: IndependentReReviewCheckId;
  status: ComplianceStatus;
  objectiveBasis: string[];
  note: string;
}

export interface IndependentReReviewReport {
  originalDraftId: string;
  revisedDraftId: string;
  revisionFindingId: string;
  reReviewerVersion: string;
  checks: IndependentReReviewCheck[];
  revisedReviewReport: PleadingReviewReport;
  allChecksPassed: boolean;
}

export interface LegalReference {
  sourceReference: string;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'NOT_APPROVED';
  contentHash?: string;
}

export interface AddressProtection {
  requested: boolean;
  reason?: string;
  serviceAddress?: string;
  actualAddressStorage: 'protected' | 'public';
  publicDocumentAddress: string | null;
}

export interface Party {
  id: string;
  role: string;
  name: string;
  address?: string;
  representativeIds?: string[];
  representedPartyId?: string;
  relationshipToParty?: string;
  addressProtection?: AddressProtection;
  identifiers?: Record<string, string>;
}

export interface Fact {
  id: string;
  content: string;
  sourceLevel: FactSourceLevel;
  evidenceIds?: string[];
}

export interface Evidence {
  id: string;
  content: string;
  sourceReference?: string;
}

export interface Claim {
  id: string;
  statement: string;
  factIds: string[];
  evidenceIds?: string[];
}

export interface CaseInput {
  id: string;
  caseType: CaseType;
  pleadingType: PleadingType;
  styleProfile: StyleProfile;
  parties: Party[];
  facts: Fact[];
  claims: Claim[];
  evidence: Evidence[];
  attachments: Evidence[];
  court?: string;
  caseNumber?: string;
  proceeding?: string;
  signature?: string;
  documentDate?: string;
  expectedRuleProfileVersion?: string;
  legalReferencesUsed?: string[];
}

export interface PleadingRuleProfile {
  id: string;
  version: string;
  caseType: CaseType;
  pleadingType?: PleadingType;
  supportedPleadingTypes?: PleadingType[];
  formatProfileId?: CaseType;
  sourceAuthority: string;
  sourceReference: string;
  effectiveDate?: string;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'NOT_APPROVED';
  rules: ContentRule[];
}

/** Temporary profile contract used only by the blocked P4 generator boundary. */
export interface CivilPleadingRuleProfile {
  id: string;
  version: string;
  caseType: string;
  pleadingType?: string;
  supportedPleadingTypes?: PleadingType[];
  formatProfileId?: CaseType;
  sourceAuthority: string;
  sourceReference: string;
  effectiveDate?: string;
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'NOT_APPROVED';
  rules: LegacyComplianceRule[];
}

export interface StructuredPleadingDraft {
  id: string;
  caseType: CaseType;
  pleadingType: PleadingType;
  styleProfile: StyleProfile;
  structure: PleadingStructure;
  ruleProfileVersion: string;
  sections: DraftSection[];
  claimsUsed: string[];
  claimsUnused: string[];
  factsUsed: string[];
  factsUnused: string[];
  evidenceUsed: string[];
  evidenceUnused: string[];
  omittedSectionIds: string[];
  legalReferencesUsed: string[];
  missingInputs?: MissingInput[];
  generationMetadata?: Record<string, unknown>;
}

export interface DraftSection {
  id: string;
  sectionType: string;
  title?: string;
  content: string;
  ruleIds: string[];
  requirementLevels: RequirementLevel[];
  sourceClaimIds?: string[];
  sourceFactIds?: string[];
  sourceEvidenceIds?: string[];
  generated?: boolean;
}

export interface SectionDefinition {
  id: string;
  sectionType: string;
  title?: string;
  ruleIds: string[];
  requirementLevels: RequirementLevel[];
}

export interface PleadingStructure {
  id: string;
  pleadingType: PleadingType;
  sections: SectionDefinition[];
}

export interface MissingInput {
  field: string;
  reason: string;
  severity: 'BLOCKING' | 'HIGH' | 'MEDIUM' | 'LOW';
  requiredFor: string[];
  sourceRequirement?: string;
  category?: 'MINIMUM_GENERATION' | 'LEGAL_COMPLETENESS' | 'TRACEABILITY' | 'PROFILE';
}

export interface HumanOverride {
  reviewerId: string;
  reviewerRole: string;
  reason: string;
  approvedAt: string;
  overriddenFindings: Array<{ id: string; fingerprint: string }>;
  scope: { gateInputFingerprint: string };
}

export type FinalGateStatus = 'READY' | 'BLOCKED' | 'BLOCKED_WITH_HUMAN_OVERRIDE';

export type FinalGateBlockerSource = 'P5' | 'P6' | 'P8' | 'INPUT' | 'AUDIT' | 'INTEGRITY' | 'EDIT';

export interface FinalGateBlocker {
  id: string;
  fingerprint: string;
  source: FinalGateBlockerSource;
  status: 'MISSING' | 'CONFLICT' | 'UNVERIFIED' | 'UNKNOWN';
  message: string;
  overrideEligible: boolean;
}

export interface FinalDeliveryAuditItem {
  id: `Q${string}`;
  question: string;
  status: 'ANSWERED' | 'UNKNOWN';
  answer?: unknown;
  evidence: string[];
}

export interface HumanEditRecord {
  occurred: boolean;
  kind: 'NONE' | 'SUBSTANTIVE' | 'FORMAT_ONLY';
  fields: string[];
  reviewedDraftFingerprint?: string;
  artifactFingerprint?: string;
}

export interface FinalGateReport {
  status: FinalGateStatus;
  evaluatorVersion: string;
  gateInputFingerprint: string;
  blockers: FinalGateBlocker[];
  auditItems: FinalDeliveryAuditItem[];
  complianceFindings: ComplianceFinding[];
  reviewerReport: PleadingReviewReport;
  independentReReviewReport: IndependentReReviewReport;
  override?: HumanOverride;
  exportPolicy: 'READY_ONLY' | 'HUMAN_DEPLOY_REQUIRED_FOR_OVERRIDE' | 'NOT_EXPORTABLE';
}

export interface DocumentVersionSnapshot {
  id: string;
  documentId: string;
  version: string;
  contentHash: string;
  ruleProfileVersion: string;
  createdAt: string;
  draft: StructuredPleadingDraft;
}
