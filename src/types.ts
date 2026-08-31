/**
 * Core type definitions for Smart Appeal Assistant.
 */

/**
 * Represents the factual overview extracted from a judgment.
 */
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

/**
 * A chronological event within the factual summary.
 */
export interface TimelineItem {
  time: string;
  event: string;
  location: string;
  description: string;
  tag: string;
}

/**
 * Q&A extraction from interrogations or court debates.
 */
export interface QAItem {
  q: string;
  a: string;
  category: string;
}

/**
 * Validates the presence and strength of evidence.
 */
export interface EvidenceCheckItem {
  name: string;
  status: 'ATTACHED' | 'MISSING' | 'NEEDS_CHECK';
  note: string;
}

/**
 * Checks for procedural defects (e.g., missed deadlines, jurisdictional errors).
 */
export interface ProceduralCheckItem {
  title: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  detail: string;
}

/**
 * Maps factual findings to legal elements (constituent elements of an offense).
 */
export interface LegalElementItem {
  element: string;
  fact: string;
  fulfilled: boolean;
}

/**
 * Quick FAQ generated for the user based on the judgment.
 */
export interface QuickFAQItem {
  question: string;
  answer: string;
}

/**
 * The consolidated result payload returned by the AI analysis API.
 */
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
  antiGhostVerification?: {
    totalCitationsChecked: number;
    ghostCitationsFound: number;
    verifiedCitations: CitationVerificationResult[];
  };
}

export interface IssueRow {
    id: string;
    issueType?: string;
    title: string;
    originalHolding: string;
    appealArgument: string;
    relatedEvidenceCodes?: string;
    legalBasis?: string;
    legalStrength?: 'HIGH' | 'MEDIUM' | 'NEED_SUPPLEMENT';
}

export interface EvidenceRow {
    id: string;
    code: string;
    relatedIssue: string;
    investigationItem: string;
    investigationTarget: string;
    targetAddress: string;
    provenFact: string;
    type?: string;
    target?: string;
    method?: string;
    holder?: string;
    necessity?: string;
    note?: string;
    relatedIssueTitle?: string;
}

export interface PrecedentItem {
    id: string;
    type: string;
    citation: string;
    summary: string;
    applicationReason: string;
    selected: boolean;
}

/**
 * Types for AI Litigation Defense & Client Dual-Track Workflow
 * (B-Point Triage -> Track 1 Lawyer Track vs Phase 2 Communication -> G-Point -> Phase 3 Personal Report Track with 6-Mine Scan)
 */
export type BPointDecision = 'TRACK_1_FACTS' | 'PHASE_2_COMMUNICATION';
export type GPointDecision = 'COOPERATE' | 'INSIST_SUBMIT';

export interface ConcreteFactItem {
  id: string;
  category: 'PEOPLE' | 'TIME' | 'LOCATION' | 'DOCUMENT' | 'ACTION';
  factDescription: string;
  involvedParties: string;
  timeframe: string;
  location: string;
  evidenceClues: string;
  pendingProof: string;
  strategicValue: 'HIGH' | 'MEDIUM' | 'SUPPORTING';
}

export interface UnfruitfulPointItem {
  id: string;
  point: string;
  issueType: 'EMOTIONAL_VENT' | 'LEGAL_COPYPASTE' | 'TRIVIAL_DISPUTE' | 'UNSUBSTANTIATED_ASSUMPTION';
  whyUnfruitful: string;
  judgePerspectiveRisk: string;
}

export interface QuestionnaireItem {
  qId: number;
  title: string;
  question: string;
  targetFact: string;
  guideNote: string;
  suggestedAttachment: string;
  clientAnswer?: string;
}

export interface AdmissionMineItem {
  id: string;
  mineType: 
    | 'DEBT_OR_PAYMENT_ADMISSION'       // 1. 誤認債務成立/未抗辯即認收受款項
    | 'PRESCRIPTION_WAIVER_ADMISSION'   // 2. 時效完成前/後之無保留債務承認
    | 'EXECUTION_OR_SIGNATURE_GENUINE'  // 3. 逕認簽名/印章真正而失卻爭執權
    | 'PRESENCE_OR_CONCURRENCE'         // 4. 自認關鍵時點在場/共同參與
    | 'DUTY_OR_BREACH_ADMISSION'        // 5. 誤認自身過失/違約事實
    | 'NOTICE_OR_KNOWLEDGE_ADMISSION';  // 6. 自認受領通知/知悉情事逾除斥期間
  mineName: string;
  riskLevel: 'FATAL_ADMISSION' | 'HIGH_RISK' | 'TACTICAL_DEFECT';
  triggerQuote: string;
  legalTrap: string;
  articleBasis: string;
  potentialConsequence: string;
  modificationSuggestion: string;
}

export interface DefenseTriageResult {
  decision: BPointDecision;
  confidenceScore: number;
  decisionReason: string;
  concreteFacts: ConcreteFactItem[];
  unfruitfulPoints: UnfruitfulPointItem[];
  summaryOverview: string;
  // Phase 2 items
  section1EvidenceRiskAssessment?: string;
  section2LawyerAdvice?: string;
  section3Questionnaire?: QuestionnaireItem[];
  modelUsed?: string;
  isFallback?: boolean;
}

export interface MineScanResult {
  hasFatalMines: boolean;
  totalMinesCount: number;
  overallRiskSummary: string;
  mines: AdmissionMineItem[];
  cleanedTextSuggestion: string;
  modelUsed?: string;
  isFallback?: boolean;
}

export interface GeneratedPleadingResult {
  pleadingType: 'LAWYER_PLEADING' | 'CLIENT_PERSONAL_REPORT';
  title: string;
  courtName: string;
  caseNo: string;
  submitter: string;
  pleadingText: string;
  disclaimer: string;
  signatoryRole: string;
  modelUsed?: string;
  isFallback?: boolean;
  antiGhostVerification?: {
    totalCitationsChecked: number;
    ghostCitationsFound: number;
    verifiedCitations: CitationVerificationResult[];
  };
}

/**
 * Types for Legal Tools Hub & Anti-Hallucination Citation Verifier
 */
export interface CitationVerificationResult {
  verified: boolean;
  citationText: string;
  type: 'STATUTE' | 'PRECEDENT' | 'SUPREME_COURT_RULING' | 'UNKNOWN';
  officialTitle: string;
  officialSourceUrl: string;
  isGhostOrFake: boolean;
  hallucinationRisk: 'SAFE_VERIFIED' | 'SUSPICIOUS_NUMBERING' | 'FAKE_GHOST_CITATION';
  correctionSuggestion?: string;
  officialSnippet?: string;
}

export interface LegalToolboxResult {
  toolCategory: string;
  title: string;
  documentText: string;
  calculationSummary?: Record<string, any>;
  complianceChecklist: {
    rule: string;
    passed: boolean;
    detail: string;
  }[];
  antiGhostVerification: {
    totalCitationsChecked: number;
    ghostCitationsFound: number;
    verifiedCitations: CitationVerificationResult[];
  };
  disclaimer: string;
  modelUsed?: string;
}

export interface RealStatuteDatabaseItem {
  lawName: string;
  article: string;
  maxParagraphs: number;
  keywords: string[];
  officialSummary: string;
}

export interface RealPrecedentDatabaseItem {
  caseYear: string;
  court: string;
  caseWord: string;
  caseNum: string;
  fullCitation: string;
  holdingSummary: string;
  legalKeywords: string[];
  officialJudicialUrl: string;
}


