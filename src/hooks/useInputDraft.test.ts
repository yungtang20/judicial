import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 案情描述的草稿必須在切換頁面後保留。
 *
 * 實測缺陷：使用者輸入 151 字後切換到其他功能再返回，
 * 輸入框內容變成 0 字，必須重新打字。重新整理頁面亦同。
 *
 * 為什麼做自動保存（與「不自動保存分析結果」不衝突）：
 * 應用已另有「儲存目前內容」與「案件備份」兩個明示動作，
 * 但那是指把案件存成可重用的自訂案例。
 * 「使用者打的字在切換頁面後消失」不符合任何合理預期。
 */
const 原始碼 = readFileSync(resolve(process.cwd(), 'src/hooks/useInputDraft.ts'), 'utf8');
const 入口 = readFileSync(resolve(process.cwd(), 'src/components/UnifiedEntry.tsx'), 'utf8');

describe('輸入草稿的保留', () => {
  it('已掛載於主要輸入流程', () => {
    expect(入口).toContain('useInputDraft');
    expect(入口).toMatch(/useInputDraft\(inputNarrative, setInputNarrative/);
  });

  it('寫入 localStorage，且延遲執行避免每個按鍵都寫入', () => {
    expect(原始碼).toContain('localStorage.setItem');
    expect(原始碼).toMatch(/setTimeout\(\(\) => \{/);
    expect(原始碼).toMatch(/寫入延遲毫秒 = \d+/);
  });

  it('恢復時不得覆蓋使用者正在輸入的內容', () => {
    // 只在輸入框為空時恢復草稿，否則使用者重新貼上的內容會被舊草稿蓋掉。
    expect(原始碼).toContain("if (inputNarrative.trim()) return;");
  });

  it('還原不得只在首次掛載時執行', () => {
    // 實測缺陷：只在首次掛載恢復時，切換功能頁面後根本沒有讀取草稿，
    // 151 字留在儲存裡而輸入框是空的。
    expect(原始碼).not.toContain('初次載入');
    expect(原始碼).toMatch(/\}, \[inputNarrative, 分析已完成, setInputNarrative\]\);/);
  });

  it('還原旗標防止寫入效果以空值覆蓋草稿', () => {
    expect(原始碼).toContain('還原中');
  });
  it('分析完成後清除草稿', () => {
    // 案件已進入歷史記錄，留著只會讓使用者誤以為舊案情還沒送出。
    expect(原始碼).toMatch(/if \(分析已完成\)/);
    expect(原始碼).toContain('localStorage.removeItem');
  });

  it('輸入清空時移除草稿，不留空字串佔位', () => {
    expect(原始碼).toMatch(/if \(inputNarrative\.trim\(\)\)[\s\S]{0,120}removeItem/);
  });

  it('localStorage 不可用時不得讓功能失效', () => {
    // 無痕模式或權限限制下 localStorage 會拋錯，
    // 那時輸入框仍必須可用。
    const tryCount = (原始碼.match(/try \{/g) || []).length;
    const catchCount = (原始碼.match(/catch \{/g) || []).length;
    expect(catchCount).toBeGreaterThanOrEqual(3);
    expect(tryCount).toBeGreaterThanOrEqual(3);
  });

  it('計時器清理不得加多餘的守衛', () => {
    // 專案規範：clearTimeout 對 null/undefined 本就安全，
    // 加 if 判斷只會增加讀者需要推理的分支。
    expect(原始碼).not.toMatch(/if \(計時器\.current\) clearTimeout/);
  });
});
