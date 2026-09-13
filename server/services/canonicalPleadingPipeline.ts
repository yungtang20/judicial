import { randomUUID } from 'crypto';
import type { CaseInput, Evidence, MissingInput, Party } from '../../src/types/compliance.js';
import { buildStructuredPleadingDraft } from '../../src/lib/generator/civilPleadingGenerator.js';
import { verifyPleadingCompliance } from '../../src/lib/compliance/pleadingComplianceEngine.js';
import { reviewStructuredPleading } from '../../src/lib/reviewer/pleadingReviewer.js';
import { independentlyReReviewUnchangedDraft } from '../../src/lib/reviewer/independentReReviewer.js';
import { evaluateFinalGate } from '../../src/lib/finalGate/pleadingFinalGate.js';
import { createPleadingDeliveryAuthorization } from '../../src/lib/finalGate/pleadingExportGate.js';
import { getCourtPleadingConfig } from '../../src/lib/rules/courtPleadingRuleProfiles.js';
import { verifyGeneratedDocument } from '../../src/lib/generatedDocumentPipeline.js';
import { verifyGenerationTemplate } from '../../src/lib/compliance/generationTemplateVerifier.js';

type CanonicalParams = Record<string, unknown>;

export class CanonicalPleadingInputError extends Error {
  readonly code = 'CANONICAL_PLEADING_INPUT_REQUIRED';

  constructor(readonly missingInputs: MissingInput[]) {
    super(`書狀輸入不足：${[...new Set(missingInputs.map(item => item.field))].join(', ')}`);
  }
}

function text(params: CanonicalParams, ...keys: string[]): string {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function sourceTexts(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap(item => {
    if (typeof item === 'string') return item.split(/\r?\n/).map(part => part.trim()).filter(Boolean);
    if (!item || typeof item !== 'object') return [];
    const content = (item as Record<string, unknown>).content;
    return typeof content === 'string' && content.trim() ? [content.trim()] : [];
  });
}

function evidenceFrom(params: CanonicalParams, ...keys: string[]): Evidence[] {
  for (const key of keys) {
    const contents = sourceTexts(params[key]);
    if (contents.length) return contents.map(content => ({ id: randomUUID(), content }));
  }
  return [];
}

function isPositiveDecimalAmount(value: string): boolean {
  const normalized = value.replace(/,/g, '');
  return /^\d+(?:\.\d+)?$/.test(normalized) && Number(normalized) > 0;
}

function buildParties(params: CanonicalParams, claimantRole: string, respondentRole: string): Party[] {
  const claimant: Party = {
    id: randomUUID(),
    role: claimantRole,
    name: text(params, 'plaintiffName', 'claimantName', 'creditorName', 'complainantName', 'petitionerName'),
    address: text(params, 'plaintiffAddress', 'claimantAddress', 'creditorAddress', 'complainantAddress', 'petitionerAddress')
  };
  const defendants = [1, 2]
    .map(index => ({
      name: text(params, `defendant${index}Name`),
      address: text(params, `defendant${index}Address`)
    }))
    .filter(party => party.name || party.address);
  const respondents = defendants.length ? defendants : [{
    name: text(params, 'defendantName', 'respondentName', 'debtorName', 'accusedName'),
    address: text(params, 'defendantAddress', 'respondentAddress', 'debtorAddress', 'accusedAddress')
  }];

  return [claimant, ...respondents.map((party, index) => ({
    id: randomUUID(),
    role: respondents.length > 1 ? `${respondentRole}${index + 1}` : respondentRole,
    ...party
  }))];
}

export async function executeCanonicalPleadingPipeline(categoryKey: string, rawParams: unknown) {
  const config = getCourtPleadingConfig(categoryKey);
  if (!config) throw new Error(`此類別（${categoryKey}）尚未支援 P4-P9 確定性管線`);
  const params: CanonicalParams = rawParams && typeof rawParams === 'object' && !Array.isArray(rawParams)
    ? rawParams as CanonicalParams
    : {};

  const factContent = text(params, 'facts', 'incidentDetails', 'caseContext');
  const claimAmount = text(params, 'claimAmount', 'claimTotalAmount', 'debtAmount');
  const claimStatement = text(params, 'claimStatement') || (
    claimAmount ? `${config.claimLabel}：請求給付 ${claimAmount}` : ''
  );
  const evidence = evidenceFrom(params, 'evidence', 'evidenceDetails', 'evidenceList');
  const attachments = evidenceFrom(params, 'attachments', 'attachmentDetails');
  const factId = factContent ? randomUUID() : '';
  const claimId = claimStatement ? randomUUID() : '';

  const caseInput: CaseInput = {
    id: randomUUID(),
    caseType: config.caseType,
    pleadingType: config.pleadingType,
    styleProfile: config.styleProfile,
    court: text(params, 'courtName'),
    proceeding: text(params, 'proceeding'),
    documentDate: text(params, 'documentDate'),
    signature: text(params, 'signature'),
    parties: buildParties(params, config.claimantRole, config.respondentRole),
    claims: claimStatement ? [{
      id: claimId,
      statement: claimStatement,
      factIds: factId && config.pleadingType === 'complaint' ? [factId] : [],
      evidenceIds: evidence.map(item => item.id)
    }] : [],
    facts: factContent ? [{
      id: factId,
      content: factContent,
      sourceLevel: 'USER_PROVIDED_FACT',
      evidenceIds: evidence.map(item => item.id)
    }] : [],
    evidence,
    attachments,
    legalReferencesUsed: config.legalReferences.map(reference => reference.sourceReference)
  };

  const draft = buildStructuredPleadingDraft(caseInput, config.ruleProfile);
  if (config.requiresFixedQuantityClaim && !isPositiveDecimalAmount(claimAmount)) {
    draft.missingInputs = [...(draft.missingInputs || []), {
      field: 'debtAmount',
      reason: '支付命令須先以正數數值確認一定數量之金錢請求；其他代替物或有價證券標的尚未支援。',
      severity: 'BLOCKING',
      requiredFor: [config.pleadingType],
      sourceRequirement: '民事訴訟法第508條',
      category: 'MINIMUM_GENERATION'
    }];
  }
  const blockingInputs = (draft.missingInputs || []).filter(
    item => item.severity === 'BLOCKING' || item.severity === 'HIGH'
  );
  if (blockingInputs.length) throw new CanonicalPleadingInputError(blockingInputs);

  const complianceFindings = verifyPleadingCompliance({
    draft,
    caseInput,
    ruleProfile: config.ruleProfile,
    legalReferences: config.legalReferences
  });
  const rawDocumentText = draft.sections.map(section => section.content).filter(Boolean).join('\n');
  const citationVerification = verifyGeneratedDocument(rawDocumentText);
  const formatFinding = verifyGenerationTemplate(config.caseType, config.formatProfile);
  const reviewReport = await reviewStructuredPleading({
    draft,
    caseInput,
    ruleProfile: config.ruleProfile,
    complianceFindings,
    citationVerification,
    formatFinding,
    appliedFormatProfile: config.formatProfile
  });
  if (reviewReport.findings.some(finding =>
    finding.status === 'MISSING' || finding.status === 'CONFLICT' || finding.status === 'UNVERIFIED'
  )) {
    const problems = reviewReport.findings.filter(finding =>
      finding.status === 'MISSING' || finding.status === 'CONFLICT' || finding.status === 'UNVERIFIED'
    );
    throw new Error(`初稿存在未解決瑕疵：${problems.map(finding => finding.id).join(', ')}`);
  }

  const independentReReviewReport = await independentlyReReviewUnchangedDraft({
    draft,
    caseInput,
    ruleProfile: config.ruleProfile,
    legalReferences: config.legalReferences,
    originalReviewReport: reviewReport
  });
  const finalGateReport = await evaluateFinalGate({
    independentReReviewReport,
    draft,
    caseInput,
    ruleProfile: config.ruleProfile,
    legalReferences: config.legalReferences,
    revisionRecords: [],
    humanEditRecord: { occurred: false, kind: 'NONE', fields: [] }
  });
  if (finalGateReport.status !== 'READY') {
    throw new Error(`P9 Final Gate 阻擋交付：${finalGateReport.blockers.map(item => item.id).join(', ')}`);
  }

  const documentText = draft.sections
    .filter(section => section.content.trim())
    .map(section => section.title ? `${section.title}\n${section.content}` : section.content)
    .join('\n\n');
  const authorization = await createPleadingDeliveryAuthorization(finalGateReport, documentText);

  return {
    toolCategory: config.categoryKey,
    title: config.documentTitle,
    documentTitle: config.documentTitle,
    documentText,
    pleadingDeliveryAuthorization: authorization,
    antiGhostVerification: {
      status: 'UNVERIFIED',
      message: '未執行外部裁判引註查核（由確定性法規模組生成）',
      totalCitationsChecked: 0,
      ghostCitationsFound: 0,
      verifiedCitations: []
    },
    legalSources: config.legalReferences.map(reference => ({ ...reference })),
    isExternalRetrievalUsed: false,
    retrievalStatusMessage: '已使用 P4-P9 確定性合規管線產製（未執行外部網路檢索）',
    complianceChecklist: complianceFindings.map(finding => ({
      rule: finding.ruleId,
      passed: finding.status === 'COMPLIANT' || finding.status === 'NOT_APPLICABLE' || finding.status === 'WARNING',
      detail: finding.note || ''
    }))
  };
}
