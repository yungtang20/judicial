import React from 'react';

export interface AttachmentHeaderValues {
  attachmentText: string;
  courtName: string;
  year: string;
  word: string;
  caseNo: string;
  submitter: string;
  submitDate: string;
}

interface AttachmentHeaderFieldsProps {
  values: AttachmentHeaderValues;
  onChange: (field: keyof AttachmentHeaderValues, value: string) => void;
  accent?: 'emerald' | 'slate';
  children?: React.ReactNode;
}

export function AttachmentHeaderFields({ values, onChange, accent = 'slate', children }: AttachmentHeaderFieldsProps) {
  const accentClass = accent === 'emerald'
    ? 'border-emerald-300 text-emerald-700'
    : 'border-slate-700 text-slate-400';
  const labelClass = 'block text-xs font-bold text-[var(--color-text-secondary)] mb-1';
  const inputClass = 'w-full border border-[var(--color-border-strong)] rounded p-1.5 text-xs bg-[var(--color-surface-overlay)]';

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${accent === 'emerald' ? 'bg-emerald-50/40' : 'bg-[var(--color-surface-raised)]'} ${accentClass}`}>
      <div className={`font-bold text-sm border-b pb-1 ${accent === 'emerald' ? 'border-emerald-300' : 'border-slate-700'}`}>
        案件基本資料
      </div>
      <div>
        <label className={labelClass}>附件文字</label>
        <input value={values.attachmentText} onChange={event => onChange('attachmentText', event.target.value)} className={inputClass} placeholder="附件" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="col-span-2">
          <label className={labelClass}>法院名稱</label>
          <input value={values.courtName} onChange={event => onChange('courtName', event.target.value)} className={inputClass} placeholder="臺灣高等法院" />
        </div>
        <div>
          <label className={labelClass}>年度</label>
          <input value={values.year} onChange={event => onChange('year', event.target.value)} className={`${inputClass} text-center font-mono`} placeholder="112" />
        </div>
        <div>
          <label className={labelClass}>字別</label>
          <input value={values.word} onChange={event => onChange('word', event.target.value)} className={`${inputClass} text-center font-mono`} placeholder="重上" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className={labelClass}>案號</label>
          <input value={values.caseNo} onChange={event => onChange('caseNo', event.target.value)} className={`${inputClass} font-mono`} placeholder="123" />
        </div>
        <div>
          <label className={labelClass}>提出人（簽章）</label>
          <input value={values.submitter} onChange={event => onChange('submitter', event.target.value)} className={inputClass} placeholder="例如：上訴人 王小明" />
        </div>
      </div>
      <div>
        <label className={labelClass}>提出日期</label>
        <input value={values.submitDate} onChange={event => onChange('submitDate', event.target.value)} className={inputClass} placeholder="例如：112年12月25日" />
      </div>
      {children}
    </div>
  );
}
