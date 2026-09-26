import React, { useState } from 'react';
import { apiClient } from '../../lib/apiClient';

export interface DraftRefinerProps {
  draftText: string;
  allowedCitations: string[];
  onRefined?: (draftText: string) => void;
}

export default function DraftRefiner({ draftText, allowedCitations, onRefined }: DraftRefinerProps) {
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 精修結果必須顯示出來。先前只呼叫 onRefined 往上層回報，而上層並未
  // 傳入處理函式，結果整段被丟棄：使用者送出微調、看到輸入框清空，
  // 卻看不到任何產出，等於這項功能沒有作用。
  const [refined, setRefined] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const refine = async () => {
    if (!instruction.trim()) return;
    setBusy(true); setError(null); setCopied(false);
    try {
      const result = await apiClient.draftRefine({ draftText, instruction, allowedCitations });
      setRefined(result.draftText);
      onRefined?.(result.draftText);
      setInstruction('');
    } catch (err) { setError(err instanceof Error ? err.message : '草稿微調未通過引用檢核'); } finally { setBusy(false); }
  };
  const copy = async () => {
    if (!refined) return;
    try {
      await navigator.clipboard.writeText(refined);
      setCopied(true);
    } catch {
      setError('無法自動複製，請手動選取下方文字。');
    }
  };
  return <details className="mt-3 rounded-lg border border-slate-700 p-3" aria-label="對話式草稿微調"><summary className="cursor-pointer text-sm font-semibold text-indigo-300">對話式草稿微調</summary><div className="mt-2 space-y-2"><textarea value={instruction} onChange={event => setInstruction(event.target.value)} placeholder="例如：改成較正式語氣，補充已知事實" className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /><button type="button" disabled={busy || !instruction.trim()} onClick={() => void refine()} className="rounded-lg bg-indigo-700 px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? '檢核中…' : '送出微調'}</button>{error && <p role="alert" className="text-xs text-rose-300">{error}</p>}{refined && <div aria-label="微調後書狀" className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-3"><p className="mb-2 text-xs font-semibold text-emerald-300">微調完成，已通過引用檢核。請確認後再交付。</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-slate-200">{refined}</pre><button type="button" onClick={() => void copy()} className="mt-2 rounded-lg border border-emerald-800 px-3 py-1 text-xs text-emerald-200">{copied ? '已複製' : '複製微調後書狀'}</button></div>}</div></details>;
}
