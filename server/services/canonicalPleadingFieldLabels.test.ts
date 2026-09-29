import { describe, expect, it } from 'vitest';
import { CanonicalPleadingInputError } from './canonicalPleadingPipeline';

/**
 * 缺欄位的錯誤訊息必須使用使用者看得懂的標籤。
 *
 * 實測缺陷：訊息回傳「書狀輸入不足：parties[0].name, signature,
 * subject_and_facts」——這些是內部 CaseInput 欄位路徑。
 * 表單上顯示的是「原告姓名」「簽名或蓋章」「起訴事實與理由」，
 * 使用者無從對應，只會以為系統壞了。
 */
function 建錯誤(...欄位: string[]): string {
  return new CanonicalPleadingInputError(
    欄位.map(field => ({ field } as never))
  ).message;
}

describe('缺欄位訊息的可行動性', () => {
  it('常見欄位以表單標籤顯示', () => {
    const 訊息 = 建錯誤('parties[0].name', 'parties[0].address', 'signature', 'court');
    expect(訊息).toContain('原告姓名');
    expect(訊息).toContain('原告地址');
    expect(訊息).toContain('簽名或蓋章');
    expect(訊息).toContain('管轄法院');
  });

  it('不得殘留任何內部欄位路徑', () => {
    const 已知 = [
      'parties[0].name', 'parties[0].address', 'parties[0].contactPhone',
      'parties[1].name', 'parties[1].address', 'parties[2].name', 'parties[2].address',
      'signature', 'court', 'caseNo', 'subject_and_facts', 'statements',
      'evidence', 'attachments', 'legalReferences', 'documentDate', 'proceeding',
      'judgment_relief', 'subject_and_facts_reason', 'debtAmount',
      'claimAmount', 'amount', 'representatives', 'styleProfile', 'ruleProfile'
    ];
    const 訊息 = 建錯誤(...已知);
    for (const f of 已知) {
      expect(訊息, `訊息仍含內部欄位：${f}`).not.toContain(f);
    }
  });

  it('未登錄的欄位保留原值，不得變成空白', () => {
    // 寧可顯示原始名稱，也不要輸出空字串讓使用者更困惑。
    const 訊息 = 建錯誤('someFutureField');
    expect(訊息).toContain('someFutureField');
  });

  it('說明要補齊的內容，並以頓號分隔便於閱讀', () => {
    const 訊息 = 建錯誤('plaintiffName' in {} ? 'x' : 'court', 'evidence');
    expect(訊息).toContain('請補齊');
    expect(訊息).toContain('、');
  });

  it('錯誤代碼維持不變（前端可能依此分流）', () => {
    const e = new CanonicalPleadingInputError([{ field: 'court' } as never]);
    expect(e.code).toBe('CANONICAL_PLEADING_INPUT_REQUIRED');
  });

  it('missingInputs 原始資料仍可供程式使用', () => {
    // 顯示文字改為標籤，但程式仍需要原始欄位名做進一步處理。
    const e = new CanonicalPleadingInputError([{ field: 'court' } as never]);
    expect(e.missingInputs[0].field).toBe('court');
  });
});
