import { LegalSourceItem, LegalSearchSources } from "../../src/lib/twLegalRagClient.js";

export type LegalDocType = 'statute' | 'interpretation';

export interface LegalKnowledgeItem {
  id: string;
  type: LegalDocType;
  /**
   * 官方標準引用格式，例如：「民法第184條第1項」或「法務部法律字第10803512340號函」
   */
  citation: string;
  /**
   * 法規名稱或函釋名稱
   */
  name: string;
  /**
   * 條號或字號
   */
  articleOrCaseNo: string;
  /**
   * 條文標題或函釋主旨
   */
  title: string;
  /**
   * 條文全文或函釋內容
   */
  content: string;
  /**
   * 發文字號或公布日期 (YYYY-MM-DD)
   */
  date?: string;
  /**
   * 發布或主管機關（例如：法務部、司法院、內政部）
   */
  authority?: string;
  /**
   * 官方網址或法規資料庫連結
   */
  sourceUrl?: string;
  /**
   * 關鍵字標籤，輔助快速過濾
   */
  keywords?: string[];
  /**
   * 向量特徵（可預先計算或動態嵌入）
   */
  embedding?: number[];
}

export interface HybridSearchResult {
  item: LegalKnowledgeItem;
  score: number;
  keywordScore: number;
  vectorScore: number;
  matchedTokens: string[];
  excerpt: string;
}

export function toLegalSourceItem(item: LegalKnowledgeItem, excerpt?: string): LegalSourceItem {
  return {
    kind: item.type === 'statute' ? 'statutes' : 'references',
    citation: item.citation,
    title: `${item.name} ${item.articleOrCaseNo} - ${item.title}`,
    excerpt: excerpt || item.content.slice(0, 200),
    sourceUrl: item.sourceUrl || "https://law.moj.gov.tw/",
    allowedCitation: true
  };
}
