import React from 'react';
import { ArrowRight, FolderLock, ShieldCheck, Search } from 'lucide-react';
import { LEGAL_TOOLS } from '../../lib/legalToolRegistry';

export interface ToolboxHeaderProps {
  selectedGroup: string;
  onSelectGroup: (groupId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNavigateUnified: () => void;
  onNavigateGuide: () => void;
}

export const ToolboxHeader: React.FC<ToolboxHeaderProps> = ({
  selectedGroup,
  onSelectGroup,
  searchQuery,
  onSearchChange,
  onNavigateUnified,
  onNavigateGuide
}) => {
  const countToolsInGroup = (group: string) => LEGAL_TOOLS.filter(t => t.categoryGroup === group).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
      <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
        <FolderLock className="w-80 h-80 text-blue-400" />
      </div>
      <div className="relative z-10 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={onNavigateGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            返回生活情境導診
          </button>
          <button
            onClick={onNavigateUnified}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            返回判決分析
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
            <FolderLock className="w-3.5 h-3.5" /> {LEGAL_TOOLS.length} 合 1 全方位實用法務工具總匯
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 引用掃描結果（不等同官方核實）
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
            收錄刑事 / 家事繼承 / 高齡監護 / 票據借貸 / 存證信函 / 強制執行 / 租賃侵權
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          全方位實用法務工具箱（Complete Legal Tools Hub）
        </h1>
        <p className="text-slate-300 text-sm max-w-4xl leading-relaxed">
          完整收錄臺灣司法實務 <strong>{LEGAL_TOOLS.length} 項必備非訟、訴狀、保護令、存證信函與試算工具</strong>。每項工具均內建法定要件防呆機制，並提供法律引用格式與本機索引比對；結果不等同官方核實，重要內容仍需人工查證。
        </p>
      </div>

      <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'ALL', label: `全部工具 (${LEGAL_TOOLS.length})` },
            { id: 'CRIMINAL', label: `刑事告訴/保護令 (${countToolsInGroup('CRIMINAL')})` },
            { id: 'FAMILY', label: `家事繼承 (${countToolsInGroup('FAMILY')})` },
            { id: 'ELDERLY', label: `高齡監護 (${countToolsInGroup('ELDERLY')})` },
            { id: 'DEBT_NOTE', label: `債權票據 (${countToolsInGroup('DEBT_NOTE')})` },
            { id: 'DEMAND_LETTER', label: `存證信函 (${countToolsInGroup('DEMAND_LETTER')})` },
            { id: 'EXECUTION', label: `強制執行 (${countToolsInGroup('EXECUTION')})` },
            { id: 'CONTRACT_REALESTATE', label: `租賃侵權 (${countToolsInGroup('CONTRACT_REALESTATE')})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => onSelectGroup(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all text-xs ${
                selectedGroup === tab.id
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`搜尋 ${LEGAL_TOOLS.length} 項工具或法條...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:border-blue-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
};
