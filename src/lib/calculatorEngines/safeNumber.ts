/**
 * 計算器輸入的數值防護。
 *
 * 實測邊界值壓測發現：輸入 Infinity 時，扶養費與資遣費計算器
 * 產出 NaN 與 Infinity 混雜的結果——金額欄位顯示「$NaN」，
 * 使用者無法判斷該數字代表什麼。
 *
 * Math.max(0, Number(Infinity) || 0) 仍是 Infinity（Infinity 為真值），
 * 因此必須用 Number.isFinite 明確判斷。
 */

/** 把任意輸入轉為有限非負數；無法解析時回傳後備值。 */
export function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

/** 夾在 0 到上限之間的有限非負數。 */
export function clampNonNegative(value: unknown, max = Number.MAX_SAFE_INTEGER, fallback = 0): number {
  const n = safeNumber(value, fallback);
  if (n < 0) return 0;
  return Math.min(n, max);
}
