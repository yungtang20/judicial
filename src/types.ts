export interface CaseOverview {
  caseNo?: string;
  caseType?: string;
  offense?: string;
  policeStation?: string;
  officers?: string;
  supervisor?: string;
  catchTime?: string;
  catchLocation?: string;
  suspectName?: string;
  suspectGender?: string;
  suspectAge?: string;
  suspectId?: string;
  suspectPhone?: string;
  suspectAddress?: string;
  suspectJob?: string;
  suspectRoleText?: string;
  victimText?: string;
  witnessText?: string;
}

export interface TimelineItem {
  time: string;
  event: string;
  location: string;
  description: string;
  tag: string;
}

export interface QAItem {
  q: string;
  a: string;
  category: string;
}

export interface EvidenceCheckItem {
  name: string;
  status: 'ATTACHED' | 'MISSING' | 'NEEDS_CHECK';
  note: string;
}

export interface ProceduralCheckItem {
  title: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  detail: string;
}

export interface LegalElementItem {
  element: string;
  fact: string;
  fulfilled: boolean;
}

export interface QuickFAQItem {
  question: string;
  answer: string;
}

export interface AnalysisResult {
  caseOverview?: CaseOverview;
  incidentSummary?: string;
  executiveSummary?: string;
  timeline?: TimelineItem[];
  interrogationQA?: QAItem[];
  evidenceChecklist?: EvidenceCheckItem[];
  proceduralVerification?: ProceduralCheckItem[];
  legalElementsAnalysis?: LegalElementItem[];
  quickFAQ?: QuickFAQItem[];
  ocrTranscription?: string;
  modelUsed?: string;
  isFallback?: boolean;
  warning?: string;
}
