import crypto from 'node:crypto';
import path from 'node:path';
import type { FinalGateReport } from '../../types/compliance';
import { fingerprintReviewPayload } from '../reviewer/pleadingReviewer';
import { isP9ProtectedDocument } from '../documentCatalog';

export type PleadingDeliveryAction =
  | 'RETURN'
  | 'COPY'
  | 'DOWNLOAD_TEXT'
  | 'DOWNLOAD_WORD'
  | 'PRINT';

export interface PleadingDeliveryAuthorization {
  finalGateStatus: 'READY';
  exportPolicy: 'READY_ONLY';
  evaluatorVersion: string;
  gateInputFingerprint: string;
  documentFingerprint: string;
  caseInputId: string;
  draftId: string;
  ruleProfileId: string;
  ruleProfileVersion: string;
  authorizedActions: PleadingDeliveryAction[];
  templateId?: string;
  templateSourceHash?: string;
  artifactFingerprint?: string;
  artifactMimeType?: string;
  artifactFileName?: string;
}

export interface OfficialTemplateAuthorizationBinding {
  templateId: string;
  templateSourceHash: string;
  artifactFingerprint: string;
  artifactMimeType: string;
  artifactFileName: string;
}

export interface OfficialTemplateDeliveryArtifact {
  templateId: string;
  templateSourceHash: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  normalizedText?: string;
}

export interface PleadingDeliveryDecision {
  required: boolean;
  allowed: boolean;
  code:
    | 'NOT_A_COURT_PLEADING'
    | 'P9_FINAL_GATE_REQUIRED'
    | 'P9_FINAL_GATE_NOT_READY'
    | 'P9_FINAL_GATE_READY';
  message: string;
}

const ALL_DELIVERY_ACTIONS: PleadingDeliveryAction[] = [
  'RETURN',
  'COPY',
  'DOWNLOAD_TEXT',
  'DOWNLOAD_WORD',
  'PRINT'
];

/**
 * Explicit allowlist of toolbox categories that create documents intended for
 * filing with a court or prosecutors office. Classification must never rely on
 * an AI response, title, or text heuristic.
 */
const REQUIRED_AUDIT_IDS: Array<`Q${string}`> = Array.from(
  { length: 20 },
  (_, index) => `Q${String(index + 1).padStart(2, '0')}` as `Q${string}`
);

export function isCourtPleadingToolCategory(category: string): boolean {
  return isP9ProtectedDocument(category);
}

/**
 * Converts a complete P9 report into the minimum client-facing authorization.
 * BLOCKED_WITH_HUMAN_OVERRIDE is intentionally excluded: its export policy
 * requires a separate trusted HUMAN DEPLOY gate which toolbox does not have.
 */
export async function createPleadingDeliveryAuthorization(
  report: FinalGateReport,
  documentText: string,
  officialTemplate?: OfficialTemplateAuthorizationBinding
): Promise<PleadingDeliveryAuthorization> {
  const answeredIds = new Set(
    report.auditItems
      .filter(item => item.status === 'ANSWERED')
      .map(item => item.id)
  );
  const allAuditItemsAnswered =
    report.auditItems.length === REQUIRED_AUDIT_IDS.length &&
    answeredIds.size === REQUIRED_AUDIT_IDS.length &&
    REQUIRED_AUDIT_IDS.every(id =>
      report.auditItems.filter(item => item.id === id && item.status === 'ANSWERED').length === 1
    );
  const finalStatusAudit = report.auditItems.find(item => item.id === 'Q17');
  const overrideAudit = report.auditItems.find(item => item.id === 'Q18');

  if (
    report.status !== 'READY' ||
    report.exportPolicy !== 'READY_ONLY' ||
    report.blockers.length !== 0 ||
    !allAuditItemsAnswered ||
    finalStatusAudit?.answer !== 'READY' ||
    overrideAudit?.answer !== false ||
    !report.evaluatorVersion.trim() ||
    !/^[a-f0-9]{64}$/.test(report.gateInputFingerprint) ||
    !documentText.trim() ||
    !report.reviewerReport.caseInputId?.trim() ||
    !report.reviewerReport.draftId?.trim() ||
    !report.reviewerReport.ruleProfileId?.trim() ||
    !report.reviewerReport.ruleProfileVersion?.trim() ||
    (officialTemplate && (
      !officialTemplate.templateId.trim() ||
      !/^[a-f0-9]{64}$/.test(officialTemplate.templateSourceHash) ||
      !/^[a-f0-9]{64}$/.test(officialTemplate.artifactFingerprint) ||
      !officialTemplate.artifactMimeType.trim() ||
      !officialTemplate.artifactFileName.trim()
    ))
  ) {
    throw new Error('P9 Final Gate is not READY for ordinary toolbox delivery.');
  }

  return {
    finalGateStatus: 'READY',
    exportPolicy: 'READY_ONLY',
    evaluatorVersion: report.evaluatorVersion,
    gateInputFingerprint: report.gateInputFingerprint,
    documentFingerprint: await fingerprintReviewPayload(documentText),
    caseInputId: report.reviewerReport.caseInputId,
    draftId: report.reviewerReport.draftId,
    ruleProfileId: report.reviewerReport.ruleProfileId,
    ruleProfileVersion: report.reviewerReport.ruleProfileVersion,
    authorizedActions: [...ALL_DELIVERY_ACTIONS],
    ...(officialTemplate || {})
  };
}

function hasCompleteOfficialTemplateBinding(authorization: PleadingDeliveryAuthorization): boolean {
  const fields = [
    authorization.templateId,
    authorization.templateSourceHash,
    authorization.artifactFingerprint,
    authorization.artifactMimeType,
    authorization.artifactFileName
  ];
  return fields.every(field => Boolean(field?.trim())) &&
    /^[a-f0-9]{64}$/.test(authorization.templateSourceHash || '') &&
    /^[a-f0-9]{64}$/.test(authorization.artifactFingerprint || '');
}

function isValidAuthorization(
  authorization: PleadingDeliveryAuthorization | undefined,
  action: PleadingDeliveryAction
): boolean {
  return Boolean(
    authorization &&
    authorization.finalGateStatus === 'READY' &&
    authorization.exportPolicy === 'READY_ONLY' &&
    authorization.evaluatorVersion.trim() &&
    /^[a-f0-9]{64}$/.test(authorization.gateInputFingerprint) &&
    /^[a-f0-9]{64}$/.test(authorization.documentFingerprint) &&
    authorization.caseInputId.trim() &&
    authorization.draftId.trim() &&
    authorization.ruleProfileId.trim() &&
    authorization.ruleProfileVersion.trim() &&
    (!authorization.templateId || hasCompleteOfficialTemplateBinding(authorization)) &&
    authorization.authorizedActions.includes(action)
  );
}

export function evaluatePleadingDelivery(
  category: string,
  authorization?: PleadingDeliveryAuthorization,
  action: PleadingDeliveryAction = 'RETURN'
): PleadingDeliveryDecision {
  if (!isCourtPleadingToolCategory(category)) {
    return {
      required: false,
      allowed: true,
      code: 'NOT_A_COURT_PLEADING',
      message: 'This toolbox category is outside the court-pleading P9 delivery gate.'
    };
  }

  if (!authorization) {
    return {
      required: true,
      allowed: false,
      code: 'P9_FINAL_GATE_REQUIRED',
      message: '法院書狀尚未取得 P9 Final Gate 的 READY 授權，禁止回傳或匯出。'
    };
  }

  return isValidAuthorization(authorization, action)
    ? {
        required: true,
        allowed: true,
        code: 'P9_FINAL_GATE_READY',
        message: 'P9 Final Gate READY authorization verified for this delivery action.'
      }
    : {
        required: true,
        allowed: false,
        code: 'P9_FINAL_GATE_NOT_READY',
        message: 'P9 Final Gate 未授權此法院書狀操作。'
      };
}

export async function verifyPleadingDeliveryAuthorization(
  category: string,
  authorization: PleadingDeliveryAuthorization | undefined,
  action: PleadingDeliveryAction,
  documentText: string,
  artifact?: OfficialTemplateDeliveryArtifact
): Promise<PleadingDeliveryDecision> {
  // This verifies payload binding for browser defense-in-depth. Server routes
  // must still derive authorization from their own P9 report and must never
  // accept this client-facing capability back as proof.
  const decision = evaluatePleadingDelivery(category, authorization, action);
  if (!decision.allowed || !decision.required) return decision;

  const actualFingerprint = await fingerprintReviewPayload(documentText);
  if (actualFingerprint !== authorization?.documentFingerprint) {
    return {
        required: true,
        allowed: false,
        code: 'P9_FINAL_GATE_NOT_READY',
        message: '文件內容與 P9 授權 fingerprint 不一致，拒絕交付。'
      };
  }
  if (!authorization?.templateId) return decision;
  if (!artifact ||
      artifact.templateId !== authorization.templateId ||
      artifact.templateSourceHash !== authorization.templateSourceHash ||
      artifact.mimeType !== authorization.artifactMimeType ||
      path.basename(artifact.fileName) !== path.basename(authorization.artifactFileName)) {
    return {
      required: true,
      allowed: false,
      code: 'P9_FINAL_GATE_NOT_READY',
      message: 'ODT artifact metadata 與 P9 授權不一致，拒絕交付。'
    };
  }
  const artifactFingerprint = crypto.createHash('sha256').update(artifact.buffer).digest('hex');
  if (artifactFingerprint !== authorization.artifactFingerprint) {
    return {
      required: true,
      allowed: false,
      code: 'P9_FINAL_GATE_NOT_READY',
      message: 'ODT binary 與 P9 授權 artifact fingerprint 不一致，拒絕交付。'
    };
  }
  if (artifact.normalizedText === undefined ||
      await fingerprintReviewPayload(artifact.normalizedText) !== authorization.documentFingerprint) {
    return {
      required: true,
      allowed: false,
      code: 'P9_FINAL_GATE_NOT_READY',
      message: 'ODT normalized text 與 P9 授權文件 fingerprint 不一致，拒絕交付。'
    };
  }
  return decision;
}

export async function assertPleadingDocumentDeliveryAllowed(
  category: string,
  authorization: PleadingDeliveryAuthorization | undefined,
  action: PleadingDeliveryAction,
  documentText: string,
  artifact?: OfficialTemplateDeliveryArtifact
): Promise<void> {
  const decision = await verifyPleadingDeliveryAuthorization(category, authorization, action, documentText, artifact);
  if (!decision.allowed) throw new Error(`${decision.code}: ${decision.message}`);
}
