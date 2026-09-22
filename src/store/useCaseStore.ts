import { create } from 'zustand';
import { CaseContext, CaseDocumentArtifact } from '../domain/case/types';
import { IssueRow, EvidenceRow, PrecedentItem } from '../types';

export interface CaseState {
  cases: CaseContext[];
  activeCaseId: string | null;
  activeCase: CaseContext;
  updateIssues: (issues: IssueRow[]) => void;
  updateEvidences: (evidences: EvidenceRow[]) => void;
  addDocument: (doc: CaseDocumentArtifact | any) => void;
  saveTriage: (triageResult: any) => void;
  saveAnalysis: (analysisResult: any) => void;
  saveRetrievedCitations: (citations: PrecedentItem[]) => void;
  setActiveCaseId: (caseId: string) => void;
}

const createDefaultCase = (id: string = 'case_default'): CaseContext => ({
  schemaVersion: 1,
  caseId: id,
  workflowStage: 'INGEST',
  facts: '',
  issues: [],
  evidences: [],
  candidateCitations: [],
  deadlines: [],
  documents: [],
  updatedAt: new Date().toISOString(),
});

export const getActiveCase = (state: CaseState): CaseContext => {
  return state.activeCase || state.cases.find(c => c.caseId === state.activeCaseId) || state.cases[0] || createDefaultCase();
};

export const useCaseStore = create<CaseState>((set, get) => {
  const initialCase = createDefaultCase();
  return {
    cases: [initialCase],
    activeCaseId: initialCase.caseId,
    activeCase: initialCase,
    updateIssues: (issues: IssueRow[]) => {
      set(state => {
        const updatedCase = {
          ...getActiveCase(state),
          issues,
          updatedAt: new Date().toISOString(),
        };
        return {
          activeCase: updatedCase,
          cases: state.cases.map(c => c.caseId === updatedCase.caseId ? updatedCase : c),
        };
      });
    },
    updateEvidences: (evidences: EvidenceRow[]) => {
      set(state => {
        const updatedCase = {
          ...getActiveCase(state),
          evidences,
          updatedAt: new Date().toISOString(),
        };
        return {
          activeCase: updatedCase,
          cases: state.cases.map(c => c.caseId === updatedCase.caseId ? updatedCase : c),
        };
      });
    },
    addDocument: (doc: CaseDocumentArtifact | any) => {
      set(state => {
        const current = getActiveCase(state);
        const newDoc: CaseDocumentArtifact = {
          id: doc.id || 'doc_' + Date.now(),
          kind: doc.kind || 'document',
          title: doc.title || '法律書狀',
          text: doc.text || doc.documentText || '',
          status: doc.status || 'VERIFIED',
          sourceTool: doc.sourceTool || 'toolbox',
          createdAt: doc.createdAt || new Date().toISOString(),
          verification: doc.verification,
        };
        const updatedCase = {
          ...current,
          documents: [...current.documents, newDoc],
          updatedAt: new Date().toISOString(),
        };
        return {
          activeCase: updatedCase,
          cases: state.cases.map(c => c.caseId === updatedCase.caseId ? updatedCase : c),
        };
      });
    },
    saveTriage: (triageResult: any) => {
      set(state => {
        const current = getActiveCase(state);
        const updatedCase = {
          ...current,
          triageResult,
          workflowStage: 'TRIAGED' as const,
          updatedAt: new Date().toISOString(),
        };
        return {
          activeCase: updatedCase,
          cases: state.cases.map(c => c.caseId === updatedCase.caseId ? updatedCase : c),
        };
      });
    },
    saveAnalysis: (analysisResult: any) => {
      set(state => {
        const current = getActiveCase(state);
        const updatedCase = {
          ...current,
          analysisResult,
          workflowStage: 'ANALYZED' as const,
          updatedAt: new Date().toISOString(),
        };
        return {
          activeCase: updatedCase,
          cases: state.cases.map(c => c.caseId === updatedCase.caseId ? updatedCase : c),
        };
      });
    },
    saveRetrievedCitations: (citations: PrecedentItem[]) => {
      set(state => {
        const current = getActiveCase(state);
        const updatedCase = {
          ...current,
          candidateCitations: citations,
          workflowStage: 'RETRIEVED' as const,
          updatedAt: new Date().toISOString(),
        };
        return {
          activeCase: updatedCase,
          cases: state.cases.map(c => c.caseId === updatedCase.caseId ? updatedCase : c),
        };
      });
    },
    setActiveCaseId: (caseId: string) => {
      set(state => {
        const found = state.cases.find(c => c.caseId === caseId) || state.cases[0];
        return {
          activeCaseId: caseId,
          activeCase: found,
        };
      });
    },
  };
});
