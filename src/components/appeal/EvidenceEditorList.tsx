import React from 'react';
import type { EvidenceEditorRow } from '../../lib/caseRowAdapters';

interface EvidenceEditorListProps {
  evidences: EvidenceEditorRow[];
  onChange: (evidences: EvidenceEditorRow[]) => void;
}

export function EvidenceEditorList({ evidences, onChange }: EvidenceEditorListProps) {
  const updateEvidence = (id: string, patch: Partial<EvidenceEditorRow>) => {
    onChange(evidences.map(item => item.id === id ? { ...item, ...patch } : item));
  };

  const addEvidence = () => {
    onChange([
      ...evidences,
      {
        id: Date.now().toString(),
        code: String(evidences.length + 1),
        relatedIssue: `爭點${evidences.length + 1}：`,
        investigationItem: '訊問證人',
        investigationTarget: '',
        targetAddress: '',
        provenFact: ''
      }
    ]);
  };

  return (
    <section className="space-y-3" aria-label="調查證據內容編輯器">
      <div className="flex justify-between items-center border-b pb-2 border-emerald-300">
        <h3 className="font-bold text-base text-[var(--color-text-primary)]">調查證據列表</h3>
        <span className="text-3xs bg-emerald-100 text-[var(--color-status-success)] border border-emerald-300 px-2 py-0.5 rounded font-mono">共 {evidences.length} 列</span>
      </div>
      <div className="space-y-4">
        {evidences.map((item, index) => (
          <article key={item.id} className="p-4 border border-emerald-300 rounded-xl bg-emerald-50/20 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700">編號 {index + 1}</span>
                <input value={item.code} onChange={event => updateEvidence(item.id, { code: event.target.value })} className="w-16 border rounded py-1 text-xs text-center font-bold" aria-label={`證據編號 ${index + 1}`} />
              </div>
              <button type="button" onClick={() => onChange(evidences.filter(row => row.id !== item.id))} className="text-red-500 hover:text-red-700 text-xs font-bold border border-red-200 px-2 py-1 rounded bg-red-50">✖ 刪除</button>
            </div>
            <label className="block text-xs font-bold text-[var(--color-text-secondary)]">所涉爭點
              <textarea value={item.relatedIssue} onChange={event => updateEvidence(item.id, { relatedIssue: event.target.value })} rows={4} className="mt-1 w-full border rounded p-2 text-xs font-normal" />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <label className="font-bold text-[var(--color-text-secondary)]">調查事項
                <input value={item.investigationItem} onChange={event => updateEvidence(item.id, { investigationItem: event.target.value })} className="mt-1 w-full border rounded p-1.5" />
              </label>
              <label className="font-bold text-[var(--color-text-secondary)]">調查對象
                <input value={item.investigationTarget} onChange={event => updateEvidence(item.id, { investigationTarget: event.target.value })} className="mt-1 w-full border rounded p-1.5" />
              </label>
            </div>
            <label className="block text-xs font-bold text-[var(--color-text-secondary)]">對象地址及聯絡方式
              <textarea value={item.targetAddress} onChange={event => updateEvidence(item.id, { targetAddress: event.target.value })} rows={3} className="mt-1 w-full border rounded p-2 text-xs font-normal" />
            </label>
            <label className="block text-xs font-bold text-[var(--color-text-secondary)]">待證事實（限 50 字）
              <textarea value={item.provenFact || ''} maxLength={50} onChange={event => updateEvidence(item.id, { provenFact: event.target.value })} rows={3} className={`mt-1 w-full border rounded p-2 text-xs font-normal ${(item.provenFact || '').length > 50 ? 'border-red-400' : ''}`} />
            </label>
          </article>
        ))}
      </div>
      <button type="button" onClick={addEvidence} className="w-full py-2 border-2 border-dashed border-emerald-600 text-emerald-700 font-bold text-xs rounded-xl">＋ 增加一列</button>
    </section>
  );
}
