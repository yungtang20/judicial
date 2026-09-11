
import React from 'react';
import {
  ShieldCheck, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';
import { formatVerificationStatus } from '../../lib/legalChapterLabels';

export interface VerificationNodeProps {
  [key: string]: any;
}

export const VerificationNode: React.FC<VerificationNodeProps> = (props) => {
  const { workflowState, isNode6Open, setIsNode6Open } = props;

  if (!workflowState?.verification) return null;

  const verification = workflowState.verification;
  const isPass = verification.passGate;

  return (
    <div className={`rounded-xl border transition-colors overflow-hidden ${isPass ? 'bg-[var(--color-surface-raised)] border-emerald-500/40' : 'bg-[#180f14] border-rose-500/40'}`}>
      {/* 節點 6 標頭：極簡條列化 */}
      <div
        className="px-5 py-3.5 flex items-center justify-between cursor-pointer select-none bg-slate-900/50 hover:bg-slate-900/80 transition-colors"
        onClick={() => setIsNode6Open((prev: boolean) => !prev)}
      >
        <div className="flex items-center gap-2.5">
          <span className={`text-xs px-2 py-0.5 rounded font-bold ${isPass ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
            {isPass ? '檢核通過' : '待人工審核'}
          </span>
          <div>
            <h2 className="text-sm font-bold text-white">真確性檢核結果</h2>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              檢核 {verification.totalChecked} 處 · 異常 {verification.ghostCount} 處 · {formatVerificationStatus(verification.verificationStatus)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsNode6Open((prev: boolean) => !prev)}
          className="p-1 rounded-lg hover:bg-slate-800 text-[var(--color-text-muted)] hover:text-slate-200 transition-colors"
        >
          {isNode6Open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* 展開之極簡證據清單 */}
      {isNode6Open && (
        <div className="p-4 border-t border-slate-800/80 space-y-2.5 text-xs">
          {verification.warningNotice && (
            <div className="py-2 text-slate-300 border-b border-slate-800">
              {verification.warningNotice}
            </div>
          )}

          {verification.officialEvidence && verification.officialEvidence.length > 0 ? (
            <div>
              <span className="text-[11px] font-bold text-[var(--color-text-muted)] block mb-1.5 uppercase tracking-wider">實質檢核明細清單</span>
              <div className="divide-y divide-slate-800">
                {verification.officialEvidence.map((item: any, i: number) => (
                  <div key={i} className="py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-slate-200">{item.citation}</span>
                      <span className="text-[var(--color-text-secondary)]">·</span>
                      <span className={item.status === 'VALID' ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                        {item.status}
                      </span>
                      {item.claimSupportStatus && (
                        <span className="text-[var(--color-text-muted)]">({item.claimSupportStatus})</span>
                      )}
                    </div>
                    {item.sourceUrl && (
                      <a
                        className="text-sky-400 hover:underline shrink-0"
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {item.source}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-amber-300/80 py-2">
              逐筆官方證據：無可查證引用（已納入保守防偽機制）
            </div>
          )}
        </div>
      )}
    </div>
  );
};

