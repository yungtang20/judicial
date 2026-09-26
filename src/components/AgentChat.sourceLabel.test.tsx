import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentChat } from './AgentChat';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  disclaimer?: string;
  usedRetrieval?: boolean;
  sourceProvider?: 'tlr' | 'opendata' | 'local' | 'none';
};

let messages: ChatMessage[] = [];

vi.mock('../store/useAgentChatStore', () => ({
  useAgentChatStore: () => ({
    get messages() { return messages; },
    isLoading: false,
    error: null,
    sendMessage: vi.fn(),
    clearMessages: vi.fn()
  })
}));

const renderAssistant = (msg: Partial<ChatMessage>) => {
  messages = [{
    id: 'm1',
    role: 'assistant',
    content: '回答內容',
    ...msg
  } as ChatMessage];
  return render(<AgentChat />);
};

describe('AgentChat 資料來源標示', () => {
  beforeEach(() => {
    messages = [];
  });

  it('本機快照必須誠實標示為本機，不得宣稱已查詢外部法源', () => {
    renderAssistant({ usedRetrieval: true, sourceProvider: 'local' });
    expect(screen.getByText(/已查詢本機法規快照/)).toBeInTheDocument();
    expect(screen.getByText(/本機法規與函釋快照/)).toBeInTheDocument();
    expect(screen.queryByText(/已查詢外部法源/)).not.toBeInTheDocument();
  });

  it('外部法源來源的標示須可讀，不得直接呈現內部代號', () => {
    renderAssistant({ usedRetrieval: true, sourceProvider: 'tlr' });
    expect(screen.getByText(/已查詢外部法源/)).toBeInTheDocument();
    expect(screen.getByText(/TW Legal RAG 外部法源/)).toBeInTheDocument();
    // 原始列舉值不得直接出現於介面
    expect((document.body.textContent || '')).not.toMatch(/·\s*tlr\b/);
    expect((document.body.textContent || '')).not.toMatch(/·\s*local\b/);
  });

  it('未使用檢索時不得顯示任何來源標示', () => {
    renderAssistant({ usedRetrieval: false, sourceProvider: 'none' });
    expect(screen.queryByText(/已查詢/)).not.toBeInTheDocument();
  });

  it('逐則免責聲明只標示資料來源，不重複頁尾的法律意見免責', () => {
    renderAssistant({
      disclaimer: '資料來源：本機法規與函釋快照（僅收錄 24 條常用法規，非即時更新）',
      usedRetrieval: true,
      sourceProvider: 'local'
    });
    const body = document.body.textContent || '';
    expect(body).toContain('資料來源：本機法規與函釋快照');
    // 「不構成法律意見」只應出現在頁尾一次，逐則訊息不得重複
    expect((body.match(/不構成法律意見/g) || []).length).toBe(1);
  });
});
