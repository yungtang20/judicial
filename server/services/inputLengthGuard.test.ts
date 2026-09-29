import { describe, expect, it } from 'vitest';
import {
  檢查輸入長度,
  NARRATIVE_MAX_CHARS,
  DOCUMENT_MAX_CHARS
} from './inputLengthGuard';

/**
 * 輸入長度界限：寧可明確拒絕，不可靜默截斷。
 *
 * 實測缺陷：送出 170,061 字的案情描述，系統回 HTTP 200 並給出分析，
 * 但 AI 實際只看到開頭——結尾的「訴之聲明：一百萬元」完全消失，
 * 且沒有任何警告。使用者會以為整份案情都已被分析。
 *
 * 對法律工具而言這是實質正確性問題：訴之聲明、證據清單、
 * 關鍵事實通常寫在長文件的後段，靜默丟棄等同給出錯誤建議。
 */

describe('敘述型輸入的長度界限', () => {
  it('正常長度的案情描述必須通過', () => {
    expect(檢查輸入長度('我於民國113年5月借款給朋友三萬元，對方一直不還。').通過).toBe(true);
  });

  it('常見的長篇陳述（數千字）仍須通過', () => {
    // 真實使用者的口語陳述雖長，通常也只有數千字。
    expect(檢查輸入長度('事'.repeat(8000), 'narrative').通過).toBe(true);
  });

  it('超過上限必須拒絕', () => {
    const r = 檢查輸入長度('事'.repeat(NARRATIVE_MAX_CHARS + 1), 'narrative');
    expect(r.通過).toBe(false);
    expect(r.字數).toBe(NARRATIVE_MAX_CHARS + 1);
  });

  it('拒絕訊息必須說明上限、字數，以及系統不會自動截斷', () => {
    const r = 檢查輸入長度('事'.repeat(NARRATIVE_MAX_CHARS + 1), 'narrative');
    expect(r.訊息).toContain(NARRATIVE_MAX_CHARS.toLocaleString());
    expect(r.訊息).toContain('不會自動截斷');
    // 必須提示後段可能遺漏，否則使用者仍不知道發生了什麼
    expect(r.訊息).toMatch(/遺漏|後段/);
  });

  it('邊界值：剛好等於上限應通過', () => {
    expect(檢查輸入長度('事'.repeat(NARRATIVE_MAX_CHARS), 'narrative').通過).toBe(true);
  });
});

describe('文書型輸入的長度界限', () => {
  it('真實判決書的常見長度必須通過', () => {
    // 真實判決書動輒數萬字，用敘述型的上限會擋掉正常情境。
    expect(檢查輸入長度('判'.repeat(80_000), 'document').通過).toBe(true);
  });

  it('文書型上限高於敘述型', () => {
    expect(DOCUMENT_MAX_CHARS).toBeGreaterThan(NARRATIVE_MAX_CHARS);
  });

  it('超過文書上限亦須拒絕，不得靜默截斷', () => {
    const r = 檢查輸入長度('判'.repeat(DOCUMENT_MAX_CHARS + 1), 'document');
    expect(r.通過).toBe(false);
    expect(r.訊息).toContain('不會自動截斷');
  });
});

describe('輸入型態的處理', () => {
  it('非字串輸入不應在此層報錯，交由後續驗證處理', () => {
    // 這裡只管長度；型別錯誤由既有的輸入驗證負責。
    expect(檢查輸入長度(null).通過).toBe(true);
    expect(檢查輸入長度(undefined).字數).toBe(0);
    expect(檢查輸入長度(12345).字數).toBe(0);
  });

  it('空字串通過長度檢查', () => {
    expect(檢查輸入長度('').通過).toBe(true);
  });
});
