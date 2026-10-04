/**
 * 裁判相關性過濾（Precedent Relevance Filtering）
 *
 * 為什麼需要本模組：
 * `keepVerifiedPrecedents` 只檢查「裁判字號是否真實存在」，不檢查「裁判內容是否
 * 與本案相關」。實測盜刷案（錢包遺失→信用卡盜刷）被系統送入官方裁判書系統搜尋時，
 * 因案情 legalBasis 含「民法第184條」，回傳 3 筆「假投資詐騙」附帶民事訴訟判決
 * ——這 3 筆裁判字號真實存在、條號交集非空，卻與案情（錢包遺失、信用卡盜刷）
 * 完全無關。
 *
 * 純條號交集（intersection ≥1）擋不住這種情況，因為 3 筆裁判都引民法第184條，
 * 而案情 legalBasis 也有民法第184條，交集非空。因此需要第二層語意相似度過濾。
 *
 * 混合策略（兩層都要通過才保留）：
 *   1. 條號交集：裁判 citedStatutes 與案情 legalBasis 至少有一項共同條號。
 *   2. TF-IDF cosine 相似度：裁判 summary 與案情 userNarrative 相似度 ≥ threshold。
 *
 * 設計原則：
 *   - Fail-closed：計算失敗或輸入缺失時一律丟棄該裁判，不靜默放行。
 *   - 不依賴模型：純字串統計，可完全離線重複。
 *   - 不修改裁判字號字串：過濾只決定「保留或丟棄」，不改寫任何法源內容。
 */

export interface PrecedentCandidate {
  caseNumber: string;
  summary: string;
  citedStatutes?: string[];
}

/** 相似度門檻。TF-IDF cosine 值域 [0,1]，0.25 為保守值：
 *  過低（<0.2）會讓不相干裁判因偶發共同詞（如「被告」「原告」）通過；
 *  過高（>0.4）會讓真實相關但用詞不同的裁判（如「竊盜」vs「竊盜取財」）被誤殺。
 */
export const DEFAULT_RELEVANCE_THRESHOLD = 0.25;

/** 中文停用詞。這些詞在所有法律文本中普遍出現，會稀釋 TF-IDF 的辨別力。 */
const STOP_WORDS = new Set([
  '原告', '被告', '聲請人', '上訴人', '被上訴人', '聲請', '提起', '聲明', '陳述',
  '本院', '本院判決', '本院裁定', '判決如下', '裁定如下', '事實', '理由', '主文',
  '上列', '當事人', '案件', '事件', '本院審理', '經原告', '經被告',
  '年', '月', '日', '號', '字', '年第', '年度', '號刑事', '號民事', '號附民',
  '一', '二', '三', '四', '五', '六', '七', '八', '九',
  '之', '及', '與', '或', '和', '但', '則', '如', '若', '依', '按', '故',
  '者', '其', '該', '此', '彼', '之於', '以上', '以下', '以上者',
  '新臺幣', '萬元', '元', '正', '利息', '自', '至', '起', '止',
  '請求', '准', '駁回', '請求判決', '判決被告', '本判決',
  '詳', '附件', '卷', '頁',
]);

/** 最小詞長。單字元（如「的」「了」）無辨別力，丟棄。 */
const MIN_TOKEN_LENGTH = 2;

/**
 * 中文文本分詞（char n-gram + 標點切分）。
 *
 * 不引入外部分詞庫（如 jieba）的理由：
 *   - 該依賴無法在 browser 端使用（本模組需前端顯示層也能呼叫）。
 *   - 本模組只需粗略辨別「裁判內容 vs 案情」，不需精確語意解析。
 *   - char bigram 對中文短文本的 TF-IDF cosine 已足夠區分主題完全不同的文本。
 *
 * 做法：先按標點與空白切分，再對每個片段做 char bigram。
 * 大於最大詞長（4）的片段同時保留 char trigram 與 char 4-gram 以提升辨別力。
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  // 先去除所有非中文字、英文字母、數字字元（保留標點做切分依據）
  const cleaned = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s，。、；：？！（）【】「」《》．,.;:?!()\-\/\s]/g, ' ');
  const segments = cleaned
    .split(/[\s，。、；：？！（）【】「」《》．,.;:?!()\-\/]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_TOKEN_LENGTH);

  const tokens: string[] = [];
  for (const segment of segments) {
    // 英文/數字整詞直接保留
    if (/^[a-zA-Z0-9]+$/.test(segment)) {
      tokens.push(segment.toLowerCase());
      continue;
    }
    // char bigram
    if (segment.length >= 2) {
      for (let i = 0; i < segment.length - 1; i++) {
        const bigram = segment.slice(i, i + 2);
        if (!STOP_WORDS.has(bigram)) tokens.push(bigram);
      }
    }
    // char trigram（更長片段才有辨別力）
    if (segment.length >= 3) {
      for (let i = 0; i < segment.length - 2; i++) {
        const trigram = segment.slice(i, i + 3);
        if (!STOP_WORDS.has(trigram)) tokens.push(trigram);
      }
    }
  }
  return tokens;
}

/** 計算詞頻（term frequency）。 */
function termFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  return freq;
}

/**
 * 計算 TF-IDF 向量。
 *
 * TF 不做 min-max 正規化（保留原始詞頻以反映主題強度），
 * IDF 使用 log(N / df) + 1 以避免 log(0) 與負值。
 */
function tfidfVector(documentTokens: string[], allDocuments: string[][]): Map<string, number> {
  const N = allDocuments.length;
  const df = new Map<string, number>();
  for (const docTokens of allDocuments) {
    const unique = new Set(docTokens);
    for (const token of unique) {
      df.set(token, (df.get(token) || 0) + 1);
    }
  }
  const tf = termFrequency(documentTokens);
  const vector = new Map<string, number>();
  for (const [token, freq] of tf) {
    const documentCount = df.get(token) || 1;
    const idf = Math.log(N / documentCount) + 1;
    vector.set(token, freq * idf);
  }
  return vector;
}

/**
 * TF-IDF cosine 相似度。
 *
 * 輸入兩個文本，回傳 [0, 1] 區間的相似度分數。
 * 輸入任一文本為空字串時回傳 0（fail-closed）。
 */
export function tfidfCosineSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  // 將兩個文本視為一個語料庫計算 IDF，確保同一文檔內出現的詞不會被過度放大
  const allDocs = [tokensA, tokensB];
  const vecA = tfidfVector(tokensA, allDocs);
  const vecB = tfidfVector(tokensB, allDocs);

  // 點積
  let dotProduct = 0;
  for (const [token, weightA] of vecA) {
    const weightB = vecB.get(token);
    if (weightB !== undefined) dotProduct += weightA * weightB;
  }
  if (dotProduct === 0) return 0;

  // L2 范數
  let normA = 0;
  for (const weight of vecA.values()) normA += weight * weight;
  let normB = 0;
  for (const weight of vecB.values()) normB += weight * weight;
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  if (normA === 0 || normB === 0) return 0;

  const similarity = dotProduct / (normA * normB);
  return Math.max(0, Math.min(1, similarity));
}

/**
 * 提取法條號（如「民法第184條」→「184」）以進行交集比對。
 *
 * 同時處理：
 *   - 「刑法第339條之4」→「339之4」（保留子項以精確匹配）
 *   - 「民法第184條第2項」→「184」（只取主條號，避免項別差異導致交集為空）
 */
function extractStatuteNumber(citation: string): string | null {
  const match = citation.match(/第\s*(\d+(?:之\d+)?)\s*條/);
  return match ? match[1] : null;
}

/**
 * 條號交集檢查：裁判 citedStatutes 與案情 legalBasis 是否至少有一項共同條號。
 *
 * 回傳 true 表示交集非空（可能相關），回傳 false 表示交集為空（一定不相關）。
 * 輸入任一陣列為空時回傳 false（fail-closed：無法確認相關性時一律丟棄）。
 */
export function hasStatuteIntersection(
  precedentStatutes: string[] | undefined,
  caseLegalBasis: string[] | undefined
): boolean {
  if (!precedentStatutes || precedentStatutes.length === 0) return false;
  if (!caseLegalBasis || caseLegalBasis.length === 0) return false;

  const precedentNumbers = new Set(
    precedentStatutes.map(extractStatuteNumber).filter((n): n is string => n !== null)
  );
  const caseNumbers = new Set(
    caseLegalBasis.map(extractStatuteNumber).filter((n): n is string => n !== null)
  );
  for (const num of precedentNumbers) {
    if (caseNumbers.has(num)) return true;
  }
  return false;
}

export interface RelevanceResult {
  caseNumber: string;
  /** 是否通過兩層過濾（條號交集 + 相似度）。 */
  relevant: boolean;
  /** 條號交集結果。 */
  statuteMatched: boolean;
  /** TF-IDF cosine 相似度分數。 */
  similarityScore: number;
  /** 被丟棄的原因（通過時為 null）。 */
  rejectionReason: 'NO_STATUTE_INTERSECTION' | 'LOW_SIMILARITY' | null;
}

/**
 * 裁判相關性過濾（主入口）。
 *
 * 兩層都通過才保留：
 *   1. 條號交集非空（hasStatuteIntersection）
 *   2. TF-IDF cosine 相似度 ≥ threshold
 *
 * 回傳過濾後的結果，包含每筆裁判的得分與丟棄原因，供日誌與除錯使用。
 *
 * @param precedents 候選裁判清單（含 caseNumber、summary、citedStatutes）
 * @param caseNarrative 案情描述（userNarrative）
 * @param caseLegalBasis 案情引用的法條清單
 * @param threshold 相似度門檻，預設 0.25
 */
export function filterPrecedentsByRelevance(
  precedents: PrecedentCandidate[],
  caseNarrative: string,
  caseLegalBasis: string[],
  threshold: number = DEFAULT_RELEVANCE_THRESHOLD
): RelevanceResult[] {
  if (!Array.isArray(precedents)) return [];

  return precedents.map((precedent) => {
    const statuteMatched = hasStatuteIntersection(
      precedent.citedStatutes,
      caseLegalBasis
    );

    if (!statuteMatched) {
      return {
        caseNumber: precedent.caseNumber,
        relevant: false,
        statuteMatched: false,
        similarityScore: 0,
        rejectionReason: 'NO_STATUTE_INTERSECTION'
      };
    }

    const similarityScore = tfidfCosineSimilarity(
      precedent.summary || '',
      caseNarrative || ''
    );

    if (similarityScore < threshold) {
      return {
        caseNumber: precedent.caseNumber,
        relevant: false,
        statuteMatched: true,
        similarityScore,
        rejectionReason: 'LOW_SIMILARITY'
      };
    }

    return {
      caseNumber: precedent.caseNumber,
      relevant: true,
      statuteMatched: true,
      similarityScore,
      rejectionReason: null
    };
  });
}

/**
 * 過濾後保留的裁判清單（方便呼叫端直接使用）。
 *
 * @returns 通過兩層過濾的裁判字號清單
 */
export function getRelevantPrecedents(
  precedents: PrecedentCandidate[],
  caseNarrative: string,
  caseLegalBasis: string[],
  threshold: number = DEFAULT_RELEVANCE_THRESHOLD
): string[] {
  return filterPrecedentsByRelevance(precedents, caseNarrative, caseLegalBasis, threshold)
    .filter((result) => result.relevant)
    .map((result) => result.caseNumber);
}
