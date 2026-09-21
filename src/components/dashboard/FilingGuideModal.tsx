import React from 'react';

export interface FilingGuideModalProps {
  visible?: boolean;
  notice: string;
  filingFee?: string;
  opponentCount?: number;
  evidenceCodes?: string[];
  disclaimer?: string;
}

export default function FilingGuideModal({
  visible = true,
  notice,
  filingFee = '依訴訟標的金額及法院規定確認',
  opponentCount = 1,
  evidenceCodes = [],
  disclaimer = 'AI 產出僅供整理與核對，不能取代律師意見或法院正式審查。'
}: FilingGuideModalProps) {
  if (!visible) return null;
  return <details className="rounded-xl border border-slate-700 bg-slate-950/60 p-4" aria-label="立案指引">
    <summary className="cursor-pointer font-semibold text-amber-300">立案與交付前確認</summary>
    <div className="mt-2 space-y-2 text-sm text-slate-300">
      <p>{notice}</p>
      <p>應繳規費／裁判費：{filingFee}</p>
      <p>繕本份數：至少 {Math.max(1, opponentCount)} 份（依對造人數確認）。</p>
      <p>證物編碼提醒：{evidenceCodes.length ? evidenceCodes.join('、') : '請依附件順序標示證物一、二、三。'}</p>
      <p className="text-amber-200">{disclaimer}</p>
    </div>
  </details>;
}
