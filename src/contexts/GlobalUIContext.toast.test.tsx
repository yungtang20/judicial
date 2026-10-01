import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GlobalUIProvider, useGlobalUI } from './GlobalUIContext';
import { notify, notifyError } from '../lib/userNotice';

/**
 * 實測缺陷：上傳損壞的 PDF 會顯示
 * 「PDF 解析失敗，請直接複製貼上判決內文。」，
 * 但提示容器沒有 role 與 aria-live，依賴語音的使用者完全收不到這則錯誤；
 * 而且不論哪一種語氣都只停留 3 秒，使用者很可能還沒讀完就消失，
 * 消失後也無法再查。
 *
 * 這裡斷言的是渲染後的 DOM 屬性與實際停留時間，
 * 不是原始碼字串。
 */
describe('全域提示的無障礙與停留時間', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function 觸發提示() {
    function 主動畫() {
      const { showToast } = useGlobalUI();
      return (
        <button onClick={() => showToast({ message: '解析失敗', type: 'error' })}>顯示</button>
      );
    }
    render(<GlobalUIProvider><主動畫 /></GlobalUIProvider>);
    act(() => { screen.getByRole('button', { name: '顯示' }).click(); });
  }

  it('錯誤提示使用 role=alert 與 aria-live=assertive，讓螢幕報讀立即播報', () => {
    觸發提示();
    const 提示 = screen.getByRole('alert');
    expect(提示.textContent).toContain('解析失敗');
    expect(提示.getAttribute('aria-live')).toBe('assertive');
    expect(提示.getAttribute('aria-atomic')).toBe('true');
  });

  it('非錯誤提示使用 role=status 與 aria-live=polite，不打斷語音', () => {
    function 主動畫() {
      const { showToast } = useGlobalUI();
      return <button onClick={() => showToast({ message: '已儲存', type: 'success' })}>顯示</button>;
    }
    render(<GlobalUIProvider><主動畫 /></GlobalUIProvider>);
    act(() => { screen.getByRole('button', { name: '顯示' }).click(); });
    const 提示 = screen.getByRole('status');
    expect(提示.getAttribute('aria-live')).toBe('polite');
  });

  it('錯誤提示停留時間明顯長於一般提示，來得及閱讀', () => {
    vi.useFakeTimers();
    觸發提示();

    // 3 秒時仍應在（原本在這個時間點就消失了）
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.queryByRole('alert')).not.toBeNull();

    // 8 秒後才移除
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('明確指定 duration 時以指定值為準', () => {
    vi.useFakeTimers();
    function 主動畫() {
      const { showToast } = useGlobalUI();
      return <button onClick={() => showToast({ message: '短提示', type: 'error', duration: 1000 })}>顯示</button>;
    }
    render(<GlobalUIProvider><主動畫 /></GlobalUIProvider>);
    act(() => { screen.getByRole('button', { name: '顯示' }).click(); });

    act(() => { vi.advanceTimersByTime(1200); });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('純函式 notifyError 升起來的提示同樣可被播報', () => {
    render(<GlobalUIProvider><span /></GlobalUIProvider>);
    act(() => { notifyError('解析失敗，請直接複製貼上判決內文。'); });
    const 提示 = screen.getByRole('alert');
    expect(提示.textContent).toContain('請直接複製貼上判決內文');
    expect(提示.getAttribute('aria-live')).toBe('assertive');
  });

  it('notify 的成功提示不會被誤標成錯誤', () => {
    render(<GlobalUIProvider><span /></GlobalUIProvider>);
    act(() => { notify('已儲存'); });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status')).not.toBeNull();
  });
});