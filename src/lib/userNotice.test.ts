// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notify, notifyError, subscribeNotices, type Notice } from './userNotice';

/**
 * 模組層級提示機制必須真的把提示送達畫面。
 *
 * 這個模組取代了 13 處原生 alert()。原生 alert 至少一定會跳出視窗；
 * 若這個機制失效（例如 Provider 尚未訂閱），訊息會完全消失，
 * 使用者按下按鈕後什麼都看不到——比原本的 alert 更糟。
 */
describe('模組層級提示', () => {
  let 已收到: Notice[] = [];
  let 退訂: () => void;

  beforeEach(() => {
    已收到 = [];
    退訂 = subscribeNotices((n) => 已收到.push(n));
  });

  afterEach(() => {
    退訂();
  });

  it('訂閱者會收到通知', () => {
    notify('測試訊息');
    expect(已收到).toEqual([{ message: '測試訊息', tone: 'info' }]);
  });

  it('notifyError 使用 error 語氣', () => {
    notifyError('發生錯誤');
    expect(已收到[0].tone).toBe('error');
    expect(已收到[0].message).toBe('發生錯誤');
  });

  it('可指定語氣', () => {
    notify('注意', 'warning');
    expect(已收到[0].tone).toBe('warning');
  });

  it('退訂後不再收到', () => {
    退訂();
    notify('不該收到');
    expect(已收到).toEqual([]);
  });

  it('單一訂閱者失效不得影響其他訂閱者', () => {
    const 正常收到: Notice[] = [];
    const 壞退訂 = subscribeNotices(() => { throw new Error('訂閱者故障'); });
    subscribeNotices((n) => 正常收到.push(n));

    expect(() => notify('仍須送達')).not.toThrow();
    expect(正常收到.length, '故障的訂閱者不得阻擋其他訂閱者').toBe(1);

    壞退訂();
  });

  it('多個訂閱者都會收到', () => {
    const 第二個: Notice[] = [];
    const 退訂二 = subscribeNotices((n) => 第二個.push(n));
    notify('廣播');
    expect(已收到.length).toBe(1);
    expect(第二個.length).toBe(1);
    退訂二();
  });

  it('無訂閱者時不得丟出例外', () => {
    const 退訂全部 = subscribeNotices(() => { });
    退訂全部();
    退訂();
    expect(() => notify('無人接收')).not.toThrow();
  });
});

describe('提示與全域 Provider 的整合', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GlobalUIProvider 掛載後，模組通知會轉為畫面提示', async () => {
    const { render, screen, act } = await import('@testing-library/react');
    const React = await import('react');
    const { GlobalUIProvider } = await import('../contexts/GlobalUIContext');

    render(React.createElement(GlobalUIProvider, null,
      React.createElement('div', null, '測試頁面')));

    await act(async () => {
      notify('來自模組的訊息', 'error');
    });

    // 畫面上必須看得到這則訊息——看不到就代表取代原生 alert 的機制失效
    expect(await screen.findByText('來自模組的訊息')).toBeTruthy();
  });
});
