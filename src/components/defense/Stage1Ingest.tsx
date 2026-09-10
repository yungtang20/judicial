import React from 'react';
import { Info, Sparkles } from 'lucide-react';

export interface Stage1IngestProps {
  clientStatement: string;
  setClientStatement: (v: string) => void;
  isLoadingTriage: boolean;
  handleRunTriage: () => void;
}

export const Stage1Ingest: React.FC<Stage1IngestProps> = ({
  clientStatement, setClientStatement, isLoadingTriage, handleRunTriage
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold">1</span>
            當事人原始陳述、筆記與抱怨內容輸入
          </h2>
          <p className="text-xs text-slate-500">可直接貼上當事人之 LINE 對話、會議錄音摘要、手寫筆記或情緒性長文</p>
        </div>
        <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 font-mono">
          {clientStatement.length} 字元
        </span>
      </div>
      <div>
        <textarea
          value={clientStatement}
          onChange={(e) => setClientStatement(e.target.value)}
          rows={7}
          placeholder="請在此輸入或貼上當事人所提供之原始文字..."
          className="w-full p-4 rounded-xl border border-slate-200 text-slate-800 text-sm leading-relaxed focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none font-sans"
        />
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="text-xs text-slate-500 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-slate-400" />
          系統將自動提取人事時地物、金流單據線索，並進行 B 點實益分流分析
        </div>
        <button
          onClick={handleRunTriage}
          disabled={isLoadingTriage || !clientStatement.trim()}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {isLoadingTriage ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              正在執行 B 點實益分流判定...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-200" />
              執行【B點實益分流判定】
            </>
          )}
        </button>
      </div>
    </div>
  );
};
