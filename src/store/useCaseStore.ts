import { create } from 'zustand';
import { CaseContext, CaseDocumentArtifact } from '../domain/case/types';
import { CaseWorkflowStage, assertCaseTransition } from '../domain/case/workflow';
import { EvidenceRow, IssueRow, PrecedentItem } from '../types';
import { decryptCaseContext, encryptCaseContext } from '../domain/case/persistence';
import { projectUnifiedWorkflowToCase } from '../domain/case/projection';
import { normalizeEvidenceRow } from '../lib/caseRowAdapters';
import type { LegalWorkflowState } from '../lib/workflow/unifiedStateGraph';

export interface CaseStore {
  activeCaseId: string;
  /**
   * 統一導診工作流狀態。放在 store 而非元件 useState，
   * 否則 App.tsx 每次導航都會卸載 UnifiedEntry，導致狀態遺失，
   * 下一次分析因未帶 stateId 而被伺服器視為新案件，舊案產物遭無聲清除。
   */
  workflowState: LegalWorkflowState | null;
  setWorkflowState: (state: LegalWorkflowState | null) => void;
  applyUnifiedWorkflow: (state: LegalWorkflowState) => void;
  resetCase: () => void;
  cases: Record<string, CaseContext>;
  saveTriage: (facts: string, result: any) => void;
  saveAnalysis: (result: any, updates: { facts?: string; caseType?: string; issues?: IssueRow[]; evidences?: EvidenceRow[]; citations?: PrecedentItem[] }) => void;
  updateIssues: (issues: IssueRow[]) => void;
  updateEvidences: (evidences: EvidenceRow[]) => void;
  saveRetrievedCitations: (citations: PrecedentItem[]) => void;
  transitionStage: (stage: CaseWorkflowStage) => void;
  addDocument: (document: CaseDocumentArtifact) => void;
  markCitationFulltextRead: (citationKey: string, sourceUrl?: string) => void;
  confirmDocument: (documentId: string, note: string) => void;
  exportEncryptedCase: (passphrase: string) => Promise<string>;
  importEncryptedCase: (payload: string, passphrase: string) => Promise<void>;
}

/**
 * 案件身分識別：同一份工作流 id 不足以代表同一案件，因為使用者可以在不換 id 的情況下
 * 改寫案情後重新分析。必須同時比對工作流 id 與案情指紋。
 */
export function isSameMatter(current: CaseContext, incoming: LegalWorkflowState): boolean {
  if (current.workflowStateId !== incoming.id) return false;
  return normalizeNarrativeFingerprint(current.facts) === normalizeNarrativeFingerprint(incoming.userNarrative);
}

function normalizeNarrativeFingerprint(text: string | undefined | null): string {
  return (text || '').replace(/\s+/g, '').replace(/[，。！？、,.!?]/g, '');
}

const CASE_ID = 'active-case';
const now = () => new Date().toISOString();

const createInitialCase = (): CaseContext => ({
  schemaVersion: 1,
  caseId: CASE_ID,
  workflowStage: 'INGEST',
  facts: '',
  issues: [],
  evidences: [],
  candidateCitations: [],
  deadlines: [],
  documents: [],
  approvals: [],
  updatedAt: now()
});

const initialCase = createInitialCase();

export const useCaseStore = create<CaseStore>((set, get) => ({
  activeCaseId: CASE_ID,
  workflowState: null,
  setWorkflowState: (workflowState) => set({ workflowState }),
  cases: { [CASE_ID]: initialCase },
  // 開立新案件是使用者明確動作，因此這裡才允許連同工作流狀態與產物一起清除
  resetCase: () => set({ activeCaseId: CASE_ID, workflowState: null, cases: { [CASE_ID]: createInitialCase() } }),
  saveTriage: (facts, result) => set((state) => {
    const current = state.cases[CASE_ID] || initialCase;
    const stage = current.workflowStage === 'DEIDENTIFIED' || current.workflowStage === 'INGEST' ? 'TRIAGED' : current.workflowStage;
    return { cases: { ...state.cases, [CASE_ID]: { ...current, facts, caseType: result?.caseType, triageResult: result, workflowStage: stage, updatedAt: now() } } };
  }),
  saveAnalysis: (result, updates) => set((state) => {
    const current = state.cases[CASE_ID] || initialCase;
    return {
      cases: {
        ...state.cases,
        [CASE_ID]: {
          ...current,
          ...updates,
          issues: updates.issues || current.issues,
          evidences: updates.evidences || current.evidences,
          candidateCitations: updates.citations || current.candidateCitations,
          analysisResult: result,
          workflowStage: current.workflowStage === 'TRIAGED' ? 'ANALYZED' : current.workflowStage,
          updatedAt: now()
        }
      }
    };
  }),
  applyUnifiedWorkflow: (workflowState) => set((state) => {
    const current = state.cases[CASE_ID] || initialCase;
    const projection = projectUnifiedWorkflowToCase(workflowState);
    const sameMatter = isSameMatter(current, workflowState);
    const shouldCutover = !sameMatter;
    // 切換到新案件時，舊案的 documents／approvals／evidences／issues 一律保留。
    // 過往直接以 createInitialCase() 覆蓋，會讓已產製文件與人工核准紀錄無聲消失；
    // 使用者要真正開新案時，請走明確的 resetCase()。
    const base = current;
    const incoming = new Map(projection.candidateCitations.map(citation => [citation.id, citation]));
    const merged = base.candidateCitations.map(citation => {
      const next = incoming.get(citation.id);
      return next ? { ...citation, ...next, sourceStatus: citation.sourceStatus || next.sourceStatus } : citation;
    });
    const existingIds = new Set(base.candidateCitations.map(citation => citation.id));
    const candidateCitations = [
      ...merged,
      ...projection.candidateCitations.filter(citation => !existingIds.has(citation.id))
    ];
    const canProjectStage = base.workflowStage === 'INGEST' || base.workflowStage === 'DEIDENTIFIED' || base.workflowStage === 'TRIAGED';
    const workflowStage = !shouldCutover && !canProjectStage ? base.workflowStage : projection.workflowStage;
    return {
      workflowState,
      cases: {
        ...state.cases,
        [CASE_ID]: {
          ...base,
          workflowStateId: projection.workflowStateId,
          facts: projection.facts,
          caseType: projection.caseType || base.caseType,
          triageResult: projection.triageResult,
          analysisResult: projection.analysisResult || (!shouldCutover ? base.analysisResult : null),
          candidateCitations,
          workflowStage,
          updatedAt: now()
        }
      }
    };
  }),
  updateIssues: (issues) => set((state) => {
    const current = state.cases[CASE_ID] || initialCase;
    return { cases: { ...state.cases, [CASE_ID]: { ...current, issues, updatedAt: now() } } };
  }),
  updateEvidences: (evidences) => set((state) => {
    const current = state.cases[CASE_ID] || initialCase;
    return { cases: { ...state.cases, [CASE_ID]: { ...current, evidences, updatedAt: now() } } };
  }),
  saveRetrievedCitations: (citations) => set((state) => {
    const current = state.cases[CASE_ID] || initialCase;
    const incoming = new Map(citations.map(citation => [citation.id, citation]));
    const merged = current.candidateCitations.map(citation => {
      const next = incoming.get(citation.id);
      if (!next) return citation;
      const mergedCitation = { ...citation, ...next };
      if (citation.sourceStatus === 'FULLTEXT_READ' || citation.sourceStatus === 'HUMAN_CONFIRMED') {
        mergedCitation.sourceStatus = citation.sourceStatus;
      }
      return mergedCitation;
    });
    const existingIds = new Set(current.candidateCitations.map(citation => citation.id));
    const candidateCitations = [...merged, ...citations.filter(citation => !existingIds.has(citation.id))];
    return { cases: { ...state.cases, [CASE_ID]: { ...current, candidateCitations, workflowStage: current.workflowStage === 'ANALYZED' ? 'RETRIEVED' : current.workflowStage, updatedAt: now() } } };
  }),
  transitionStage: (stage) => set((state) => {
    const current = state.cases[CASE_ID] || initialCase;
    assertCaseTransition(current.workflowStage, stage);
    return { cases: { ...state.cases, [CASE_ID]: { ...current, workflowStage: stage, updatedAt: now() } } };
  }),
  addDocument: (document) => set((state) => {
    const current = state.cases[CASE_ID] || initialCase;
    if (current.documents.some((item) => item.id === document.id)) return state;
    let workflowStage = current.workflowStage;
    if (document.status === 'VERIFIED' && (workflowStage === 'ANALYZED' || workflowStage === 'RETRIEVED')) workflowStage = 'VERIFIED';
    else if (document.status === 'DRAFT' && (workflowStage === 'ANALYZED' || workflowStage === 'RETRIEVED')) workflowStage = 'DRAFTED';
    return { cases: { ...state.cases, [CASE_ID]: { ...current, documents: [...current.documents, document], workflowStage, updatedAt: now() } } };
  }),
  markCitationFulltextRead: (citationKey, sourceUrl) => set((state) => {
    const current = state.cases[CASE_ID] || initialCase;
    const candidateCitations = current.candidateCitations.map((citation) =>
      citation.id === citationKey || citation.sourceId === citationKey || citation.citation === citationKey
        ? { ...citation, sourceStatus: 'FULLTEXT_READ' as const, sourceUrl: sourceUrl || citation.sourceUrl, fetchedAt: now() }
        : citation
    );
    return { cases: { ...state.cases, [CASE_ID]: { ...current, candidateCitations, updatedAt: now() } } };
  }),
  confirmDocument: (documentId, note) => set((state) => {
    const current = state.cases[CASE_ID] || initialCase;
    const document = current.documents.find(item => item.id === documentId);
    if (!document || !['VERIFIED', 'NEEDS_HUMAN_REVIEW'].includes(document.status) || !note.trim()) return state;
    const documents = current.documents.map(item => item.id === documentId ? { ...item, status: 'HUMAN_APPROVED' as const } : item);
    const approvals = [...(current.approvals || []), { artifactId: documentId, reviewerLabel: '本機人工確認', note: note.trim(), decidedAt: now() }];
    return { cases: { ...state.cases, [CASE_ID]: { ...current, documents, approvals, workflowStage: current.workflowStage === 'VERIFIED' ? 'HUMAN_APPROVED' : current.workflowStage, updatedAt: now() } } };
  }),
  exportEncryptedCase: async (passphrase) => encryptCaseContext(getActiveCase(get()), passphrase),
  importEncryptedCase: async (payload, passphrase) => {
    const imported = await decryptCaseContext(payload, passphrase);
    set((state) => ({ cases: { ...state.cases, [CASE_ID]: { ...imported, caseId: CASE_ID, evidences: Array.isArray(imported.evidences) ? imported.evidences.map((item, index) => normalizeEvidenceRow(item, index)) : [], updatedAt: now() } } }));
  }
}));

export const getActiveCase = (state: CaseStore): CaseContext => state.cases[state.activeCaseId] || initialCase;
