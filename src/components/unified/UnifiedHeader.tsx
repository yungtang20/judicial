
import React from 'react';
import { History, RotateCcw } from 'lucide-react';
import { RecentUsage } from '../RecentUsage';

export interface UnifiedHeaderProps {
  [key: string]: any;
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = (props) => {
  const { workflowState, showHistory, setShowHistory, historyList, handleResetWorkflow } = props;

  return (
    <>
        {/* 頂部 Header */}
        <header className="py-2 text-white relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                智慧法律統一分析工作台
              </h1>
              <div className="h-0.5 w-16 rounded-full bg-[var(--color-module-analysis)]" aria-hidden="true" />
              <p className="text-xs text-[var(--color-text-muted)] max-w-2xl leading-relaxed">
                輸入案件事實，由系統依序完成分流、法規檢索、法律分析與真確性檢核。
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <RecentUsage />
              {/* History button */}
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                <span>歷史記錄 ({historyList.length})</span>
              </button>

              {workflowState && (
                <button
                  type="button"
                  onClick={handleResetWorkflow}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>開立新案件</span>
                </button>
              )}
            </div>
          </div>
        </header>

    </>
  );
};
