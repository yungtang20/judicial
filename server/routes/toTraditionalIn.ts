import { toTraditionalChinese } from '../../src/lib/traditionalChineseGuard.js';

/**
 * 遞迴把物件中所有字串轉為繁體。
 *
 * AI 回應的結構未知（巢狀物件、陣列都可能），
 * 但繁體是交付前的硬性要求，因此必須遞迴處理整棵樹。
 */
export function toTraditionalChineseIn<T>(value: T): T {
  if (typeof value === 'string') return toTraditionalChinese(value) as unknown as T;
  if (Array.isArray(value)) return value.map(item => toTraditionalChineseIn(item)) as unknown as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = toTraditionalChineseIn(val);
    }
    return out as unknown as T;
  }
  return value;
}
