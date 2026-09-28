import { describe, expect, it } from 'vitest';
import { CALCULATOR_CONFIGS } from './index';

/**
 * 消滅時效計算不得對無法辨識的法律範疇產出「期間已屆滿」。
 *
 * 實測缺陷：領域無法辨識時（介面選項更新後舊值仍在傳入、
 * 或呼叫端拼錯字），switch 沒有命中任何分支，
 * yearsToAdd 與 monthsToAdd 皆為 0，於是產出：
 *   時效屆滿確切期日 = 起算日（同一天）
 *   法定期間長度 = 0 個月
 *   適用法規依據 = （空白）
 *
 * 這等於告訴當事人「你的權利已經罹於時效」——
 * 本工具能給出最有害的錯誤答案，當事人會據此放棄救濟。
 * 寧可明確說「無法計算」，也不能推出一個看似確定的錯誤期間。
 */
const 計算 = CALCULATOR_CONFIGS.STATUTE_LIMITATIONS_CALCULATOR!;
const 結果 = (inputs: Record<string, unknown>) => calculate(inputs);
function calculate(inputs: Record<string, unknown>): {
  summary?: Array<{ label?: string; value?: string }>;
  notice?: string;
  legalClause?: string;
} {
  return (計算 as unknown as { calculate: (i: Record<string, unknown>) => ReturnType<typeof 結果> }).calculate(inputs);
}

const 值 = (r: ReturnType<typeof 結果>, 標籤: string) =>
  r.summary?.find(s => s.label?.includes(標籤))?.value ?? '';

describe('時效計算：無法辨識的領域', () => {
  it.each(['CRIMINAL', 'ADMIN', '不存在的領域', 'CIVIL_TORT_之類', ''])(
    '領域「%s」不得產出已屆滿的期間',
    (領域) => {
      const r = 結果({ startDate: '2024-05-01', legalDomain: 領域 });
      const 期間 = 值(r, '法定期間長度');
      const 屆滿 = 值(r, '時效屆滿');

      // 核心：不得出現「0 個月」，也不得讓屆滿日等於起算日。
      expect(期間, `期間竟為「${期間}」`).not.toMatch(/^0\s*(年|個月|月|日)?$/);
      expect(屆滿, `屆滿日竟為「${屆滿}」`).not.toBe('2024 年 05 月 01 日');
    }
  );

  it('無法辨識的領域必須明確告知請先選擇範疇', () => {
    const r = 結果({ startDate: '2024-05-01', legalDomain: 'ADMIN' });
    expect(值(r, '無法計算時效期間')).toBe('請先選擇法律範疇');
    expect(r.notice).toContain('ADMIN');
    expect(r.legalClause).toContain('請先');
  });
});

describe('時效計算：可辨識的領域', () => {
  const 選項 = 計算.inputs?.find(i => i.id === 'legalDomain')?.options ?? [];

  it('介面提供的每個領域都必須能算出期間與法規依據', () => {
    // 逐一驗證所有選項，避免新增選項時漏加 switch 分支——
    // 漏加就會落入上面的「0 個月」無意義結果。
    expect(選項.length).toBeGreaterThan(0);
    const 無法計算: string[] = [];
    for (const o of 選項) {
      const r = 結果({ startDate: '2024-05-01', legalDomain: o.value });
      const 期間 = 值(r, '法定期間長度');
      const 依據 = 值(r, '適用法規依據');
      if (/^0\s*(年|個月|月|日)?$/.test(期間) || !依據) {
        無法計算.push(`${o.value}（期間=${期間}、依據=${依據 || '空'}）`);
      }
    }
    expect(無法計算, '以下領域無法算出期間或缺少法規依據：').toEqual([]);
  });

  it.each([
    ['CIVIL_GENERAL', '15 年', '民法第125條'],
    ['CIVIL_PERIODIC', '5 年', '民法第126條'],
    ['CIVIL_SHORT', '2 年', '民法第127條'],
    ['CRIMINAL_COMPLAINT_6M', '6 個月', '刑事訴訟法第237條第1項'],
    ['CRIMINAL_30Y', '30 年', '刑法第80條第1項第1款'],
    ['CRIMINAL_5Y', '5 年', '刑法第80條第1項第4款']
  ])('%s 算出 %s（%s）', (領域, 期間, 依據) => {
    const r = 結果({ startDate: '2024-05-01', legalDomain: 領域 });
    expect(值(r, '法定期間長度')).toBe(期間);
    expect(值(r, '適用法規依據')).toBe(依據);
  });

  it('15 年期間自 2024-05-01 起算至 2039-05-01', () => {
    const r = 結果({ startDate: '2024-05-01', legalDomain: 'CIVIL_GENERAL' });
    expect(值(r, '時效屆滿')).toBe('2039 年 05 月 01 日');
  });

  it('閏日 2024-02-29 起算 15 年後為 2039-03-01（2 月 29 日在目標年不存在時順延）', () => {
    const r = 結果({ startDate: '2024-02-29', legalDomain: 'CIVIL_GENERAL' });
    // JS 的 setFullYear 會把 2/29 溢出到 3/1，這是預期且可接受的行為，
    // 重點是不得產生 Invalid Date 或 NaN。
    expect(值(r, '時效屆滿')).toMatch(/^2039 年 0?3 月 01 日$/);
  });
});
