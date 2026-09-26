import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  FileCheck2
} from 'lucide-react';
import { CitationVerificationResult } from '../types';

export interface AntiGhostBadgeProps {
  verification?: {
    totalCitationsChecked: number;
    ghostCitationsFound: number;
    verifiedCitations: CitationVerificationResult[];
  };
  compact?: boolean;
  className?: string;
}

export const AntiGhostBadge: React.FC<AntiGhostBadgeProps> = ({
  verification,
  compact = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const citations = verification?.verifiedCitations ?? [];
  const total = verification?.totalCitationsChecked ?? 0;
  // 幽靈數量必須取實際值。先前硬寫「0 處幽靈」且固定用綠色打勾，
  // 即使文件確實含有幽靈法條，標題仍宣稱零幽靈，與下方明細自相矛盾。
  const ghosts = verification?.ghostCitationsFound ?? 0;
  const unverified = citations.filter(c => !c.verified).length;
  const isClean = ghosts === 0 && unverified === 0;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${isClean ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' : 'bg-rose-950/80 text-rose-300 border-rose-500/40'} ${className}`}>
        {isClean ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
        <span>引用掃描結果（不等同官方核實）</span>
        {total > 0 && (
          <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono" style={{ background: isClean ? 'bg-emerald-900/80' : 'bg-rose-900/80' }}>
            {ghosts > 0 ? `${ghosts} 處幽靈` : `${total} 處已檢驗`}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-slate-950 border border-emerald-900/50 rounded-xl p-3.5 md:p-4 text-xs text-white space-y-3 ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
              引用掃描結果 (Citation Scan)
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                本機比對
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              顯示本機規則比對結果；未索引或 heuristic 項目仍需人工查證，不代表官方核實。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono font-bold flex items-center gap-1 ${isClean ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40' : 'bg-rose-950/90 text-rose-300 border-rose-500/40'}`}>
            {isClean ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
            {ghosts > 0
              ? `已檢驗 ${total} 處 · ${ghosts} 處幽靈法條，不得用於主張`
              : unverified > 0
                ? `已檢驗 ${total} 處 · ${unverified} 處未查證，請人工確認`
                : total > 0 ? `已檢驗 ${total} 處法規/字號 · 0 處幽靈` : '司法院實體法條規則檢核通過'}
          </span>
          {citations.length > 0 && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{isOpen ? '收合引述' : '檢視引述細節'}</span>
              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Verified Citations List */}
      {citations.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          <div className="text-[11px] text-[var(--color-text-muted)] font-medium flex items-center justify-between">
            <span>比對到的法條與實務判例標籤：</span>
            <span className="text-[10px] text-[var(--color-text-muted)]">點擊可查看官方要旨與來源</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {citations.map((c, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  c.isGhostOrFake 
                    ? 'bg-rose-950/70 text-rose-300 border-rose-500/40'
                    : 'bg-slate-900 text-slate-200 border-slate-700/80 hover:border-emerald-500/60'
                }`}
                title={c.officialSnippet || c.officialTitle}
              >
                {c.isGhostOrFake ? (
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                )}
                <span>{c.officialTitle || c.citationText}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-[var(--color-text-muted)] uppercase font-mono">
                  {c.type === 'PRECEDENT' ? '判例/裁判' : '實體法規'}
                </span>
              </span>
            ))}
          </div>

          {/* Expanded Details */}
          {isOpen && (
            <div className="mt-3 p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5 max-h-60 overflow-y-auto">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
            本機比對詳情與來源連結：
              </div>
              <div className="space-y-2">
                {citations.map((c, idx) => (
                  <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        {c.officialTitle || c.citationText}
                      </span>
                      {c.officialSourceUrl && (
                        <a
                          href={c.officialSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 underline"
                        >
                          官方資料庫來源 <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    {c.officialSnippet && (
                      <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800 font-mono">
                        {c.officialSnippet}
                      </p>
                    )}
                    {c.correctionSuggestion && (
                      <div className="text-[10px] text-amber-300 bg-amber-950/40 p-1.5 rounded border border-amber-800/40">
                        {c.correctionSuggestion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

