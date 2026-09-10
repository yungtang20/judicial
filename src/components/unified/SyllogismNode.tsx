
import React from 'react';
import {
  Scale, Copy, Check, Download, Printer, ChevronDown, ChevronUp
} from 'lucide-react';

export interface SyllogismNodeProps {
  [key: string]: any;
}

export const SyllogismNode: React.FC<SyllogismNodeProps> = (props) => {
  const {
    workflowState,
    isCopied,
    isNode5Open,
    setIsNode5Open,
    handleCopyAnalysis,
    exportAsHtml,
    exportAsText,
    printReport
  } = props;

  if (!workflowState?.syllogism) return null;

  const syllogism = workflowState.syllogism;

  return (
    <div className="rounded-xl bg-[#0e1424] border border-slate-800 text-slate-100 overflow-hidden">
      {/* 節點 5 標頭列：極簡標題，操作按鈕集合 */}
      <div
        className="px-5 py-3.5 flex items-center justify-between cursor-pointer select-none bg-slate-900/50 hover:bg-slate-900/80 transition-colors"
        onClick={() => setIsNode5Open((prev: boolean) => !prev)}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
              分析結果
            </span>
            <h2 className="text-sm font-bold text-white">三段論涵攝法學分析</h2>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyAnalysis}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="複製分析結果"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? '已複製' : '複製'}</span>
            </button>
            <button
              onClick={() => exportAsHtml(workflowState)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="匯出 HTML"
            >
              HTML
            </button>
            <button
              onClick={() => exportAsText(workflowState)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="匯出 TXT"
            >
              TXT
            </button>
            <button
              onClick={() => printReport(workflowState)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="列印報告"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>列印</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsNode5Open((prev: boolean) => !prev)}
            className="p-1 rounded-lg hover:bg-slate-800 text-[var(--color-text-muted)] hover:text-slate-200 transition-colors ml-1"
          >
            {isNode5Open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 展開後的內容：採用極簡清單排列，消除巢狀卡片 */}
      {isNode5Open && (
        <div className="p-5 border-t border-slate-800/80">
          {syllogism.majorPremise || syllogism.minorPremise || syllogism.subsumption || syllogism.conclusion ? (
            <div className="divide-y divide-slate-800 text-xs">
              {syllogism.majorPremise && (
                <div className="py-3 flex flex-col md:flex-row md:items-start gap-3">
                  <div className="md:w-36 shrink-0">
                    <span className="font-bold text-blue-400 block">大前提</span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">法定規範與構成要件</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap flex-1">
                    {syllogism.majorPremise}
                  </p>
                </div>
              )}

              {syllogism.minorPremise && (
                <div className="py-3 flex flex-col md:flex-row md:items-start gap-3">
                  <div className="md:w-36 shrink-0">
                    <span className="font-bold text-amber-400 block">小前提</span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">案件事實認定</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap flex-1">
                    {syllogism.minorPremise}
                  </p>
                </div>
              )}

              {syllogism.subsumption && (
                <div className="py-3 flex flex-col md:flex-row md:items-start gap-3">
                  <div className="md:w-36 shrink-0">
                    <span className="font-bold text-indigo-400 block">涵攝過程</span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">事實與要件比對</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap flex-1">
                    {syllogism.subsumption}
                  </p>
                </div>
              )}

              {syllogism.conclusion && (
                <div className="py-3 flex flex-col md:flex-row md:items-start gap-3">
                  <div className="md:w-36 shrink-0">
                    <span className="font-bold text-emerald-400 block">效果與結論</span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">救濟權利與法律效果</span>
                  </div>
                  <p className="text-slate-200 font-medium leading-relaxed whitespace-pre-wrap flex-1">
                    {syllogism.conclusion}
                  </p>
                </div>
              )}

              {syllogism.fullAnalysis && (
                <div className="pt-3">
                  <span className="font-bold text-[var(--color-text-muted)] block mb-1.5">完整法學論述全文</span>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap font-mono text-[11px] bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    {syllogism.fullAnalysis}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {syllogism.fullAnalysis}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

