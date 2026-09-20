import type {
  CaseInput,
  DraftSection,
  PleadingReviewReport,
  PleadingRevisionRequest,
  PleadingRevisionResult,
  PleadingRuleProfile,
  ReviewCategory,
  ReviewFinding,
  SectionDefinition,
  StructuredPleadingDraft
} from '../../types/compliance';
import { buildStructuredPleadingDraft } from '../generator/civilPleadingGenerator';
import { fingerprintReviewPayload, PLEADING_REVIEWER_VERSION } from '../reviewer/pleadingReviewer';

export interface PleadingRevisionInput {
  draft: StructuredPleadingDraft;
  caseInput: CaseInput;
  ruleProfile: PleadingRuleProfile;
  reviewReport: PleadingReviewReport;
  request: PleadingRevisionRequest;
}

const ALLOWED_CATEGORIES: Readonly<Record<PleadingRevisionRequest['operation'], ReviewCategory[]>> = {
  RESTORE_SECTION_FROM_APPROVED_INPUT: ['LEGAL_CONTENT', 'FACT_CONSISTENCY'],
  RESTORE_SECTION_STRUCTURE_FROM_APPROVED_PROFILE: ['STRUCTURAL'],
  REBUILD_NEGATIVE_PROOF: ['STRUCTURAL', 'FACT_CONSISTENCY']
};

async function assertBound(input: PleadingRevisionInput): Promise<void> {
  const { draft, caseInput, ruleProfile, reviewReport } = input;
  if (
    reviewReport.draftId !== draft.id ||
    reviewReport.caseInputId !== caseInput.id ||
    reviewReport.ruleProfileId !== ruleProfile.id ||
    reviewReport.ruleProfileVersion !== ruleProfile.version ||
    reviewReport.reviewerVersion !== PLEADING_REVIEWER_VERSION ||
    reviewReport.draftFingerprint !== await fingerprintReviewPayload(draft) ||
    reviewReport.caseInputFingerprint !== await fingerprintReviewPayload(caseInput) ||
    reviewReport.ruleProfileFingerprint !== await fingerprintReviewPayload(ruleProfile)
  ) {
    throw new Error('Revision input does not match the reviewed payload snapshots.');
  }
  const ruleIds = ruleProfile.rules.map(rule => rule.id);
  if (
    ruleProfile.verificationStatus !== 'VERIFIED' ||
    ruleProfile.caseType !== caseInput.caseType ||
    (ruleProfile.pleadingType && ruleProfile.pleadingType !== caseInput.pleadingType) ||
    (ruleProfile.supportedPleadingTypes && !ruleProfile.supportedPleadingTypes.includes(caseInput.pleadingType)) ||
    new Set(ruleIds).size !== ruleIds.length
  ) {
    throw new Error('Revision requires one applicable, verified Rule Profile with unique Rule IDs.');
  }
}

function selectedFinding(report: PleadingReviewReport, findingId: string): ReviewFinding {
  const matches = report.findings.filter(finding => finding.id === findingId);
  if (matches.length !== 1) throw new Error('Revision requires one unique Finding ID.');
  const finding = matches[0];
  if (finding.status !== 'MISSING' && finding.status !== 'CONFLICT') {
    throw new Error(`Finding ${findingId} is not a confirmed revisable problem.`);
  }
  return finding;
}

function assertAllowed(finding: ReviewFinding, request: PleadingRevisionRequest): void {
  const sourceAllowed =
    (finding.category === 'LEGAL_CONTENT' && finding.source === 'COMPLIANCE_ENGINE') ||
    (finding.category === 'FACT_CONSISTENCY' && finding.source === 'REVIEWER') ||
    (finding.category === 'STRUCTURAL' && finding.source === 'REVIEWER');
  if (!sourceAllowed || !ALLOWED_CATEGORIES[request.operation]?.includes(finding.category)) {
    throw new Error(`Operation ${request.operation} is not allowed for ${finding.category} from ${finding.source}.`);
  }
  if (
    request.operation === 'REBUILD_NEGATIVE_PROOF' &&
    ((request.scope === 'SOURCE_USAGE' && finding.category !== 'FACT_CONSISTENCY') ||
      (request.scope === 'OMITTED_SECTIONS' && finding.category !== 'STRUCTURAL'))
  ) {
    throw new Error(`Negative-proof scope ${request.scope} is not allowed for ${finding.category}.`);
  }
}

function oneById<T extends { id: string }>(items: T[], id: string, label: string): T | undefined {
  const matches = items.filter(item => item.id === id);
  if (matches.length > 1) throw new Error(`${label} contains duplicate section ${id}.`);
  return matches[0];
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function restoreSectionContent(
  draft: StructuredPleadingDraft,
  canonical: StructuredPleadingDraft,
  targetSectionId: string,
  finding: ReviewFinding
): string[] {
  const current = oneById(draft.sections, targetSectionId, 'Draft');
  const source = oneById(canonical.sections, targetSectionId, 'Approved draft');
  if (!current || !source) throw new Error(`Section ${targetSectionId} must exist uniquely in both drafts.`);
  if (finding.category === 'LEGAL_CONTENT') {
    const rules = source.ruleIds.filter(ruleId => ruleId === finding.ruleId);
    if (rules.length !== 1) throw new Error(`Finding ${finding.id} does not uniquely govern section ${targetSectionId}.`);
  }
  const changed: string[] = [];
  for (const key of ['content', 'sourceClaimIds', 'sourceFactIds', 'sourceEvidenceIds'] as const) {
    if (!sameValue(current[key], source[key])) {
      current[key] = structuredClone(source[key]) as never;
      changed.push(`sections.${targetSectionId}.${key}`);
    }
  }
  if (!changed.length) throw new Error('Requested section has no scoped change.');
  return changed;
}

function restoreSectionStructure(
  draft: StructuredPleadingDraft,
  canonical: StructuredPleadingDraft,
  targetSectionId: string
): string[] {
  const currentSection = oneById(draft.sections, targetSectionId, 'Draft');
  const sourceSection = oneById(canonical.sections, targetSectionId, 'Approved draft');
  const currentDefinition = oneById(draft.structure.sections, targetSectionId, 'Draft structure');
  const sourceDefinition = oneById(canonical.structure.sections, targetSectionId, 'Approved structure');
  if (!currentSection || !sourceSection || !currentDefinition || !sourceDefinition) {
    throw new Error(`Section ${targetSectionId} must exist uniquely in both draft structures.`);
  }
  const changed: string[] = [];
  const copy = <T extends DraftSection | SectionDefinition>(
    current: T,
    source: T,
    prefix: string
  ) => {
    for (const key of ['sectionType', 'title', 'ruleIds', 'requirementLevels'] as const) {
      if (!sameValue(current[key], source[key])) {
        current[key] = structuredClone(source[key]) as never;
        changed.push(`${prefix}.${key}`);
      }
    }
  };
  copy(currentDefinition, sourceDefinition, `structure.sections.${targetSectionId}`);
  copy(currentSection, sourceSection, `sections.${targetSectionId}`);
  if (!changed.length) throw new Error('Requested section structure has no scoped change.');
  return changed;
}

function rebuildProof(
  draft: StructuredPleadingDraft,
  canonical: StructuredPleadingDraft,
  fields: Array<'claimsUsed' | 'claimsUnused' | 'factsUsed' | 'factsUnused' | 'evidenceUsed' | 'evidenceUnused' | 'omittedSectionIds'>
): string[] {
  const changed: string[] = [];
  for (const field of fields) {
    if (!sameValue(draft[field], canonical[field])) {
      draft[field] = [...canonical[field]];
      changed.push(field);
    }
  }
  if (!changed.length) throw new Error('Requested proof has no scoped change.');
  return changed;
}

export async function applyPleadingRevision(input: PleadingRevisionInput): Promise<PleadingRevisionResult> {
  await assertBound(input);
  const finding = selectedFinding(input.reviewReport, input.request.findingId);
  assertAllowed(finding, input.request);

  const canonical = buildStructuredPleadingDraft(input.caseInput, input.ruleProfile);
  if (canonical.missingInputs?.some(item => item.severity === 'BLOCKING')) {
    throw new Error('Canonical revision source contains blocking input, traceability, or profile findings.');
  }
  const draft = structuredClone(input.draft);
  let changedPaths: string[];

  switch (input.request.operation) {
    case 'RESTORE_SECTION_FROM_APPROVED_INPUT':
      changedPaths = restoreSectionContent(draft, canonical, input.request.targetSectionId, finding);
      break;
    case 'RESTORE_SECTION_STRUCTURE_FROM_APPROVED_PROFILE':
      changedPaths = restoreSectionStructure(draft, canonical, input.request.targetSectionId);
      break;
    case 'REBUILD_NEGATIVE_PROOF':
      changedPaths = rebuildProof(
        draft,
        canonical,
        input.request.scope === 'SOURCE_USAGE'
          ? ['claimsUsed', 'claimsUnused', 'factsUsed', 'factsUnused', 'evidenceUsed', 'evidenceUnused']
          : ['omittedSectionIds']
      );
      break;
  }

  const fromDraftId = draft.id;
  draft.id = crypto.randomUUID();
  changedPaths.push('id');
  return {
    draft,
    record: {
      findingId: finding.id,
      operation: input.request.operation,
      fromDraftId,
      toDraftId: draft.id,
      ...('targetSectionId' in input.request ? { targetSectionId: input.request.targetSectionId } : {}),
      ...(input.request.operation === 'REBUILD_NEGATIVE_PROOF'
        ? { negativeProofScope: input.request.scope }
        : {}),
      changedPaths,
      sourceCaseInputId: input.caseInput.id,
      sourceRuleProfileId: input.ruleProfile.id,
      sourceRuleProfileVersion: input.ruleProfile.version,
      requiresIndependentReview: true
    }
  };
}
