/**
 * mcp-taiwan-legal-db 查詢（第二獨立來源）
 *
 * 資料來源：lawchat-oss/mcp-taiwan-legal-db（官方原始來源，直連三個台灣政府站點）
 *   - judgment.judicial.gov.tw（司法院裁判書全文搜尋 + 取得）
 *   - law.moj.gov.tw（全國法規資料庫，11,700+ 部法規）
 *   - cons.judicial.gov.tw（憲法法庭，868 筆大法官解釋 + 憲判字）
 *
 * ⚠️ 來源確認：本模組只接 mcp-taiwan-legal-db，
 *    絕不接 dr-lawbot.com 或 tlr.dr-lawbot.com（同家後端，非獨立來源）。
 *
 * 串接方式：每個查詢 spawn 一個本機 .venv Python 子行程（stdio MCP 協定），
 *           依 query 型別呼叫對應 MCP tool。spawn/逾時/查無一律 fail-closed。
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport as _Stdio } from '@modelcontextprotocol/sdk/client/stdio.js';

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
  /** 實際命中的 MCP tool 名稱（讓報告層可標註是哪一類來源） */
  tool?: string;
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
  /** 可選：覆蓋預設的 MCP server spawn 設定（供測試或自訂部署路徑） */
  transport?: { command: string; args: string[]; cwd?: string };
}

export const DEFAULT_KINDS: LegalSourceKind[] = ['judgment', 'statute', 'constitutional'];
export const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * 預設 spawn 設定：指向本機 mcp-taiwan-legal-db 的 venv。
 * 路徑可被 TaiwanLegalDbQuery.transport 覆蓋（測試／其他機器部署）。
 */
export const DEFAULT_TRANSPORT = {
  command: 'D:\\工作用\\mcp-taiwan-legal-db\\.venv\\Scripts\\python.exe',
  args: ['-m', 'mcp_server.server'],
  cwd: 'D:\\工作用\\mcp-taiwan-legal-db'
};

// ── 依 query 型別選 MCP tool ──────────────────────────────────────
const toAscii = (s: string) => s.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));

/** 裁判字號：「108 年度 台上字 第 2027 號」 */
function parseJudgmentQuery(query: string): Record<string, unknown> | null {
  const m = toAscii(query).match(/(\d{2,4})\s*年(?:度)?\s*([\u4e00-\u9fff]+)\s*字\s*第\s*(\d+)\s*號/);
  if (!m) return null;
  return { year_from: Number(m[1]), year_to: Number(m[1]), case_word: m[2], case_number: m[3] };
}

/** 大法官解釋：「釋字第 748 號」或「憲判字第 10 號」 */
function parseInterpretationQuery(query: string): Record<string, unknown> | null {
  const m = toAscii(query).match(/(釋字|憲判字)\s*第?\s*(\d+)\s*號?/);
  if (!m) return null;
  return { case_id: `${m[1]}第${m[2]}號` };
}

/** 法條：「民法 184 條」「刑法 10 條」 */
function parseRegulationQuery(query: string): Record<string, unknown> | null {
  const m = toAscii(query).match(/([\u4e00-\u9fff]{2,6}?法)\s*(?:第\s*)?(\d+)\s*條/);
  if (!m) return null;
  return { law_name: m[1], article_no: Number(m[2]) };
}

/** 依 kinds 與 query 內容，決定要呼叫哪個 MCP tool 及其參數 */
function planToolCall(query: string, kinds: LegalSourceKind[]): { tool: string; args: Record<string, unknown> } | null {
  for (const kind of kinds) {
    if (kind === 'judgment') {
      const args = parseJudgmentQuery(query);
      if (args) return { tool: 'search_judgments', args };
    }
    if (kind === 'constitutional') {
      const args = parseInterpretationQuery(query);
      if (args) return { tool: 'get_interpretation', args };
    }
    if (kind === 'statute') {
      const args = parseRegulationQuery(query);
      if (args) return { tool: 'query_regulation', args };
    }
  }
  return null;
}

/** 把 MCP tool 回傳的 text content 轉為摘要字串 */
function summarizeToolResult(result: { content?: unknown }): string | undefined {
  const content = (result as { content?: Array<{ type: string; text?: string }> }).content;
  if (!Array.isArray(content)) return undefined;
  const text = content
    .filter((c) => c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('\n');
  return text ? text.slice(0, 500) : undefined;
}

/**
 * 查詢 mcp-taiwan-legal-db 官方原始來源。
 *
 * 依 query.kinds 選 tool → spawn MCP 子行程 → 呼叫 tool → 結構化填入結果。
 * spawn 失敗/逾時/查無一律 fail-closed，不模擬結果。
 */
export async function queryTaiwanLegalDb(query: TaiwanLegalDbQuery): Promise<TaiwanLegalDbResult> {
  const kinds = query.kinds ?? DEFAULT_KINDS;
  const timeoutMs = query.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const transportCfg = query.transport ?? DEFAULT_TRANSPORT;

  const plan = planToolCall(query.query, kinds);
  if (!plan) {
    return {
      citation: query.query,
      status: 'unknown',
      source: 'mcp-taiwan-legal-db',
      message: '查詢無法解析為裁判字號、法條或大法官解釋，請確認輸入格式。'
    };
  }

  const base = { citation: query.query, source: 'mcp-taiwan-legal-db' as const, tool: plan.tool };

  const client = new Client({ name: 'judicial-taiwan-legal-db', version: '1.0.0' });
  const transport = new _Stdio({
    command: transportCfg.command,
    args: transportCfg.args,
    cwd: transportCfg.cwd
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await client.connect(transport);
    const result = await client.callTool(
      { name: plan.tool, arguments: plan.args },
      undefined,
      { timeout: timeoutMs }
    );
    const rawSummary = summarizeToolResult(result as { content?: unknown });
    const isError = Boolean((result as { isError?: boolean }).isError);

    if (isError || !rawSummary) {
      return { ...base, status: 'not_found', message: `mcp-taiwan-legal-db（${plan.tool}）查無吻合結果。` };
    }
    return {
      ...base,
      status: 'verified',
      message: `mcp-taiwan-legal-db（${plan.tool}）查得吻合結果。`,
      rawSummary
    };
  } catch (err) {
    const reason =
      err instanceof Error
        ? err.name === 'AbortError'
          ? `逾時（${timeoutMs}ms）`
          : err.message
        : '未知錯誤';
    return { ...base, status: 'unavailable', message: `mcp-taiwan-legal-db 連線失敗：${reason}。未據此判定真偽。` };
  } finally {
    clearTimeout(timer);
    try { await client.close(); } catch { /* 已關閉 */ }
  }
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
