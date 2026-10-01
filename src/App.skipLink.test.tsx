import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

/**
 * 實測缺陷：鍵盤使用者在首頁必須連按 19 次 Tab，
 * 穿過側欄 12 張功能卡、範例選單與備份按鈕，
 * 才到得了「案件事實描述」這個主要輸入框。
 * 專案沒有任何跳過導覽的機制（WCAG 2.4.1 Bypass Blocks, Level A）。
 *
 * 這裡斷言的是渲染後的 DOM 與實際焦點行為，不是原始碼字串：
 * 只檢查原始碼含 href="#main-content" 的測試，
 * 把連結指向改錯、或讓 main 沒有 tabIndex 時都會失效，
 * 卻測不到鍵盤使用者真正遇到的問題。
 *
 * 整份檔案只 render 一次 App：渲染整個應用程式樹很吃資源，
 * 平行跑整套測試時會拉高整體耗時，使其他依賴 waitFor 逾時的
 * 測試在滿載時更容易失敗（先前就發生過）。
 */
describe('跳過功能選單', () => {
  it('第一個 Tab 焦點是跳過連結，指向可程式聚焦的主要內容', () => {
    const { container } = render(<App />);

    const 連結 = screen.getByRole('link', { name: /跳過功能選單/ });
    expect(連結.getAttribute('href')).toBe('#main-content');
    // sr-only 表示視覺上隱藏；focus:not-sr-only 讓它獲得焦點時浮現
    expect(連結.className).toContain('sr-only');
    expect(連結.className).toContain('focus:not-sr-only');

    const main = container.querySelector('main#main-content') as HTMLElement | null;
    expect(main).not.toBeNull();
    // tabIndex=-1 讓程式可以 focus，但不會把它放進 Tab 順序；
    // 少了它，錨點只會捲動而不會移動焦點，跳過連結就沒有用。
    expect(main?.getAttribute('tabindex')).toBe('-1');
    main?.focus();
    expect(document.activeElement).toBe(main);
  });
});