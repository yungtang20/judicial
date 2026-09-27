import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * 書狀模板不得捏造案件事實。
 *
 * 實測：toolboxFallbacks.ts 中有 277 處以 params.X || '具體值' 的形式，
 * 在使用者未填寫時填入看似真實的案件事實：
 * - 電話 0912-345-678（11 次）
 * - 身分證 A123456789、銀行帳號 12345678901234
 * - 地址「新北市板橋區文化路一段1號」（6 次）
 * - 金額 500,000、600,000、1,000,000 等
 * - 日期「113年5月間」「民國113年12月31日」
 * - 完整受傷敘述「致告訴人受有左側脛骨骨折及多處挫傷等傷害」
 *
 * 這些值會直接寫入產出的書狀本文。律師據此提交法院，
 * 等於以捏造的事實陳述作為書證。
 *
 * 修正：全部改為「（待填寫）」，讓使用者明確知道哪些欄位必須自行完成。
 * 保留的只有結構性角色標籤（告訴人、被告等）與法定預設值。
 */
describe('書狀模板不得捏造案件事實', () => {
  const source = readFileSync(
    path.resolve(__dirname, 'toolboxFallbacks.ts'),
    'utf8'
  );

  it('params 預設值不得包含任何數字（排除法定預設 0/1/2/5/10）', () => {
    const offenders: string[] = [];
    const pattern = /params\.([a-zA-Z]+) \|\| '([^']*)'/g;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(source)) !== null) {
      const value = m[2];
      if (!value || value === '（待填寫）') continue;
      if (/^\d{1,2}$/.test(value) && Number(value) <= 10) continue;  // 法定預設
      if (/\d/.test(value)) offenders.push(`${m[1]} => ${value}`);
    }
    expect(offenders, `以下預設值含數字，屬捏造的案件事實：\n${offenders.join('\n')}`).toEqual([]);
  });

  it('params 預設值不得是具體地址或機構名稱', () => {
    const offenders: string[] = [];
    const pattern = /params\.([a-zA-Z]+) \|\| '([^']*)'/g;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(source)) !== null) {
      const value = m[2];
      if (!value || value === '（待填寫）') continue;
      // 角色標籤（含括號補述）不是地址，例如「被告（網路ID/真實姓名）」
      if (/^[一-鿿]{2,4}(（[^）]*）)?$/.test(value)) continue;
      if (/[路街道巷弄號段棟樓室]|法院|檢察署|地政|國稅/.test(value)) {
        offenders.push(`${m[1]} => ${value}`);
      }
    }
    expect(offenders, `以下預設值是具體地址或機構：\n${offenders.join('\n')}`).toEqual([]);
  });

  it('角色標籤仍應保留，讓使用者知道欄位是誰的', () => {
    expect(source).toMatch(/params\.complainantName \|\| '告訴人'/);
    expect(source).toMatch(/params\.accusedName \|\| '被告'/);
  });
});
