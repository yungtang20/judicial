/**
 * 交叉驗證 + 報告分區（提示詞 2／2）
 *
 * 依五條定案答案實作：
 *  1. 「查到夠了」= 兩邊都查到且一致（交叉來源門檻）
 *  2. 來源不一致 → 全列兩邊原文，不自動選邊
 *  3. 查不到 → 標「待確認／資料缺口」，不用模型推論填補（fail-closed）
 *  4. 專業 MCP：dr-lawbot + mcp-taiwan-legal-db（兩家獨立來源）
 *  5. 本專案既有 fail-closed 精神（比照 assertGeneratedDocumentVerified）
 *
 * 設計：純判斷層。輸入是 queryAllLegalSources 的兩邊原始結果，
 * 輸出三區分結構化報告——UI 各區可用不同樣式呈現。
 */

import type { ExternalCitationResult } from './externalCitationVerifier';
import type { TaiwanLegalDbResult } from './taiwanLegalDbClient';

// ── 三態判定 ────────────────────────────────────────────────────────
export type CrossVerifyStatus = 'CONFIRMED' | 'CONFLICTING' | 'INSUFFICIENT';

export interface CrossVerifyOutcome {
  citation: string;
  status: CrossVerifyStatus;
  /** 兩邊各自的原始說明（CONFLICTING 時兩邊都要原文化） */
  drLawbot?: { status: string; message: string };
  taiwanLegalDb?: { status: string; message: string; rawSummary?: string };
}

/**
 * 比對單筆引用在兩邊來源的交叉狀態。
 *
 * 規則：
 *  - 兩邊都 verified / not_found（一致）→ CONFIRMED
 *  - 兩邊都查到但結論不同（一 verified 一 not_found）→ CONFLICTING
 *  - 任一邊 unknown/unavailable（無有效結論）→ INSUFFICIENT
 *  - 兩邊都無結果 → INSUFFICIENT
 */
export function crossVerify(
  citation: string,
  drLawbot: ExternalCitationResult | undefined,
  taiwanLegalDb: TaiwanLegalDbResult | undefined
): CrossVerifyOutcome {
  const a = drLawbot;
  const b = taiwanLegalDb;

  // 任一邊沒有有效結論（unknown / unavailable / 缺）→ 數據缺口
  const aValid = a && (a.status === 'verified' || a.status === 'not_found');
  const bValid = b && (b.status === 'verified' || b.status === 'not_found');

  const outcome: CrossVerifyOutcome = {
    citation,
    status: 'INSUFFICIENT',
    drLawbot: a ? { status: a.status, message: a.message } : undefined,
    taiwanLegalDb: b
      ? { status: b.status, message: b.message, rawSummary: b.rawSummary }
      : undefined,
  };

  if (aValid && bValid) {
    const same = (a as ExternalCitationResult).status === (b as TaiwanLegalDbResult).status;
    outcome.status = same ? 'CONFIRMED' : 'CONFLICTING';
  }
  // 否則維持 INSUFFICIENT
  return outcome;
}

// ── 報告三區分 ─────────────────────────────────────────────────────
export interface CrossVerifyReport {
  /** 兩邊一致 */
  confirmed: CrossVerifyOutcome[];
  /** 兩邊有結論但不一致——原文全列，待使用者決定 */
  conflicting: CrossVerifyOutcome[];
  /** 至少一邊無結論——標待確認／資料缺口，不填補 */
  insufficient: CrossVerifyOutcome[];
}

export function buildCrossVerifyReport(outcomes: CrossVerifyOutcome[]): CrossVerifyReport {
  const report: CrossVerifyReport = { confirmed: [], conflicting: [], insufficient: [] };
  for (const o of outcomes) {
    if (o.status === 'CONFIRMED') report.confirmed.push(o);
    else if (o.status === 'CONFLICTING') report.conflicting.push(o);
    else report.insufficient.push(o);
  }
  return report;
}

/**
 * 從 queryAllLegalSources 結果直接產報告：
 * 依 queries 對齊兩邊陣列後逐筆 crossVerify，再分區。
 * 兩邊陣列長度不一致時，缺的一邊以 undefined 帶入（→ INSUFFICIENT）。
 */
export function crossVerifyAll(
  queries: string[],
  drLawbot: ExternalCitationResult[],
  taiwanLegalDb: TaiwanLegalDbResult[]
): CrossVerifyReport {
  const outcomes = queries.map((q, i) =>
    crossVerify(q, drLawbot[i], taiwanLegalDb[i])
  );
  return buildCrossVerifyReport(outcomes);
}
