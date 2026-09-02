export interface JudgmentMetadata {
  court: string;
  caseNo: string;
  sys: string;
  reason: string;
  date: string;
  relatedStatutes?: string[];
}

export interface JudgmentChunk {
  id: string;
  judgmentId: string;
  metadata: JudgmentMetadata;
  section: "主文" | "事實" | "理由" | "要旨" | "全文";
  content: string;
  embedding?: number[];
}

export interface JudgmentRetrievalFilter {
  courtLevels?: string[];
  sys?: "刑事" | "民事" | "行政";
  dateRange?: { start: string; end: string };
}
