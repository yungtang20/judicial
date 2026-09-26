import type { CaseDocumentArtifact } from '../../domain/case/types';

export interface DashboardModel {
  safety: { visible: boolean; notice: string };
  summary: string;
  rights: Array<{ label: string; status: string; evidence: string[] }>;
  evidence: string[];
  bundles: string[];
  draftText: string;
  filing: { visible: boolean; notice: string; filingFee: string; opponentCount: number; evidenceCodes: string[]; disclaimer: string };
}

// 僅有通過自動驗證或人工核准的產製文件，才是可交付、可再編輯的真實文件來源。
const VERIFIED_DOCUMENT_STATUSES: ReadonlyArray<CaseDocumentArtifact['status']> = ['VERIFIED', 'HUMAN_APPROVED'];

export function selectVerifiedDocumentText(documents: CaseDocumentArtifact[] | undefined): string {
  if (!Array.isArray(documents)) return '';
  const latest = documents
    .filter(artifact => VERIFIED_DOCUMENT_STATUSES.includes(artifact.status) && Boolean(artifact.text.trim()))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))[0];
  return latest?.text ?? '';
}

export function buildDashboardModel(result: any, documents?: CaseDocumentArtifact[]): DashboardModel {
  const draftText = selectVerifiedDocumentText(documents);
  const rights = (result?.rights || result?.analysisBundle?.fit || result?.legalClaims || []).map((item: any) => ({
    label: item.label || item.legalBasis || item.id || '未命名請求權',
    status: item.status || 'UNKNOWN',
    evidence: item.missingEvidence || []
  }));
  return {
    safety: { visible: Boolean(result?.isSensitive || result?.protectionNotice), notice: result?.protectionNotice || '若有立即危險，請優先聯絡 110。' },
    summary: result?.plainExplanation || result?.summary || '尚無可顯示的白話分析。',
    rights,
    evidence: Array.isArray(result?.evidenceChecklist) ? result.evidenceChecklist : [],
    bundles: Array.isArray(result?.recommendedDocumentIds) ? result.recommendedDocumentIds : (result?.analysisBundle?.recommendedDocumentIds || (result?.recommendedToolId ? [result.recommendedToolId] : [])),
    draftText,
    filing: {
      visible: Boolean(draftText),
      notice: '下載或列印前，請再確認法院、規費、繕本及引用來源。',
      filingFee: result?.filingFee || result?.courtFee || '依訴訟標的金額及法院規定確認',
      opponentCount: Number(result?.opponentCount || result?.defendantCount || 1),
      evidenceCodes: Array.isArray(result?.evidenceCodes) ? result.evidenceCodes : [],
      disclaimer: 'AI 產出僅供整理與核對，不能取代律師意見或法院正式審查.'
    }
  };
}
