import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useUnsavedInputWarning } from './useUnsavedInputWarning';

/**
 * 未送出的輸入不應在離開頁面時無聲消失。
 *
 * 實測缺陷：首頁案情描述輸入框的內容不會自動保存，
 * 重新整理頁面後 151 字的輸入直接消失，且沒有任何提示。
 * 使用者填寫案情往往需要數分鐘，誤觸重新整理就白費——
 * 法律工具的輸入成本高，這是實際損失。
 *
 * 刻意不做自動保存：應用已提供「儲存目前內容」與「案件備份」，
 * 自動寫入會在使用者未預期時產生內容。
 * 這個 hook 只加一道提示，不改變既有的儲存模型。
 */

const 原始碼 = readFileSync(
  resolve(process.cwd(), 'src/hooks/useUnsavedInputWarning.ts'),
  'utf8'
);

describe('未儲存輸入的離開提示', () => {
  it('必須呼叫 preventDefault 並設定 returnValue，瀏覽器才會顯示確認框', () => {
    // 現代瀏覽器（Chrome／Safari／Firefox）兩者都需要。
    // 只呼叫 preventDefault 會在部分瀏覽器完全無效。
    expect(原始碼).toContain('preventDefault');
    expect(原始碼).toContain('returnValue');
  });

  it('僅在有輸入且尚未送出分析時啟用', () => {
    // 已完成分析後再提示，會在使用者正常瀏覽其他頁面時造成騷擾。
    expect(原始碼).toMatch(/inputNarrative\.trim\(\)\.length\s*>\s*0/);
    expect(原始碼).toContain('已送出分析');
  });

  it('條件不成立時不安掛監聽器，結束時移除', () => {
    // 離開頁面後仍留著監聽器會造成記憶體洩漏與重複提示。
    expect(原始碼).toContain('removeEventListener');
    expect(原始碼).toMatch(/if \(!有未送出內容\) return;/);
  });

  it('依賴陣列包含輸入與分析狀態，變動時重新評估', () => {
    expect(原始碼).toMatch(/\}, \[inputNarrative, 已送出分析\]\);/);
  });

  it('不得改變既有的儲存模型（不做自動保存）', () => {
    // 自動寫入 localStorage 會在使用者未預期時產生內容。
    expect(原始碼).not.toMatch(/localStorage\./);
    expect(原始碼).not.toMatch(/sessionStorage\./);
  });
});

describe('提示已接入主要輸入流程', () => {
  it('UnifiedEntry 已掛載', () => {
    const 入口 = readFileSync(resolve(process.cwd(), 'src/components/UnifiedEntry.tsx'), 'utf8');
    expect(入口).toContain('useUnsavedInputWarning');
    expect(入口).toMatch(/useUnsavedInputWarning\(inputNarrative/);
  });
});
