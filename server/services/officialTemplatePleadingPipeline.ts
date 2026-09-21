import type { Buffer } from 'node:buffer';
import path from 'node:path';
import type {
  CaseInput,
  ComplianceFinding,
  IndependentReReviewReport,
  PleadingReviewReport,
  StructuredPleadingDraft
} from '../../src/types/compliance.js';
import type { OfficialTemplate } from '../../src/types/officialTemplate.js';
import { verifyTemplateArtifactAndMapping } from '../../src/lib/officialTemplateArtifactVerifier.js';
import {
  adaptOfficialTemplateToCanonical,
  type OfficialTemplateAdapterInput
} from '../../src/lib/officialTemplatePleadingAdapter.js';
import { verifyPleadingCompliance } from '../../src/lib/compliance/pleadingComplianceEngine.js';
import { verifyGenerationTemplate } from '../../src/lib/compliance/generationTemplateVerifier.js';
import { verifyGeneratedDocument } from '../../src/lib/generatedDocumentPipeline.js';
import {
  fingerprintReviewPayload,
  reviewStructuredPleading,
  type OfficialTemplateFormatFinding
} from '../../src/lib/reviewer/pleadingReviewer.js';
import {
  independentlyReReviewUnchangedDraft,
} from '../../src/lib/reviewer/independentReReviewer.js';
import {
  createPleadingDeliveryAuthorization,
  type PleadingDeliveryAuthorization
} from '../../src/lib/finalGate/pleadingExportGate.js';
import { evaluateFinalGate } from '../../src/lib/finalGate/pleadingFinalGate.js';
import { getOfficialTemplateRuleProfile } from '../../src/lib/rules/officialTemplateRuleProfiles.js';

export class OfficialTemplatePleadingPipelineError extends Error {
  constructor(public readonly code: string, message: string, public readonly fields: string[] = []) {
    super(message);
    this.name = 'OfficialTemplatePleadingPipelineError';
  }
}

export interface PreviousOfficialTemplateArtifacts {
  draft: StructuredPleadingDraft;
  reviewReport: PleadingReviewReport;
  authorization?: PleadingDeliveryAuthorization;
  fieldValuesFingerprint?: string;
}

export interface OfficialTemplatePleadingPipelineInput extends OfficialTemplateAdapterInput {
  artifact: Buffer;
  sourceArtifact?: Buffer;
  previous?: PreviousOfficialTemplateArtifacts;
}

export interface OfficialTemplatePleadingPipelineResult {
  templateId: string;
  sourceHash: string;
  artifactHash: string;
  mappingVersion: string;
  caseInput: CaseInput;
  draft: StructuredPleadingDraft;
  complianceFindings: ComplianceFinding[];
  officialTemplateFormatFinding: OfficialTemplateFormatFinding;
  reviewReport: PleadingReviewReport;
  independentReReviewReport: IndependentReReviewReport;
  finalGateReport: Awaited<ReturnType<typeof evaluateFinalGate>>;
  documentText: string;
  previousArtifactsInvalidated: boolean;
  deliveryAuthorization: PleadingDeliveryAuthorization;
}

function problem(status: ComplianceFinding['status']): boolean {
  return status === 'MISSING' || status === 'CONFLICT' || status === 'UNVERIFIED';
}

function requireVerifiedArtifact(
  template: OfficialTemplate,
  result: ReturnType<typeof verifyTemplateArtifactAndMapping>
): asserts result is ReturnType<typeof verifyTemplateArtifactAndMapping> & { sha256: string; contentXml: string; normalizedText: string; mapping: { status: 'VERIFIED' }; mimeType: string } {
  if (result.status !== 'VERIFIED' || !result.sha256 || !result.contentXml || !result.normalizedText || !result.mimeType || result.mapping?.status !== 'VERIFIED') {
    const fields = [
      result.status !== 'VERIFIED' ? `artifact:${result.status}` : '',
      ...(result.mapping && result.mapping.status !== 'VERIFIED'
        ? result.mapping.missingRequiredFields.map(field => `mapping:${field}`)
        : []),
      !result.mapping ? 'mapping:missing' : ''
    ].filter(Boolean);
    throw new OfficialTemplatePleadingPipelineError(
      result.status === 'HASH_MISMATCH' ? 'SOURCE_HASH_DRIFT' : 'ARTIFACT_OR_MAPPING_BLOCKED',
      `官方範本 ${template.id} 的 artifact integrity 或欄位 mapping 未通過。`,
      fields
    );
  }
}

async function assertPreviousArtifactsConsistent(previous?: PreviousOfficialTemplateArtifacts): Promise<void> {
  if (!previous) return;
  if (await fingerprintReviewPayload(previous.draft) !== previous.reviewReport.draftFingerprint) {
    throw new OfficialTemplatePleadingPipelineError(
      'REVIEW_FINGERPRINT_DRIFT',
      '既有 Reviewer report 與其 Draft fingerprint 不一致，禁止重用。'
    );
  }
  if (previous.authorization && previous.authorization.draftId !== previous.draft.id) {
    throw new OfficialTemplatePleadingPipelineError(
      'AUTHORIZATION_FINGERPRINT_DRIFT',
      '既有 delivery authorization 未綁定其 Draft，禁止重用。'
    );
  }
}

function officialFormatFinding(
  template: OfficialTemplate,
  artifactHash: string,
  mappingVersion: string
): OfficialTemplateFormatFinding {
  return {
    ruleId: `OFFICIAL_TEMPLATE_FORMAT.${template.id}`,
    status: 'COMPLIANT',
    evidenceLocation: `officialTemplate:${template.id}`,
    note: '官方範本 source hash、artifact hash 與欄位 mapping version 已驗證。',
    templateId: template.id,
    sourceHash: template.localFileHash || '',
    artifactHash,
    mappingVersion
  };
}

export async function executeOfficialTemplatePleadingPipeline(
  input: OfficialTemplatePleadingPipelineInput
): Promise<OfficialTemplatePleadingPipelineResult> {
  const profile = getOfficialTemplateRuleProfile(input.template.id);
  if (!profile) {
    throw new OfficialTemplatePleadingPipelineError('RULE_PROFILE_NOT_FOUND', '官方範本沒有已核准的 pilot Rule Profile。');
  }
  await assertPreviousArtifactsConsistent(input.previous);

  const sourceArtifact = input.sourceArtifact || input.artifact;
  const sourceVerification = verifyTemplateArtifactAndMapping(input.template, sourceArtifact);
  requireVerifiedArtifact(input.template, sourceVerification);
  const artifact = input.sourceArtifact
    ? verifyTemplateArtifactAndMapping(input.template, input.artifact, undefined)
    : sourceVerification;
  requireVerifiedArtifact(input.template, artifact);

  const { caseInput, draft, ruleProfile } = adaptOfficialTemplateToCanonical(input);
  const complianceFindings = verifyPleadingCompliance({
    draft,
    caseInput,
    ruleProfile,
    legalReferences: profile.legalReferences
  });
  const draftDocumentText = draft.sections.map(section => section.content).filter(Boolean).join('\n');
  const officialTemplateFormatFinding = officialFormatFinding(input.template, artifact.sha256, profile.mappingVersion);
  const reviewReport = await reviewStructuredPleading({
    draft,
    caseInput,
    ruleProfile,
    complianceFindings,
    citationVerification: verifyGeneratedDocument(draftDocumentText),
    formatFinding: verifyGenerationTemplate(profile.caseType, profile.formatProfile),
    appliedFormatProfile: profile.formatProfile,
    officialTemplateFormatFinding
  });
  if (reviewReport.findings.some(finding => problem(finding.status))) {
    throw new OfficialTemplatePleadingPipelineError(
      'REVIEW_BLOCKED',
      `官方範本 Reviewer 阻擋：${reviewReport.findings.filter(finding => problem(finding.status)).map(finding => finding.id).join(', ')}`
    );
  }

  const independentReReviewReport = await independentlyReReviewUnchangedDraft({
    draft,
    caseInput,
    ruleProfile,
    legalReferences: profile.legalReferences,
    originalReviewReport: reviewReport,
    officialTemplateFormatFinding
  });
  if (!independentReReviewReport.allChecksPassed) {
    throw new OfficialTemplatePleadingPipelineError('INDEPENDENT_RE_REVIEW_BLOCKED', '官方範本 Independent Re-review 未通過。');
  }

  const finalGateReport = await evaluateFinalGate({
    draft,
    caseInput,
    ruleProfile,
    legalReferences: profile.legalReferences,
    revisionRecords: [],
    independentReReviewReport,
    humanEditRecord: { occurred: false, kind: 'NONE', fields: [] },
    officialTemplateFormatFinding
  });
  if (finalGateReport.status !== 'READY') {
    throw new OfficialTemplatePleadingPipelineError(
      'P9_FINAL_GATE_BLOCKED',
      `官方範本 P9 Final Gate 阻擋：${finalGateReport.blockers.map(blocker => blocker.id).join(', ')}`
    );
  }

  const documentText = artifact.normalizedText;
  const artifactFileName = path.basename(input.template.localFilePath || `${input.template.id}.odt`);
  const deliveryAuthorization = await createPleadingDeliveryAuthorization(
    finalGateReport,
    documentText,
    {
      templateId: input.template.id,
      templateSourceHash: input.template.localFileHash || '',
      artifactFingerprint: artifact.sha256,
      artifactMimeType: artifact.mimeType,
      artifactFileName
    }
  );
  const currentValuesFingerprint = await fingerprintReviewPayload(input.values);
  return {
    templateId: input.template.id,
    sourceHash: input.template.localFileHash || '',
    artifactHash: artifact.sha256,
    mappingVersion: profile.mappingVersion,
    caseInput,
    draft,
    complianceFindings,
    officialTemplateFormatFinding,
    reviewReport,
    independentReReviewReport,
    finalGateReport,
    documentText,
    previousArtifactsInvalidated: Boolean(input.previous && input.previous.fieldValuesFingerprint !== currentValuesFingerprint),
    deliveryAuthorization
  };
}
