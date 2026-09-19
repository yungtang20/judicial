/**
/**
 * Global TypeScript definitions shared across the smart legal assistant.
 */

export interface IssueRow {
  id: string;
  originalHolding?: string;
  judgmentPoint?: string;
  appealedReason?: string;
  targetPoint?: string;
  statutes?: string;
  precedentSupport?: string;
  isCustom?: boolean;
}

export interface EvidenceRow {
  id: string;
  name: string;
  source?: string;
  proves?: string;
  method?: string;
  targetIssueId?: string;
}

export interface PrecedentItem {
  id: string;
  court: string;
  year: string;
  caseWord: string;
  caseNum: string;
  title?: string;
  fullCitation?: string;
  summary?: string;
  holding?: string;
  officialJudicialUrl?: string;
  confidenceScore?: number;
  selected?: boolean;
}

export type HallucinationRisk = 'SAFE_VERIFIED' | 'SUSPICIOUS_NUMBERING' | 'UNVERIFIABLE_CITATION' | 'GHOST_CITATION';
export type VerificationStatus = 'VERIFIED' | 'REJECTED' | 'UNCHECKED' | 'WARNING';

export interface CitationVerificationResult {
  verified: boolean;
  citationText: string;
  type?: 'STATUTE' | 'PRECEDENT' | 'INTERPRETATION' | 'RESOLUTION' | 'OTHER';
  legalClaim?: string;
  claimSupportStatus?: 'SUPPORTED' | 'UNSUPPORTED' | 'NEEDS_REVIEW';
  officialTitle?: string;
  officialSourceUrl?: string;
  isGhostOrFake: boolean;
  hallucinationRisk?: HallucinationRisk;
  verificationStatus?: VerificationStatus;
  correctionSuggestion?: string;
  officialSnippet?: string;
  holdingSummary?: string;
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

export interface LegalToolboxResult {
  documentText: string;
  pleadingDeliveryAuthorization?: any;
  verification?: {
    totalCitationsChecked: number;
    ghostCitationsFound: number;
    verifiedCitations: CitationVerificationResult[];
  };
  metadata?: Record<string, any>;
}

export type BPointDecision = 'TRACK_1_FACTS' | 'TRACK_2_EMPTY';
export type GPointDecision = 'G1_PROCEED' | 'G2_SUPPLEMENT' | 'G3_CLARIFY';

export interface ConcreteFactItem {
  id: string;
  content: string;
  relevance?: string;
}

export interface UnfruitfulPointItem {
  id: string;
  content: string;
  flawReason?: string;
}

export interface DefenseTriageResult {
  decision: BPointDecision;
  reason: string;
  concreteFacts: ConcreteFactItem[];
  unfruitfulPoints: UnfruitfulPointItem[];
}

export interface AdmissionMineItem {
  id: string;
  quote: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  dangerReason: string;
  mitigation: string;
}

export interface MineScanResult {
  hasMines: boolean;
  riskScore: number;
  admissionMines: AdmissionMineItem[];
  recommendations: string[];
}

export interface QuestionnaireItem {
  id: string;
  question: string;
  answer?: string;
  required?: boolean;
}

export interface GeneratedPleadingResult {
  pleadingText: string;
  metadata?: Record<string, any>;
  verification?: {
    totalCitationsChecked: number;
    ghostCitationsFound: number;
    verifiedCitations: CitationVerificationResult[];
  };
  deliveryAllowed?: boolean;
  gatePassed?: boolean;
}
