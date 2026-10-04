import { describe, expect, it } from 'vitest';
import { buildFallbackToolboxResult } from './toolboxFallbacks';

/**
 * 裁判費試算必須依「母法 + 授權子法」雙層結構計算。
 *
 * 實測缺陷（2026-10-02）：模板只依民事訴訟法第77條之13原定額數計算，
 * 未依同法第77條之27授權、自114年1月1日施行之《臺灣高等法院民事訴訟、
 * 非訟事件及強制執行費用提高徵收額數標準》加徵——訴訟標的150萬元之
 * 第一審裁判費實際應徵19,050元，模板只算出15,000元，短少4,050元。
 * 使用者據此評估訴訟成本會低估費用，甚至遞狀後因補費不足被駁回。
 *
 * 回歸驗算基準（5 筆近年「補」字裁定，X=訴訟標的價額、Y=應徵第一審裁判費）：
 *   383,000→5,270；4,345,919→52,395；16,975,000→179,924；
 *   5,237,280→62,808；411,574→5,660。
 * 全數代入「畸零以萬元計算＋加徵十分之三（10萬–1,000萬）／十分之一（逾1,000萬）」公式核對相符。
 */
const 裁判費 = (訴訟標的: number): number => {
  const 加徵 = (lo: number, hi: number, perUnit: number, ratio: number): number => {
    if (訴訟標的 <= lo) return 0;
    return Math.ceil((Math.min(訴訟標的, hi) - lo) / 10000) * perUnit * ratio;
  };
  return Math.round(
    (訴訟標的 > 0 ? 1000 * 1.5 : 0) +
    加徵(100_000, 1_000_000, 100, 1.3) +
    加徵(1_000_000, 10_000_000, 90, 1.3) +
    加徵(10_000_000, 100_000_000, 80, 1.1) +
    加徵(100_000_000, 1_000_000_000, 70, 1.1) +
    (訴訟標的 > 1_000_000_000 ? Math.ceil((訴訟標的 - 1_000_000_000) / 10000) * 60 * 1.1 : 0)
  );
};

// 地區獨立：不得以 toLocaleString() 的輸出作為比對基準（ICU 版本會改變千分位格式）。
const 千分位 = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const 產製 = (訴訟標的: string): string =>
  (buildFallbackToolboxResult(
    'COURT_FEE_CALCULATOR',
    { claimAmount: 訴訟標的, stage: '第一審' } as never
  ) as never as { documentText: string }).documentText;

describe('民事裁判費試算（母法＋授權子法）', () => {
  it.each([
    ['383000', 5270],
    ['4345919', 52395],
    ['16975000', 179924],
    ['5237280', 62808],
    ['411574', 5660]
  ])('訴訟標的 %s 元的第一審裁判費應為 %s 元（實務裁定驗算基準）', (標的, 應納) => {
    const doc = 產製(標的);
    expect(doc).toContain(千分位(應納));
  });

  it('訴訟標的150萬元不得只算母法原定額數15,000元', () => {
    const doc = 產製('1500000');
    // 150萬 → 1,500 + 11,700 + 50×99 = 19,050（含加徵）
    expect(doc).toContain(千分位(19050));
    expect(doc).not.toContain(千分位(15000));
    expect(doc).toContain('提高徵收額數標準');
  });

  it('試算必須標示授權子法與施行日，不得只引母法', () => {
    const doc = 產製('1000000');
    expect(doc).toContain('第77條之27');
    expect(doc).toContain('114年1月1日施行');
    expect(doc).toContain('畸零之數不滿萬元者，以萬元計算');
  });

  it('畸零金額以萬元計算：411,574元→52個萬元單位', () => {
    expect(裁判費(411_574)).toBe(5660);
  });
});
