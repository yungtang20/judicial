import type {
  PleadingDeliveryAction,
  PleadingDeliveryAuthorization,
  PleadingDeliveryDecision
} from './pleadingExportGate';
import { fingerprintReviewPayload } from '../reviewer/pleadingReviewer';
import { isP9ProtectedDocument } from '../documentCatalog';

export type { PleadingDeliveryAction, PleadingDeliveryAuthorization, PleadingDeliveryDecision };

const ALL_DELIVERY_ACTIONS: PleadingDeliveryAction[] = [
  'RETURN',
  'COPY',
  'DOWNLOAD_TEXT',
  'DOWNLOAD_WORD',
  'PRINT'
];

function isValidAuthorization(authorization: PleadingDeliveryAuthorization | undefined, action: PleadingDeliveryAction): boolean {
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
    (!authorization.templateId || Boolean(
      authorization.templateSourceHash &&
      authorization.artifactFingerprint &&
      authorization.artifactMimeType?.trim() &&
      authorization.artifactFileName?.trim()
    )) &&
    authorization.authorizedActions.includes(action)
  );
}

export function evaluatePleadingDelivery(
  category: string,
  authorization?: PleadingDeliveryAuthorization,
  action: PleadingDeliveryAction = 'RETURN'
): PleadingDeliveryDecision {
  if (!isP9ProtectedDocument(category)) {
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
  documentText: string
): Promise<PleadingDeliveryDecision> {
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
  return decision;
}

export async function assertPleadingDocumentDeliveryAllowed(
  category: string,
  authorization: PleadingDeliveryAuthorization | undefined,
  action: PleadingDeliveryAction,
  documentText: string
): Promise<void> {
  const decision = await verifyPleadingDeliveryAuthorization(category, authorization, action, documentText);
  if (!decision.allowed) throw new Error(`${decision.code}: ${decision.message}`);
}

export { ALL_DELIVERY_ACTIONS };
