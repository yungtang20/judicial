/**
 * 跨功能導航上下文管理
 * 
 * 用於在判決分析→文書生成、判決分析→生活情境導診等場景之間
 * 傳遞案件上下文（案號、當事人、場景類型等）。
 */

export interface CrossFeatureContext {
  /** 案號（如「113年度台上字第123號」） */
  caseNumber?: string;
  /** 當事人姓名 */
  partyName?: string;
  /** 案件場景關鍵詞 */
  scenarioKeywords?: string;
  /** 法律domain（民事/刑事/家事/行政） */
  domain?: string;
  /** 案由/罪名 */
  cause?: string;
  /** 來源功能ID */
  sourceTool?: string;
  /** 文書類型 */
  documentType?: string;
  /** 時間戳 */
  timestamp: number;
}

const STORAGE_KEY = 'cross_feature_context';
const MAX_AGE_MS = 30 * 60 * 1000; // 30分鐘過期

export function saveCrossFeatureContext(ctx: Omit<CrossFeatureContext, 'timestamp'>): void {
  const full: CrossFeatureContext = { ...ctx, timestamp: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function loadCrossFeatureContext(): CrossFeatureContext | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const ctx: CrossFeatureContext = JSON.parse(raw);
    if (Date.now() - ctx.timestamp > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return ctx;
  } catch {
    return null;
  }
}

export function clearCrossFeatureContext(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
