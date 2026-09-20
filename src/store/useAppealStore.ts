
import { create } from 'zustand';
import { IssueRow, EvidenceRow, PrecedentItem } from '../types';

const todayObj = new Date();
const todayIso = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
const todayRoc = `${todayObj.getFullYear() - 1911}年${todayObj.getMonth() + 1}月${todayObj.getDate()}日`;

export interface AppealState {
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
}

export const useAppealStore = create<AppealState>((set) => ({
  isFallbackMode: false,
  currentStep: 1,
  outputTab: 'petition',
  rawText: '',
  secondText: '',
  isDualMode: false,
  isParsingPdf: false,
  isAnalyzing: false,
  showJudicialModal: false,
  judicialModalTab: 'tlr',
  targetJudicialField: 'first',
  tlrQuery: '',
  tlrSearchType: 'hybrid',
  tlrLoading: false,
  tlrResults: [],
  tlrNote: '',
  tlrFetchingDocId: null,
  urlFetchSuccessMsg: '',
  judicialJid: 'CHDM,105,交訴,51,20161216,1',
  judicialAccount: '',
  judicialPassword: '',
  judicialToken: '',
  judicialAuthLoading: false,
  judicialFetchLoading: false,
  judicialMsg: '',
  jlistData: [],
  jlistLoading: false,
  caseType: 'civil',
  courtName: '臺灣臺北地方法院',
  appealCourtName: '臺灣高等法院',
  caseNo: '113年度訴字第1234號',
  sectionCode: '平股',
  claimAmount: '新臺幣 500,000 元',
  deliveryDate: todayIso,
  travelDays: 0,
  appellantRole: '上訴人',
  appellantName: '王小明',
  appellantId: 'A123456789',
  appellantAddress: '臺北市中正區重慶南路一段 124 號',
  appellantPhone: '0912-345-678',
  appellantLegalRep: '',
  appelleeRole: '被上訴人',
  appelleeName: '陳大華',
  appelleeId: 'B987654321',
  appelleeAddress: '新北市板橋區縣民大道二段 7 號',
  deliveryAgent: '',
  deliveryAddress: '',
  claims: '一、原判決廢棄。\n二、上開廢棄部分，被上訴人在第一審之訴及假執行之聲請均駁回。\n三、第一、二審訴訟費用由被上訴人負擔。',
  attachmentText: '附件',
  tableCourtName: '臺灣高等法院',
  tableYear: '112',
  tableWord: '重上',
  tableNo: '123',
  tableSubmitter: '上訴人 王小明',
  tableSubmitDate: todayRoc,
  issues: [
    {
      id: '1',
      issueType: '事實認定瑕疵',
      title: '爭點一：原審判決就兩造間借貸契約之成立，認定事實顯有違背經驗法則',
      originalHolding: '原審判決僅憑單方匯款單即認定成立消費借貸契約。',
      appealArgument: '上訴人匯款實係清償先前欠款，且被上訴人未能提出借貸對話紀錄或借據，原審舉證責任分配顯有違誤。',
      relatedEvidenceCodes: '1',
      legalBasis: '最高法院18年上字第2855號判例',
      legalStrength: 'HIGH'
    }
  ],
  evidences: [
    {
      id: '1',
      code: '1',
      relatedIssue: '爭點一：兩造間消費借貸關係成立與否',
      investigationItem: '訊問證人 / 函調對話紀錄與銀行明細',
      investigationTarget: '證人 張○○ / 國泰世華商業銀行大甲分行',
      targetAddress: '臺中市大甲區平安路100號（詳卷內通訊錄）',
      provenFact: '證明上訴人匯款實係清償過往舊債，被上訴人並無借貸合意。',
      type: '人證',
      target: '證人 張○○',
      method: '訊問證人到庭具結備詢',
      holder: '臺中市大甲區平安路100號'
    }
  ],
  keywords: '簡易判決上訴 量刑適法性 違背經驗法則 事實認定不憑證據',
  isSearchingPrecedents: false,
  precedents: [
    {
      id: 'p1',
      type: '最高法院裁判',
      citation: '最高法院 99 年度台上字第 700 號 刑事判決',
      summary: '按數行為於密接時間地點實行，侵害同一法益，各行為獨立性極為薄弱，在刑法評價上以視為數個舉動之接續施行，合為包括之一行為，屬接續犯。',
      applicationReason: '用以論駁原審認定數次行為之罪數與接續犯評價過重或過輕之法律適用疑義。',
      selected: true
    },
    {
      id: 'p2',
      type: '最高法院刑事判例',
      citation: '最高法院 76 年台上字第 4986 號 刑事判例',
      summary: '認定犯罪事實所憑之證據，須於通常一般之人均不致有所懷疑，而得確信其為真實之程度者，始得據為有罪之認定。倘其證明尚未達到此一程度，而有合理之懷疑存在時，即應為被告有利之認定。',
      applicationReason: '用以指摘原審採認證據未達超越合理懷疑程度，違反刑事訴訟法第 154 條第 2 項無罪推定原則。',
      selected: true
    }
  ],
  firstUrl: '',
  secondUrl: '',
  isFetchingUrl: false,
  isGeneratingPetition: false,
  generatedPetition: '',
  appealEligibility: 'ALLOWED',
  eligibilityStatusTitle: '🟢 依法准予提起上訴',
  eligibilityReason: '本案屬第一審判決，當事人於 20 日不變期間內得依法提起第二審上訴。',
  proceduralRequirements: '應於收受判決後 20 日內向原審法院提出上訴狀，並具體記載上訴理由。',
  judgmentSummary: null,
  isAnalyzingSummaryOnly: false,
  showSummaryInStep2: true,

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

}));
