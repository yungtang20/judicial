import React, { useState } from 'react';
import { 
  FileCheck2, 
  Database, 
  Search, 
  ShieldCheck, 
  Sparkles,
  BookOpen,
  Scale,
  FolderSearch
} from 'lucide-react';
import { LegalDocAiChecker } from './LegalDocAiChecker';
import JudicialOpenDataTool from './JudicialOpenDataTool';
import JudgmentSearchTool from './JudgmentSearchTool';

interface JudicialAndAiCheckerProps {
  initialTab?: 'antiGhost' | 'openData' | 'localSearch';
}

export const JudicialAndAiChecker: React.FC<JudicialAndAiCheckerProps> = ({ initialTab = 'antiGhost' }) => {
  const [activeTab, setActiveTab] = useState<'antiGhost' | 'openData' | 'localSearch'>(initialTab);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* 頂部導覽列 */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 md:px-8 py-3.5 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">司法院判決檢索與 AI 真確性檢核</h1>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold">
                  正版司法院資料庫連線
                </span>
              </div>
              <p className="text-xs text-slate-400">
                結合司法院開放資料官方 API、本機裁判書全文檢索，以及 AI 書狀真偽查核（防止生成虛構幽靈法條）
              </p>
            </div>
          </div>

          {/* 標籤頁切換 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('antiGhost')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'antiGhost'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AI 書狀真確性檢核 (Anti-Ghosting)</span>
            </button>

            <button
              onClick={() => setActiveTab('openData')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'openData'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>司法院開放資料平台 (JDoc / JList)</span>
            </button>

            <button
              onClick={() => setActiveTab('localSearch')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'localSearch'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <FolderSearch className="w-3.5 h-3.5" />
              <span>匯入裁判書全文檢索</span>
            </button>
          </div>
        </div>
      </div>

      {/* 內容區塊 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'antiGhost' && (
          <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <LegalDocAiChecker />
          </div>
        )}
        {activeTab === 'openData' && <JudicialOpenDataTool />}
        {activeTab === 'localSearch' && <JudgmentSearchTool />}
      </div>
    </div>
  );
};
