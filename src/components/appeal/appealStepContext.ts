import type { ChangeEvent, RefObject } from 'react';
import type { AppealState } from '../../store/useAppealStore';
import type { CaseContext } from '../../domain/case/types';
import type { CaseStore } from '../../store/useCaseStore';
import type { CitationVerificationResult } from '../../types';
import type { LegalSearchSources } from '../../lib/twLegalRagClient';

export interface TlrSearchResult {
  doc_id?: string;
  citation_text?: string;
  result_token?: string;
  source_url?: string;
  court_name?: string;
  [key: string]: unknown;
}

export type AppealStepContext = Omit<AppealState, 'workflowContext' | 'initializeFromWorkflowContext' | 'resetForNewCase'> & {
  saveAnalysis: CaseStore['saveAnalysis'];
  addDocument: CaseStore['addDocument'];
  saveRetrievedCitations: CaseStore['saveRetrievedCitations'];
  updateCaseIssues: CaseStore['updateIssues'];
  updateCaseEvidences: CaseStore['updateEvidences'];
  markCitationFulltextRead: CaseStore['markCitationFulltextRead'];
  confirmDocument: CaseStore['confirmDocument'];
  activeCase: CaseContext;
  summaryCardRef: RefObject<HTMLDivElement | null>;
  fetchFromUrl: (targetField: 'first' | 'second') => unknown;
  handleFileUpload: (event: ChangeEvent<HTMLInputElement>, targetField?: 'first' | 'second') => void;
  handleTlrSearch: (queryOverride?: string) => Promise<void>;
  handleTlrFetchFulltext: (item: TlrSearchResult, customTargetField?: 'first' | 'second') => Promise<void>;
  handleJudicialAuth: () => Promise<void>;
  handleFetchJDocToField: (jidToFetch?: string) => Promise<void>;
  handleFetchJListInModal: () => Promise<void>;
  handleDeidentify: () => unknown;
  handleAnalyzeJudgment: (jumpToStepTwo?: boolean) => Promise<void>;
  handleSearchPrecedents: () => Promise<void>;
  handleGeneratePetition: () => Promise<void>;
  generatedDocumentId: string | null;
  petitionLegalSources: LegalSearchSources | null;
  isExternalRetrievalUsed: boolean;
  retrievalStatusMessage?: string;
  allowedCitations: string[];
  humanGateNote: string;
  setHumanGateNote: (value: string | ((previous: string) => string)) => void;
  petitionVerification?: {
    totalCitationsChecked: number;
    ghostCitationsFound: number;
    verifiedCitations: CitationVerificationResult[];
  };
  isVerifyingAi: boolean;
  verifyNotice: string | null;
  setVerifyNotice: (value: string | null) => void;
  handleFullVerify: (textToVerify?: string) => Promise<void>;
  handlePrint: () => void;
};

