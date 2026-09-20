import { create } from 'zustand';
import { CaseContext, CaseDocumentArtifact } from '../domain/case/types';
import { CaseWorkflowStage, assertCaseTransition } from '../domain/case/workflow';
import { EvidenceRow, IssueRow, PrecedentItem } from '../types';
import { decryptCaseContext, encryptCaseContext } from '../domain/case/persistence';

interface CaseStore {
  activeCaseId: string;
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

const CASE_ID = 'active-case';
const now = () => new Date().toISOString();

const initialCase: CaseContext = {
  schemaVersion: 1,
  caseId: CASE_ID,
  workflowStage: 'INGEST',
  facts: '',
  issues: [],
  evidences: [],
  candidateCitations: [],
  deadlines: [],
  documents: [],
  updatedAt: now()
};

export const useCaseStore = create<CaseStore>((set, get) => ({
  activeCaseId: CASE_ID,
  cases: { [CASE_ID]: initialCase },
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
    const merged = current.candidateCitations.map(citation => incoming.get(citation.id) ? { ...citation, ...incoming.get(citation.id) } : citation);
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
    const documents = current.documents.map((document) => document.id === documentId ? { ...document, status: 'HUMAN_APPROVED' as const } : document);
    if (!current.documents.some((document) => document.id === documentId)) return state;
    const approvals = [...(current.approvals || []), { artifactId: documentId, reviewerLabel: '本機人工確認', note, decidedAt: now() }];
    return { cases: { ...state.cases, [CASE_ID]: { ...current, documents, approvals, workflowStage: current.workflowStage === 'VERIFIED' ? 'HUMAN_APPROVED' : current.workflowStage, updatedAt: now() } } };
  }),
  exportEncryptedCase: async (passphrase) => encryptCaseContext(getActiveCase(get()), passphrase),
  importEncryptedCase: async (payload, passphrase) => {
    const imported = await decryptCaseContext(payload, passphrase);
    set((state) => ({ cases: { ...state.cases, [CASE_ID]: { ...imported, caseId: CASE_ID, updatedAt: now() } } }));
  }
}));

export const getActiveCase = (state: CaseStore): CaseContext => state.cases[state.activeCaseId] || initialCase;
