/**
 * mcp-taiwan-legal-db 查詢介面（第二獨立來源）
 *
 * 資料來源：lawchat-oss/mcp-taiwan-legal-db（官方原始來源，直連三個台灣政府站點）
 *   - judgment.judicial.gov.tw（司法院裁判書全文搜尋 + 取得）
 *   - law.moj.gov.tw（全國法規資料庫，11,700+ 部法規）
 *   - cons.judicial.gov.tw（憲法法庭，868 筆大法官解釋 + 憲判字）
 *
 * ⚠️ 來源確認：本模組只接 mcp-taiwan-legal-db，
 *    絕不接 dr-lawbot.com 或 tlr.dr-lawbot.com（同家後端，非獨立來源）。
 *
 * 狀態：介面 + 型別已完成；實際 MCP 呼叫邏輯以 TODO 標記，
 *       待 mcp-taiwan-legal-db 連接後補上，不模擬回應。
 */

// ── 與 externalCitationVerifier 對齊的輸出型別 ─────────────────────────
export type TaiwanLegalDbStatus = 'verified' | 'not_found' | 'unknown' | 'unavailable';

export interface TaiwanLegalDbResult {
  citation: string;
  status: TaiwanLegalDbStatus;
  /** 來源名稱，固定為 'mcp-taiwan-legal-db'，供報告層標記 */
  source: 'mcp-taiwan-legal-db';
  message: string;
  /** 原始回應摘要（有查到時填入，讓報告層可原文呈現） */
  rawSummary?: string;
}

// ── 查詢目標：三類官方來源 ───────────────────────────────────────────────
export type LegalSourceKind = 'judgment' | 'statute' | 'constitutional';

export interface TaiwanLegalDbQuery {
  /** 查詢字串（裁判字號、法條名稱、或大法官解釋號） */
  query: string;
  /** 目標來源；預設三類都查 */
  kinds?: LegalSourceKind[];
  /** 逾時（毫秒） */
  timeoutMs?: number;
}

export const DEFAULT_KINDS: LegalSourceKind[] = ['judgment', 'statute', 'constitutional'];
export const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * 查詢 mcp-taiwan-legal-db 官方原始來源。
 *
 * TODO(mcp-taiwan-legal-db 連接後補上)：
 *   1. 依 query.kinds 呼叫對應 MCP 工具：
 *      - judgment      → 司法院裁判書全文搜尋 / 取得
 *      - statute       → 全國法規資料庫查詢
 *      - constitutional→ 憲法法庭大法官解釋 / 憲判字查詢
 *   2. 將回應結構化填入 TaiwanLegalDbResult（rawSummary 保留原文）
 *   3. 逾時或連線失敗 → status='unavailable'，message 標明原因，
 *      不影響其他來源（兩邊獨立）
 *
 * 目前為介面骨架：未連接前一律回 unavailable，不模擬結果。
 */
export async function queryTaiwanLegalDb(
  query: TaiwanLegalDbQuery
): Promise<TaiwanLegalDbResult> {
  const kinds = query.kinds ?? DEFAULT_KINDS;
  const timeoutMs = query.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // TODO: 實際 MCP 呼叫邏輯（mcp-taiwan-legal-db 連接後補上）
  // 待補：
  //   - mcpCall('judgment.search', { q: query.query })
  //   - mcpCall('statute.search', { q: query.query })
  //   - mcpCall('constitutional.search', { q: query.query })
  //   依 kinds 決定呼叫哪些，並行執行，任一失敗不影響其他
  void kinds;
  void timeoutMs;

  return {
    citation: query.query,
    status: 'unavailable',
    source: 'mcp-taiwan-legal-db',
    message: 'mcp-taiwan-legal-db 尚未串接；待使用者連接後補上實際呼叫邏輯。',
  };
}

/** 批次查詢，去重 + 上限 20（與 dr-lawbot 批次規則對齊） */
export async function queryTaiwanLegalDbBatch(
  queries: TaiwanLegalDbQuery[]
): Promise<TaiwanLegalDbResult[]> {
  const seen = new Set<string>();
  const unique: TaiwanLegalDbQuery[] = [];
  for (const q of queries) {
    const key = q.query.trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push({ ...q, query: key });
    }
  }
  const capped = unique.slice(0, 20);
  return Promise.all(capped.map((q) => queryTaiwanLegalDb(q)));
}
