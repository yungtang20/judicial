
import { create } from 'zustand';
import { IssueRow, EvidenceRow, PrecedentItem } from '../types';

const todayObj = new Date();
const todayIso = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
const todayRoc = `${todayObj.getFullYear() - 1911}年${todayObj.getMonth() + 1}月${todayObj.getDate()}日`;

export interface AppealWorkflowContext {
  scenarioKeywords?: string;
  domain?: string;
  cause?: string;
  facts?: string;
  issuesSummary?: string;
  judgmentDeliveryDate?: string;
  caseId?: string;
  workflowStateId?: string;
  issues?: IssueRow[];
  evidences?: EvidenceRow[];
}

export function mapWorkflowDomainToCaseType(
  domain?: string
): AppealState['caseType'] {
  if (domain === '刑事') return 'criminal';
  if (domain === '行政') return 'administrative';
  return 'civil';
}

export interface AppealState {
  caseId?: string;
  workflowStateId?: string;
  isFallbackMode: boolean;
  setIsFallbackMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  currentStep: number;
  setCurrentStep: (val: number | ((prev: number) => number)) => void;
  outputTab: 'petition' | 'issues_table' | 'evidences_table';
  setOutputTab: (val: 'petition' | 'issues_table' | 'evidences_table' | ((prev: 'petition' | 'issues_table' | 'evidences_table') => 'petition' | 'issues_table' | 'evidences_table')) => void;
  rawText: string;
  setRawText: (val: string | ((prev: string) => string)) => void;
  secondText: string;
  setSecondText: (val: string | ((prev: string) => string)) => void;
  isDualMode: boolean;
  setIsDualMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  isParsingPdf: boolean;
  setIsParsingPdf: (val: boolean | ((prev: boolean) => boolean)) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (val: boolean | ((prev: boolean) => boolean)) => void;
  showJudicialModal: boolean;
  setShowJudicialModal: (val: boolean | ((prev: boolean) => boolean)) => void;
  judicialModalTab: 'tlr' | 'official';
  setJudicialModalTab: (val: 'tlr' | 'official' | ((prev: 'tlr' | 'official') => 'tlr' | 'official')) => void;
  targetJudicialField: 'first' | 'second';
  setTargetJudicialField: (val: 'first' | 'second' | ((prev: 'first' | 'second') => 'first' | 'second')) => void;
  tlrQuery: string;
  setTlrQuery: (val: string | ((prev: string) => string)) => void;
  tlrSearchType: 'hybrid' | 'keyword' | 'phrase';
  setTlrSearchType: (val: 'hybrid' | 'keyword' | 'phrase' | ((prev: 'hybrid' | 'keyword' | 'phrase') => 'hybrid' | 'keyword' | 'phrase')) => void;
  tlrLoading: boolean;
  setTlrLoading: (val: boolean | ((prev: boolean) => boolean)) => void;
  tlrResults: any[];
  setTlrResults: (val: any[] | ((prev: any[]) => any[])) => void;
  tlrNote: string;
  setTlrNote: (val: string | ((prev: string) => string)) => void;
  tlrFetchingDocId: string | null;
  setTlrFetchingDocId: (val: string | null | ((prev: string | null) => string | null)) => void;
  urlFetchSuccessMsg: string;
  setUrlFetchSuccessMsg: (val: string | ((prev: string) => string)) => void;
  judicialJid: string;
  setJudicialJid: (val: string | ((prev: string) => string)) => void;
  judicialAccount: string;
  setJudicialAccount: (val: string | ((prev: string) => string)) => void;
  judicialPassword: string;
  setJudicialPassword: (val: string | ((prev: string) => string)) => void;
  judicialToken: string;
  setJudicialToken: (val: string | ((prev: string) => string)) => void;
  judicialAuthLoading: boolean;
  setJudicialAuthLoading: (val: boolean | ((prev: boolean) => boolean)) => void;
  judicialFetchLoading: boolean;
  setJudicialFetchLoading: (val: boolean | ((prev: boolean) => boolean)) => void;
  judicialMsg: string;
  setJudicialMsg: (val: string | ((prev: string) => string)) => void;
  jlistData: Array<{ date: string; list: string[] }>;
  setJlistData: (val: Array<{ date: string; list: string[] }> | ((prev: Array<{ date: string; list: string[] }>) => Array<{ date: string; list: string[] }>)) => void;
  jlistLoading: boolean;
  setJlistLoading: (val: boolean | ((prev: boolean) => boolean)) => void;
  caseType: 'civil' | 'criminal' | 'administrative' | 'criminal_compensation';
  setCaseType: (val: 'civil' | 'criminal' | 'administrative' | 'criminal_compensation' | ((prev: 'civil' | 'criminal' | 'administrative' | 'criminal_compensation') => 'civil' | 'criminal' | 'administrative' | 'criminal_compensation')) => void;
  courtName: string;
  setCourtName: (val: string | ((prev: string) => string)) => void;
  appealCourtName: string;
  setAppealCourtName: (val: string | ((prev: string) => string)) => void;
  caseNo: string;
  setCaseNo: (val: string | ((prev: string) => string)) => void;
  sectionCode: string;
  setSectionCode: (val: string | ((prev: string) => string)) => void;
  claimAmount: string;
  setClaimAmount: (val: string | ((prev: string) => string)) => void;
  deliveryDate: string;
  setDeliveryDate: (val: string | ((prev: string) => string)) => void;
  travelDays: number;
  setTravelDays: (val: number | ((prev: number) => number)) => void;
  appellantRole: string;
  setAppellantRole: (val: string | ((prev: string) => string)) => void;
  appellantName: string;
  setAppellantName: (val: string | ((prev: string) => string)) => void;
  appellantId: string;
  setAppellantId: (val: string | ((prev: string) => string)) => void;
  appellantAddress: string;
  setAppellantAddress: (val: string | ((prev: string) => string)) => void;
  appellantPhone: string;
  setAppellantPhone: (val: string | ((prev: string) => string)) => void;
  appellantLegalRep: string;
  setAppellantLegalRep: (val: string | ((prev: string) => string)) => void;
  appelleeRole: string;
  setAppelleeRole: (val: string | ((prev: string) => string)) => void;
  appelleeName: string;
  setAppelleeName: (val: string | ((prev: string) => string)) => void;
  appelleeId: string;
  setAppelleeId: (val: string | ((prev: string) => string)) => void;
  appelleeAddress: string;
  setAppelleeAddress: (val: string | ((prev: string) => string)) => void;
  deliveryAgent: string;
  setDeliveryAgent: (val: string | ((prev: string) => string)) => void;
  deliveryAddress: string;
  setDeliveryAddress: (val: string | ((prev: string) => string)) => void;
  claims: string;
  setClaims: (val: string | ((prev: string) => string)) => void;
  attachmentText: string;
  setAttachmentText: (val: string | ((prev: string) => string)) => void;
  tableCourtName: string;
  setTableCourtName: (val: string | ((prev: string) => string)) => void;
  tableYear: string;
  setTableYear: (val: string | ((prev: string) => string)) => void;
  tableWord: string;
  setTableWord: (val: string | ((prev: string) => string)) => void;
  tableNo: string;
  setTableNo: (val: string | ((prev: string) => string)) => void;
  tableSubmitter: string;
  setTableSubmitter: (val: string | ((prev: string) => string)) => void;
  tableSubmitDate: string;
  setTableSubmitDate: (val: string | ((prev: string) => string)) => void;
  issues: IssueRow[];
  setIssues: (val: IssueRow[] | ((prev: IssueRow[]) => IssueRow[])) => void;
  evidences: EvidenceRow[];
  setEvidences: (val: EvidenceRow[] | ((prev: EvidenceRow[]) => EvidenceRow[])) => void;
  keywords: string;
  setKeywords: (val: string | ((prev: string) => string)) => void;
  isSearchingPrecedents: boolean;
  setIsSearchingPrecedents: (val: boolean | ((prev: boolean) => boolean)) => void;
  precedents: PrecedentItem[];
  setPrecedents: (val: PrecedentItem[] | ((prev: PrecedentItem[]) => PrecedentItem[])) => void;
  firstUrl: string;
  setFirstUrl: (val: string | ((prev: string) => string)) => void;
  secondUrl: string;
  setSecondUrl: (val: string | ((prev: string) => string)) => void;
  isFetchingUrl: boolean;
  setIsFetchingUrl: (val: boolean | ((prev: boolean) => boolean)) => void;
  isGeneratingPetition: boolean;
  setIsGeneratingPetition: (val: boolean | ((prev: boolean) => boolean)) => void;
  generatedPetition: string;
  setGeneratedPetition: (val: string | ((prev: string) => string)) => void;
  appealEligibility: 'ALLOWED' | 'RESTRICTED' | 'FORBIDDEN';
  setAppealEligibility: (val: 'ALLOWED' | 'RESTRICTED' | 'FORBIDDEN' | ((prev: 'ALLOWED' | 'RESTRICTED' | 'FORBIDDEN') => 'ALLOWED' | 'RESTRICTED' | 'FORBIDDEN')) => void;
  eligibilityStatusTitle: string;
  setEligibilityStatusTitle: (val: string | ((prev: string) => string)) => void;
  eligibilityReason: string;
  setEligibilityReason: (val: string | ((prev: string) => string)) => void;
  proceduralRequirements: string;
  setProceduralRequirements: (val: string | ((prev: string) => string)) => void;
  judgmentSummary: {
    overview?: string;
    storyNarrative?: string;
    evidenceBasis?: string | {
      witnesses?: string[];
      documents?: string[];
      physicalAndExpert?: string[];
    };
    mainHolding?: string;
  } | null;
  setJudgmentSummary: (val: {
    overview?: string;
    storyNarrative?: string;
    evidenceBasis?: string | {
      witnesses?: string[];
      documents?: string[];
      physicalAndExpert?: string[];
    };
    mainHolding?: string;
  } | null | ((prev: {
    overview?: string;
    storyNarrative?: string;
    evidenceBasis?: string | {
      witnesses?: string[];
      documents?: string[];
      physicalAndExpert?: string[];
    };
    mainHolding?: string;
  } | null) => {
    overview?: string;
    storyNarrative?: string;
    evidenceBasis?: string | {
      witnesses?: string[];
      documents?: string[];
      physicalAndExpert?: string[];
    };
    mainHolding?: string;
  } | null)) => void;
  isAnalyzingSummaryOnly: boolean;
  setIsAnalyzingSummaryOnly: (val: boolean | ((prev: boolean) => boolean)) => void;
  showSummaryInStep2: boolean;
  setShowSummaryInStep2: (val: boolean | ((prev: boolean) => boolean)) => void;
  workflowContext: AppealWorkflowContext | null;
  initializeFromWorkflowContext: (context: AppealWorkflowContext) => void;
  resetForNewCase: () => void;
}

const createInitialAppealData = () => ({
  caseId: undefined,
  workflowStateId: undefined,
  isFallbackMode: false,
  currentStep: 1,
  outputTab: 'petition' as const,
  rawText: '',
  secondText: '',
  isDualMode: false,
  isParsingPdf: false,
  isAnalyzing: false,
  showJudicialModal: false,
  judicialModalTab: 'tlr' as const,
  targetJudicialField: 'first' as const,
  tlrQuery: '',
  tlrSearchType: 'hybrid' as const,
  tlrLoading: false,
  tlrResults: [],
  tlrNote: '',
  tlrFetchingDocId: null,
  urlFetchSuccessMsg: '',
  judicialJid: '',
  judicialAccount: '',
  judicialPassword: '',
  judicialToken: '',
  judicialAuthLoading: false,
  judicialFetchLoading: false,
  judicialMsg: '',
  jlistData: [],
  jlistLoading: false,
  caseType: 'civil' as const,
  courtName: '',
  appealCourtName: '',
  caseNo: '',
  sectionCode: '',
  claimAmount: '',
  deliveryDate: todayIso,
  travelDays: 0,
  appellantRole: '上訴人',
  appellantName: '',
  appellantId: '',
  appellantAddress: '',
  appellantPhone: '',
  appellantLegalRep: '',
  appelleeRole: '被上訴人',
  appelleeName: '',
  appelleeId: '',
  appelleeAddress: '',
  deliveryAgent: '',
  deliveryAddress: '',
  claims: '',
  attachmentText: '附件',
  tableCourtName: '',
  tableYear: '',
  tableWord: '',
  tableNo: '',
  tableSubmitter: '',
  tableSubmitDate: '',
  issues: [],
  evidences: [],
  keywords: '',
  isSearchingPrecedents: false,
  precedents: [],
  firstUrl: '',
  secondUrl: '',
  isFetchingUrl: false,
  isGeneratingPetition: false,
  generatedPetition: '',
  appealEligibility: 'ALLOWED' as const,
  eligibilityStatusTitle: '🟢 依法准予提起上訴',
  eligibilityReason: '本案屬第一審判決，當事人於 20 日不變期間內得依法提起第二審上訴。',
  proceduralRequirements: '應於收受判決後 20 日內向原審法院提出上訴狀，並具體記載上訴理由。',
  judgmentSummary: null,
  isAnalyzingSummaryOnly: false,
  showSummaryInStep2: true,

  workflowContext: null
});

export const useAppealStore = create<AppealState>((set) => ({
  ...createInitialAppealData(),

  setIsFallbackMode: (val) => set((state) => ({ isFallbackMode: typeof val === 'function' ? (val as any)(state.isFallbackMode) : val })),
  setCurrentStep: (val) => set((state) => ({ currentStep: typeof val === 'function' ? (val as any)(state.currentStep) : val })),
  setOutputTab: (val) => set((state) => ({ outputTab: typeof val === 'function' ? (val as any)(state.outputTab) : val })),
  setRawText: (val) => set((state) => ({ rawText: typeof val === 'function' ? (val as any)(state.rawText) : val })),
  setSecondText: (val) => set((state) => ({ secondText: typeof val === 'function' ? (val as any)(state.secondText) : val })),
  setIsDualMode: (val) => set((state) => ({ isDualMode: typeof val === 'function' ? (val as any)(state.isDualMode) : val })),
  setIsParsingPdf: (val) => set((state) => ({ isParsingPdf: typeof val === 'function' ? (val as any)(state.isParsingPdf) : val })),
  setIsAnalyzing: (val) => set((state) => ({ isAnalyzing: typeof val === 'function' ? (val as any)(state.isAnalyzing) : val })),
  setShowJudicialModal: (val) => set((state) => ({ showJudicialModal: typeof val === 'function' ? (val as any)(state.showJudicialModal) : val })),
  setJudicialModalTab: (val) => set((state) => ({ judicialModalTab: typeof val === 'function' ? (val as any)(state.judicialModalTab) : val })),
  setTargetJudicialField: (val) => set((state) => ({ targetJudicialField: typeof val === 'function' ? (val as any)(state.targetJudicialField) : val })),
  setTlrQuery: (val) => set((state) => ({ tlrQuery: typeof val === 'function' ? (val as any)(state.tlrQuery) : val })),
  setTlrSearchType: (val) => set((state) => ({ tlrSearchType: typeof val === 'function' ? (val as any)(state.tlrSearchType) : val })),
  setTlrLoading: (val) => set((state) => ({ tlrLoading: typeof val === 'function' ? (val as any)(state.tlrLoading) : val })),
  setTlrResults: (val) => set((state) => ({ tlrResults: typeof val === 'function' ? (val as any)(state.tlrResults) : val })),
  setTlrNote: (val) => set((state) => ({ tlrNote: typeof val === 'function' ? (val as any)(state.tlrNote) : val })),
  setTlrFetchingDocId: (val) => set((state) => ({ tlrFetchingDocId: typeof val === 'function' ? (val as any)(state.tlrFetchingDocId) : val })),
  setUrlFetchSuccessMsg: (val) => set((state) => ({ urlFetchSuccessMsg: typeof val === 'function' ? (val as any)(state.urlFetchSuccessMsg) : val })),
  setJudicialJid: (val) => set((state) => ({ judicialJid: typeof val === 'function' ? (val as any)(state.judicialJid) : val })),
  setJudicialAccount: (val) => set((state) => ({ judicialAccount: typeof val === 'function' ? (val as any)(state.judicialAccount) : val })),
  setJudicialPassword: (val) => set((state) => ({ judicialPassword: typeof val === 'function' ? (val as any)(state.judicialPassword) : val })),
  setJudicialToken: (val) => set((state) => ({ judicialToken: typeof val === 'function' ? (val as any)(state.judicialToken) : val })),
  setJudicialAuthLoading: (val) => set((state) => ({ judicialAuthLoading: typeof val === 'function' ? (val as any)(state.judicialAuthLoading) : val })),
  setJudicialFetchLoading: (val) => set((state) => ({ judicialFetchLoading: typeof val === 'function' ? (val as any)(state.judicialFetchLoading) : val })),
  setJudicialMsg: (val) => set((state) => ({ judicialMsg: typeof val === 'function' ? (val as any)(state.judicialMsg) : val })),
  setJlistData: (val) => set((state) => ({ jlistData: typeof val === 'function' ? (val as any)(state.jlistData) : val })),
  setJlistLoading: (val) => set((state) => ({ jlistLoading: typeof val === 'function' ? (val as any)(state.jlistLoading) : val })),
  setCaseType: (val) => set((state) => ({ caseType: typeof val === 'function' ? (val as any)(state.caseType) : val })),
  setCourtName: (val) => set((state) => ({ courtName: typeof val === 'function' ? (val as any)(state.courtName) : val })),
  setAppealCourtName: (val) => set((state) => ({ appealCourtName: typeof val === 'function' ? (val as any)(state.appealCourtName) : val })),
  setCaseNo: (val) => set((state) => ({ caseNo: typeof val === 'function' ? (val as any)(state.caseNo) : val })),
  setSectionCode: (val) => set((state) => ({ sectionCode: typeof val === 'function' ? (val as any)(state.sectionCode) : val })),
  setClaimAmount: (val) => set((state) => ({ claimAmount: typeof val === 'function' ? (val as any)(state.claimAmount) : val })),
  setDeliveryDate: (val) => set((state) => ({ deliveryDate: typeof val === 'function' ? (val as any)(state.deliveryDate) : val })),
  setTravelDays: (val) => set((state) => ({ travelDays: typeof val === 'function' ? (val as any)(state.travelDays) : val })),
  setAppellantRole: (val) => set((state) => ({ appellantRole: typeof val === 'function' ? (val as any)(state.appellantRole) : val })),
  setAppellantName: (val) => set((state) => ({ appellantName: typeof val === 'function' ? (val as any)(state.appellantName) : val })),
  setAppellantId: (val) => set((state) => ({ appellantId: typeof val === 'function' ? (val as any)(state.appellantId) : val })),
  setAppellantAddress: (val) => set((state) => ({ appellantAddress: typeof val === 'function' ? (val as any)(state.appellantAddress) : val })),
  setAppellantPhone: (val) => set((state) => ({ appellantPhone: typeof val === 'function' ? (val as any)(state.appellantPhone) : val })),
  setAppellantLegalRep: (val) => set((state) => ({ appellantLegalRep: typeof val === 'function' ? (val as any)(state.appellantLegalRep) : val })),
  setAppelleeRole: (val) => set((state) => ({ appelleeRole: typeof val === 'function' ? (val as any)(state.appelleeRole) : val })),
  setAppelleeName: (val) => set((state) => ({ appelleeName: typeof val === 'function' ? (val as any)(state.appelleeName) : val })),
  setAppelleeId: (val) => set((state) => ({ appelleeId: typeof val === 'function' ? (val as any)(state.appelleeId) : val })),
  setAppelleeAddress: (val) => set((state) => ({ appelleeAddress: typeof val === 'function' ? (val as any)(state.appelleeAddress) : val })),
  setDeliveryAgent: (val) => set((state) => ({ deliveryAgent: typeof val === 'function' ? (val as any)(state.deliveryAgent) : val })),
  setDeliveryAddress: (val) => set((state) => ({ deliveryAddress: typeof val === 'function' ? (val as any)(state.deliveryAddress) : val })),
  setClaims: (val) => set((state) => ({ claims: typeof val === 'function' ? (val as any)(state.claims) : val })),
  setAttachmentText: (val) => set((state) => ({ attachmentText: typeof val === 'function' ? (val as any)(state.attachmentText) : val })),
  setTableCourtName: (val) => set((state) => ({ tableCourtName: typeof val === 'function' ? (val as any)(state.tableCourtName) : val })),
  setTableYear: (val) => set((state) => ({ tableYear: typeof val === 'function' ? (val as any)(state.tableYear) : val })),
  setTableWord: (val) => set((state) => ({ tableWord: typeof val === 'function' ? (val as any)(state.tableWord) : val })),
  setTableNo: (val) => set((state) => ({ tableNo: typeof val === 'function' ? (val as any)(state.tableNo) : val })),
  setTableSubmitter: (val) => set((state) => ({ tableSubmitter: typeof val === 'function' ? (val as any)(state.tableSubmitter) : val })),
  setTableSubmitDate: (val) => set((state) => ({ tableSubmitDate: typeof val === 'function' ? (val as any)(state.tableSubmitDate) : val })),
  setIssues: (val) => set((state) => ({ issues: typeof val === 'function' ? (val as any)(state.issues) : val })),
  setEvidences: (val) => set((state) => ({ evidences: typeof val === 'function' ? (val as any)(state.evidences) : val })),
  setKeywords: (val) => set((state) => ({ keywords: typeof val === 'function' ? (val as any)(state.keywords) : val })),
  setIsSearchingPrecedents: (val) => set((state) => ({ isSearchingPrecedents: typeof val === 'function' ? (val as any)(state.isSearchingPrecedents) : val })),
  setPrecedents: (val) => set((state) => ({ precedents: typeof val === 'function' ? (val as any)(state.precedents) : val })),
  setFirstUrl: (val) => set((state) => ({ firstUrl: typeof val === 'function' ? (val as any)(state.firstUrl) : val })),
  setSecondUrl: (val) => set((state) => ({ secondUrl: typeof val === 'function' ? (val as any)(state.secondUrl) : val })),
  setIsFetchingUrl: (val) => set((state) => ({ isFetchingUrl: typeof val === 'function' ? (val as any)(state.isFetchingUrl) : val })),
  setIsGeneratingPetition: (val) => set((state) => ({ isGeneratingPetition: typeof val === 'function' ? (val as any)(state.isGeneratingPetition) : val })),
  setGeneratedPetition: (val) => set((state) => ({ generatedPetition: typeof val === 'function' ? (val as any)(state.generatedPetition) : val })),
  setAppealEligibility: (val) => set((state) => ({ appealEligibility: typeof val === 'function' ? (val as any)(state.appealEligibility) : val })),
  setEligibilityStatusTitle: (val) => set((state) => ({ eligibilityStatusTitle: typeof val === 'function' ? (val as any)(state.eligibilityStatusTitle) : val })),
  setEligibilityReason: (val) => set((state) => ({ eligibilityReason: typeof val === 'function' ? (val as any)(state.eligibilityReason) : val })),
  setProceduralRequirements: (val) => set((state) => ({ proceduralRequirements: typeof val === 'function' ? (val as any)(state.proceduralRequirements) : val })),
  setJudgmentSummary: (val) => set((state) => ({ judgmentSummary: typeof val === 'function' ? (val as any)(state.judgmentSummary) : val })),
  setIsAnalyzingSummaryOnly: (val) => set((state) => ({ isAnalyzingSummaryOnly: typeof val === 'function' ? (val as any)(state.isAnalyzingSummaryOnly) : val })),
  setShowSummaryInStep2: (val) => set((state) => ({ showSummaryInStep2: typeof val === 'function' ? (val as any)(state.showSummaryInStep2) : val })),
  resetForNewCase: () => set({ ...createInitialAppealData(), caseId: `new-case-${Date.now()}` }),
  initializeFromWorkflowContext: (context) => set((state) => {
    const nextCaseId = context.caseId ?? state.caseId;
    const nextWorkflowStateId = context.workflowStateId ?? state.workflowStateId;
    const identityChanged = Boolean(context.caseId || context.workflowStateId) && (
      state.caseId !== nextCaseId || state.workflowStateId !== nextWorkflowStateId
    );
    const base = identityChanged ? createInitialAppealData() : {};
    return {
      ...base,
      caseId: nextCaseId,
      workflowStateId: nextWorkflowStateId,
      workflowContext: context,
      issues: context.issues ?? (identityChanged ? [] : state.issues),
      evidences: context.evidences ?? (identityChanged ? [] : state.evidences),
      ...(context.domain ? { caseType: mapWorkflowDomainToCaseType(context.domain) } : {}),
      ...(context.judgmentDeliveryDate ? { deliveryDate: context.judgmentDeliveryDate } : {})
    };
  }),

}));
