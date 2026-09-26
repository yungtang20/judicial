import React from 'react';
import type { IssueEditorRow } from '../../lib/caseRowAdapters';

interface IssueEditorListProps {
  issues: IssueEditorRow[];
  onChange: (issues: IssueEditorRow[]) => void;
}

export function IssueEditorList({ issues, onChange }: IssueEditorListProps) {
  const updateIssue = (id: string, patch: Partial<IssueEditorRow>) => {
    onChange(issues.map(issue => issue.id === id ? { ...issue, ...patch } : issue));
  };

  const addIssue = () => {
    onChange([
      ...issues,
      {
        id: Date.now().toString(),
        issueType: '事實認定瑕疵',
        title: `爭點${issues.length + 1}`,
        originalHolding: '',
        appealArgument: '',
        relatedEvidences: `聲調${issues.length + 1}`,
        legalBasis: '',
        legalStrength: 'HIGH'
      }
    ]);
  };

  return (
    <section className="space-y-3" aria-label="爭點內容編輯器">
      <div className="flex justify-between items-center border-b pb-2 border-[var(--color-border-subtle)]">
        <h3 className="font-bold text-base text-[var(--color-text-primary)]">爭點對照資料</h3>
        <span className="text-3xs bg-amber-100 text-[var(--color-status-warning)] px-2 py-0.5 rounded font-mono font-bold">共 {issues.length} 爭點</span>
      </div>
      <div className="space-y-4">
        {issues.map((issue, index) => (
          <article key={issue.id} className="p-4 border border-[var(--color-border-strong)] rounded-xl bg-[var(--color-surface-overlay)] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold bg-amber-600 text-white px-2 py-0.5 rounded font-mono">爭點 No. {index + 1}</span>
              <button type="button" onClick={() => onChange(issues.filter(item => item.id !== issue.id))} className="text-red-500 hover:text-red-700 text-xs font-bold border border-[var(--color-status-danger)]/30 px-2 py-1 rounded bg-[var(--color-status-danger-bg)]">✖ 刪除</button>
            </div>
            <label className="block text-xs font-bold text-[var(--color-text-secondary)]">爭點主題與名稱
              <input value={issue.title} onChange={event => updateIssue(issue.id, { title: event.target.value })} className="mt-1 w-full border rounded p-2 text-xs bg-[var(--color-surface-overlay)] font-bold" />
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <label className="space-y-1 font-bold text-[var(--color-text-secondary)]">原審判決／原決定認定
                <textarea value={issue.originalHolding} onChange={event => updateIssue(issue.id, { originalHolding: event.target.value })} rows={5} className="w-full border rounded-lg p-2 text-xs font-normal" />
              </label>
              <label className="space-y-1 font-bold text-[var(--color-status-info)]">我方上訴／覆審指摘
                <textarea value={issue.appealArgument} onChange={event => updateIssue(issue.id, { appealArgument: event.target.value })} rows={5} className="w-full border rounded-lg p-2 text-xs font-normal" />
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <label className="font-bold text-[var(--color-text-secondary)]">對應證據編號
                <input value={issue.relatedEvidences} onChange={event => updateIssue(issue.id, { relatedEvidences: event.target.value })} className="mt-1 w-full border rounded p-1.5 font-mono" />
              </label>
              <label className="font-bold text-[var(--color-text-secondary)]">引用法條與實務見解
                <input value={issue.legalBasis} onChange={event => updateIssue(issue.id, { legalBasis: event.target.value })} className="mt-1 w-full border rounded p-1.5" />
              </label>
              <label className="font-bold text-[var(--color-text-secondary)]">爭點定位提示
                <select value={issue.legalStrength || 'HIGH'} onChange={event => updateIssue(issue.id, { legalStrength: event.target.value as IssueEditorRow['legalStrength'] })} className="mt-1 w-full border rounded p-1.5 font-bold">
                  <option value="HIGH">🎯 重點攻擊</option>
                  <option value="MEDIUM">⚖️ 中度風險</option>
                  <option value="NEED_SUPPLEMENT">⚠️ 需補充證據</option>
                </select>
              </label>
            </div>
          </article>
        ))}
      </div>
      <button type="button" onClick={addIssue} className="w-full py-2 border-2 border-dashed border-amber-600 text-[var(--color-status-warning)] font-bold text-xs rounded-xl">＋ 新增爭點欄位</button>
    </section>
  );
}
