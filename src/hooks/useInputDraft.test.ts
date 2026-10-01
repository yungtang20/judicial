import { describe, expect, it, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInputDraft, INPUT_DRAFT_KEY } from './useInputDraft';

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

function 建立Hook(初始值 = '', 分析已完成 = false) {
  let 值 = 初始值;
  const 設定 = (v: string) => { 值 = v; };
  return {
    讀: () => 值,
    render: () => renderHook(() => useInputDraft(值, 設定, 分析已完成)),
  };
}

describe('輸入草稿的行為（非原始碼比對）', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('掛載時輸入為空且草稿存在，必須還原', async () => {
    localStorage.setItem(INPUT_DRAFT_KEY, '房東不退還三萬元押金');
    const h = 建立Hook();
    h.render();
    await waitFor(() => expect(h.讀()).toBe('房東不退還三萬元押金'));
  });

  it('輸入為空且無草稿時不得憑空產生內容', async () => {
    const h = 建立Hook();
    h.render();
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(h.讀()).toBe('');
  });

  it('分析完成後不得還原草稿，且草稿應被清除', async () => {
    sessionStorage.setItem(INPUT_DRAFT_KEY, '舊案情');
    const h = 建立Hook('', true);
    h.render();
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(h.讀()).toBe('');
    expect(sessionStorage.getItem(INPUT_DRAFT_KEY)).toBeNull();
  });

  it('輸入有內容時不得被草稿覆蓋', async () => {
    sessionStorage.setItem(INPUT_DRAFT_KEY, '舊的草稿');
    const h = 建立Hook('使用者正在輸入的新內容');
    h.render();
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(h.讀()).toBe('使用者正在輸入的新內容');
  });
});

/**
 * 實測缺陷：草稿原本存在 localStorage，而 localStorage 是所有分頁共用的。
 * 實測結果：
 *   分頁 A 輸入「案子A」→ 開分頁 B，B 直接載入案子A 的內容
 *   分頁 B 輸入「案子B」→ 分頁 A 重新整理，還原成案子B，案子A 草稿永久遺失
 *
 * 對要同時比對多個案子的使用者，這是實際的資料損失與案件內容錯置。
 * 案件卷宗本來就用 sessionStorage，草稿改用同一種儲存，行為才一致。
 */
describe('草稿的分頁隔離', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('寫入的草稿不會出現在 localStorage（避免污染其他分頁）', async () => {
    const h = 建立Hook('案子A 的內容');
    h.render();
    await act(async () => { vi.advanceTimersByTime(500); });

    expect(window.sessionStorage.getItem(INPUT_DRAFT_KEY)).toBe('案子A 的內容');
    expect(window.localStorage.getItem(INPUT_DRAFT_KEY)).toBeNull();
  });

  it('本分頁有草稿時，不會去讀共用儲存裡別個分頁的內容', async () => {
    // 模擬另一個分頁留下的舊草稿
    window.localStorage.setItem(INPUT_DRAFT_KEY, '另一個分頁的案子');
    window.sessionStorage.setItem(INPUT_DRAFT_KEY, '本分頁的案子');

    const h = 建立Hook();
    h.render();
    await act(async () => { vi.advanceTimersByTime(500); });

    await waitFor(() => expect(h.讀()).toBe('本分頁的案子'));
  });

  it('本分頁沒有草稿時，仍可讀取舊的 localStorage 草稿（既有使用者不丟資料）', async () => {
    window.localStorage.setItem(INPUT_DRAFT_KEY, '舊版本留下來的草稿');

    const h = 建立Hook();
    h.render();

    await waitFor(() => expect(h.讀()).toBe('舊版本留下來的草稿'));
  });
});
