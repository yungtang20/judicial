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
    <section className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-3" aria-label="AI 提供商設定">
      <button type="button" onClick={() => setExpanded((open) => !open)} className="w-full text-left">
        <h2 className="text-sm font-bold text-indigo-200">AI 提供商設定 {expanded ? '▾' : '▸'}</h2>
        <p className="text-xs text-slate-400 mt-1">可在每次工作流執行前切換相容 OpenAI API 的模型；設定只保留在本次頁面工作階段。</p>
      </button>
      {!expanded ? <p className="text-xs text-indigo-300">目前：Custom Provider · {value.model}</p> : null}
      {expanded && <>
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
