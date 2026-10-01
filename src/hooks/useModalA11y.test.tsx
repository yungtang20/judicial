import { describe, it, expect, vi, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useModalA11y } from './useModalA11y';

/**
 * 實測缺陷：案件備份、情境導診詳細、指引彈窗、設定視窗與上訴步驟視窗
 * 只能靠右上角的 X 關閉。Escape 沒有作用，遮罩也沒有 role="dialog"
 * 與 aria-modal——鍵盤使用者開啟後沒有離開路徑，螢幕報讀也不會
 * 把它當成對話框播報。
 *
 * 這裡測的是行為本身（Escape 會關閉），不是原始碼字串：
 * 只斷言原始碼含 role="dialog" 之類的測試，改掉屬性就會失效，
 * 卻完全測不到使用者實際遇到的問題。
 */
describe('彈窗的鍵盤與無障礙行為', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function 建立彈窗(初始開啟 = true) {
    const 關閉次數 = { n: 0 };
    function 主動畫() {
      const [開啟, set開啟] = useState(初始開啟);
      useModalA11y(開啟, () => {
        關閉次數.n += 1;
        set開啟(false);
      });
      if (!開啟) return null;
      return (
        <div role="dialog" aria-modal="true" aria-label="測試視窗" data-testid="遮罩">
          視窗內容
        </div>
      );
    }
    return { 主動畫, 關閉次數 };
  }

  it('開啟時按 Escape 會關閉視窗', () => {
    const { 主動畫, 關閉次數 } = 建立彈窗();
    render(<主動畫 />);
    expect(screen.getByTestId('遮罩')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByTestId('遮罩')).toBeNull();
    expect(關閉次數.n).toBe(1);
  });

  it('關閉狀態下不會註冊監聽，按 Escape 不觸發關閉', () => {
    const { 主動畫, 關閉次數 } = 建立彈窗(false);
    render(<主動畫 />);
    expect(screen.queryByTestId('遮罩')).toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(關閉次數.n).toBe(0);
  });

  it('其他按鍵不會誤關視窗', () => {
    const { 主動畫 } = 建立彈窗();
    render(<主動畫 />);

    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'a' });

    expect(screen.getByTestId('遮罩')).toBeTruthy();
  });

  it('關閉後卸載監聽，再按 Escape 不會重複呼叫關閉', () => {
    const { 主動畫, 關閉次數 } = 建立彈窗();
    const { rerender } = render(<主動畫 />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(關閉次數.n).toBe(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(關閉次數.n).toBe(1);
  });
});