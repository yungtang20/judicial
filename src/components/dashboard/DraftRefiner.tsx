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
  const refine = async () => {
    if (!instruction.trim()) return;
    setBusy(true); setError(null);
    try {
      const result = await apiClient.draftRefine({ draftText, instruction, allowedCitations });
      onRefined?.(result.draftText);
      setInstruction('');
    } catch (err) { setError(err instanceof Error ? err.message : '草稿微調未通過引用檢核'); } finally { setBusy(false); }
  };
  return <details className="mt-3 rounded-lg border border-slate-700 p-3" aria-label="對話式草稿微調"><summary className="cursor-pointer text-sm font-semibold text-indigo-300">對話式草稿微調</summary><div className="mt-2 space-y-2"><textarea value={instruction} onChange={event => setInstruction(event.target.value)} placeholder="例如：改成較正式語氣，補充已知事實" className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /><button type="button" disabled={busy || !instruction.trim()} onClick={() => void refine()} className="rounded-lg bg-indigo-700 px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? '檢核中…' : '送出微調'}</button>{error && <p role="alert" className="text-xs text-rose-300">{error}</p>}</div></details>;
}
