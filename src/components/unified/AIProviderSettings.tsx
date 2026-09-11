import React from 'react';

export interface AIProviderConfigDraft {
  providerType: 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface Props {
  value: AIProviderConfigDraft;
  onChange: (value: AIProviderConfigDraft) => void;
}

export const AIProviderSettings: React.FC<Props> = ({ value, onChange }) => {
  const [expanded, setExpanded] = React.useState(false);
  const update = (patch: Partial<AIProviderConfigDraft>) => onChange({ ...value, ...patch });
  return (
    <section className="border-y border-slate-800/80 py-3 space-y-3" aria-label="AI 提供商設定">
      <button type="button" onClick={() => setExpanded((open) => !open)} aria-expanded={expanded} className="w-full min-h-6 py-1 flex items-center justify-between gap-3 text-left">
        <span className="text-xs font-semibold text-slate-300">AI 模型 · {value.model}</span>
        <span className="text-xs text-[var(--color-text-muted)]">設定 {expanded ? '▴' : '▾'}</span>
      </button>
      {expanded && <>
      <p className="text-xs text-[var(--color-text-muted)]">設定僅保留在本次頁面工作階段。</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs text-slate-300">
          提供商類型
          <select value={value.providerType} onChange={(e) => update({ providerType: e.target.value as 'custom' })}
            className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100">
            <option value="custom">Custom Provider</option>
          </select>
        </label>
        <label className="text-xs text-slate-300">
          模型
          <input value={value.model} onChange={(e) => update({ model: e.target.value })} placeholder="agnes-3.0-flash"
            className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
        </label>
      </div>
      <label className="block text-xs text-slate-300">
        API Base URL
        <input type="url" value={value.baseUrl} onChange={(e) => update({ baseUrl: e.target.value })}
          placeholder="https://apihub.agnes-ai.com/v1" className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
      </label>
      <label className="block text-xs text-slate-300">
        API Key（選填）
        <input type="password" value={value.apiKey} onChange={(e) => update({ apiKey: e.target.value })}
          autoComplete="off" placeholder="留空則使用伺服器端預設金鑰" className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100" />
      </label>
      <p className="text-[11px] text-amber-300/80">請勿把金鑰貼到案件內容；自訂 URL 僅接受 HTTPS 且會進行安全檢查。</p>
      </>}
    </section>
  );
};
