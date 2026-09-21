import React, { useRef } from 'react';
import { FileUp, Mic, Search, Sparkles } from 'lucide-react';

export interface StorytellingInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  onFileSelected?: (file: File) => void;
  onVoiceInput?: () => void;
}

export default function StorytellingInput({ value, onChange, onSubmit, loading = false, onFileSelected, onVoiceInput }: StorytellingInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  return <form className="mt-5" onSubmit={event => { event.preventDefault(); if (value.trim()) onSubmit(); }}>
    <label htmlFor="legal-situation" className="mb-2 block text-sm font-semibold text-slate-200">發生了什麼事？</label>
    <div className="relative">
      <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500" aria-hidden="true" />
      <textarea id="legal-situation" rows={3} value={value} onChange={event => onChange(event.target.value)} placeholder="例如：房客積欠三個月租金，我想終止租約並請他搬離" className="min-h-28 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30" />
    </div>
    <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) onFileSelected?.(file); }} />
    <div className="mt-3 flex flex-wrap justify-end gap-2">
      <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"><FileUp className="h-4 w-4" aria-hidden="true" />上傳判決書</button>
      <button type="button" onClick={() => onVoiceInput?.()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"><Mic className="h-4 w-4" aria-hidden="true" />語音輸入</button>
      {value && <button type="button" onClick={() => onChange('')} className="min-h-11 rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">清除</button>}
      <button type="submit" disabled={!value.trim() || loading} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"><Sparkles className="h-4 w-4" aria-hidden="true" />{loading ? '分析中…' : '開始分析'}</button>
    </div>
  </form>;
}
