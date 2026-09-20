import { create } from 'zustand';
import { apiClient } from '../lib/apiClient';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  disclaimer?: string;
  sourceProvider?: string;
  gateStatus?: string;
  usedRetrieval?: boolean;
  timestamp: string;
}

interface AgentChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

let msgCounter = 0;
const nextId = () => `chat-${Date.now()}-${++msgCounter}`;

export const useAgentChatStore = create<AgentChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,

  sendMessage: async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || get().isLoading) return;

    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      isLoading: true,
      error: null,
    }));

    try {
      const history = get().messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));

      const res = await apiClient.agentChat(trimmed, history);

      if (!res.success) {
        set({ isLoading: false, error: res.error || '回覆失敗，請稍後再試' });
        return;
      }

      const assistantMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: res.reply,
        disclaimer: res.disclaimer,
        sourceProvider: res.sourceProvider,
        gateStatus: res.gateStatus,
        usedRetrieval: res.usedRetrieval,
        timestamp: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMsg],
        isLoading: false,
      }));
    } catch (err: any) {
      console.error('[AgentChatStore] sendMessage error:', err);
      set({
        isLoading: false,
        error: err?.message || '網路連線失敗，請檢查連線後再試',
      });
    }
  },

  clearMessages: () => set({ messages: [], error: null }),
}));
