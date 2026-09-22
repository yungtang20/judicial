import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  disclaimer?: string;
  usedRetrieval?: boolean;
  sourceProvider?: string;
  timestamp?: number;
}

interface AgentChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export const useAgentChatStore = create<AgentChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  sendMessage: async (content: string) => {
    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content,
      timestamp: Date.now(),
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
        timestamp: m.timestamp || Date.now(),
      }));

      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: content,
          history,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: 'msg_' + Date.now() + '_res',
        role: 'assistant',
        content: data.reply || '（無回應文字）',
        disclaimer: data.disclaimer,
        usedRetrieval: data.usedRetrieval,
        sourceProvider: data.sourceProvider,
        timestamp: Date.now(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMsg],
        isLoading: false,
      }));
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.message || '傳送失敗，請稍後再試',
      });
    }
  },
  clearMessages: () => {
    set({ messages: [], error: null });
  },
}));
