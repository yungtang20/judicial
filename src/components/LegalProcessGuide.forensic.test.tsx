import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LegalProcessGuide } from './LegalProcessGuide';
import { GlobalUIProvider } from '../contexts/GlobalUIContext';

vi.mock('../lib/apiClient', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
}));

const enterNarrative = (text: string) => {
  const box = screen.getByPlaceholderText(/請簡要描述/);
  fireEvent.change(box, { target: { value: text } });
};

const reachStep2 = () => {
  fireEvent.click(screen.getByRole('button', { name: /下一步：填寫事實陳述/ }));
};

const renderGuide = () => render(<GlobalUIProvider><LegalProcessGuide /></GlobalUIProvider>);
describe('法理流程引導的採證時效指引', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未填事實時不顯示任何採證時效指示', () => {
    renderGuide();
    reachStep2();
    // 尚未輸入事實，連關鍵詞篩查都不足以判定高風險，因此不應出現任何採證時效指示
    expect(screen.queryByText(/採證保存時效可能已過/)).not.toBeInTheDocument();
    expect(screen.queryByText(/72小時內避免沐浴洗漱更衣/)).not.toBeInTheDocument();
  });

  it('舊案（民國112年）不得輸出急迫的 72 小時指示', () => {
    renderGuide();
    reachStep2();
    enterNarrative('事發於民國112年11月15日晚上,我配偶趁我熟睡時性交,並以恐嚇方式施壓。');
    expect(screen.getByText(/採證保存時效可能已過/)).toBeInTheDocument();
    expect(screen.queryByText(/72小時內避免沐浴洗漱更衣/)).not.toBeInTheDocument();
  });

  it('近期案件仍應輸出急迫的 72 小時指示', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 26));
    try {
      renderGuide();
      reachStep2();
      const today = new Date();
      const roc = today.getFullYear() - 1911;
      enterNarrative(`事發於民國${roc}年${today.getMonth() + 1}月${today.getDate()}日,我配偶趁我熟睡時性交。`);
      expect(screen.getByText(/72小時內避免沐浴洗漱更衣/)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

});
