/**
 * 統一法律來源查詢入口：平行呼叫 dr-lawbot + mcp-taiwan-legal-db
 *
 * 設計：兩邊互相獨立——任何一邊逾時或失敗，不讓另一邊跟著失敗。
 * 此層只回傳兩邊各自原始結果，不做「夠不夠 / 衝不衝突」判斷
 * （那是 crossVerify 的事，見提示詞 2／2）。
 */

import {
  verifyExternalPrecedents,
  type ExternalCitationResult
} from './externalCitationVerifier';
import {
  queryTaiwanLegalDbBatch,
  type TaiwanLegalDbQuery,
  type TaiwanLegalDbResult
} from './taiwanLegalDbClient';

export interface AllSourcesResult {
  /** dr-lawbot 結果（可能部分 unavailable） */
  drLawbot: ExternalCitationResult[];
  /** mcp-taiwan-legal-db 結果（目前預設 unavailable，待串接） */
  taiwanLegalDb: TaiwanLegalDbResult[];
  /** 查詢條件原樣回傳，方便報告層標註 */
  queries: string[];
}

/** 平行呼叫兩邊來源，回傳各自原始結果。任一邊失敗被各自 catch，不讓另一邊跟著失敗。 */
export async function queryAllLegalSources(
  citations: string[],
  options?: { kinds?: TaiwanLegalDbQuery['kinds']; timeoutMs?: number }
): Promise<AllSourcesResult> {
  const cleanQueries = citations.map((c) => c.trim()).filter(Boolean);
  const [drLawbot, taiwanLegalDb] = await Promise.all([
    verifyExternalPrecedents(cleanQueries),
    queryTaiwanLegalDbBatch(
      cleanQueries.map((query) => ({ query, ...options }))
    )
  ]);

  return { drLawbot, taiwanLegalDb, queries: cleanQueries };
}
