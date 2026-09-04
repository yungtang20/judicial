import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  MessageSquare,
  Loader2,
  Trash2,
  AlertTriangle,
  BookOpen,
  Shield,
} from 'lucide-react';
import { useAgentChatStore } from '../store/useAgentChatStore';

export const AgentChat: React.FC = () => {
  const { messages, isLoading, error, sendMessage, clearMessages } =
    useAgentChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white m-0">
              法律智慧助理對話
            </h2>
            <p className="text-[11px] text-slate-400 m-0">
              狀態對話式法律諮詢 · 引用法規資料庫
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="清除對話紀錄"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/60">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-indigo-400/60" />
              <p className="text-sm font-medium text-slate-300">
                歡迎使用法律智慧助理
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                請輸入您的法律問題，系統將自動查詢法規資料庫、司法裁判及相關法源，
                並為您提供結構化的法律分析。
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {[
                '請問勞基法中關於資遣費的規定為何？',
                '侵權行為的構成要件有哪些？',
                '買賣契約瑕疵擔保的時效為何？',
                '聲請支付命令需要哪些文件？',
              ].map((hint) => (
                <button
                  key={hint}
                  onClick={() => {
                    setInput(hint);
                    inputRef.current?.focus();
                  }}
                  className="text-left text-xs p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/60 text-slate-400 hover:text-white hover:border-indigo-500/40 transition-colors"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-indigo-600/80 text-white'
                  : 'bg-slate-900/80 border border-slate-800/60 text-slate-200'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </div>
              {msg.role === 'assistant' && msg.disclaimer && (
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-start gap-1.5">
                  <Shield className="w-3 h-3 mt-0.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] text-slate-400 leading-relaxed">
                    {msg.disclaimer}
                  </span>
                </div>
              )}
              {msg.role === 'assistant' && msg.usedRetrieval && (
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                  <BookOpen className="w-3 h-3" />
                  <span>已查詢法規資料庫</span>
                  {msg.sourceProvider && <span>· {msg.sourceProvider}</span>}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl px-4 py-3 flex items-center gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span className="text-sm">正在查詢法規資料庫並分析中…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl px-4 py-3 flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入您的法律問題…"
            rows={1}
            className="flex-1 resize-none rounded-xl bg-slate-950/80 border border-slate-800/80 text-sm text-white placeholder-slate-500 p-3 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
            style={{ minHeight: '44px', maxHeight: '120px' }}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-950/30"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5 px-1">
          本系統提供的資訊僅供參考，不構成法律意見。重要法律事項請諮詢專業律師。
        </p>
      </div>
    </div>
  );
};

export default AgentChat;
