import React from 'react';
import { Search } from 'lucide-react';
import { LEGAL_TOOLS, TOOLBOX_CATEGORIES, CategoryGroupId } from '../../lib/legalToolRegistry';

export interface ToolboxHeaderProps {
  selectedGroup: string;
  onSelectGroup: (groupId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const TOOLBOX_GROUPS = [
  { id: 'ALL', label: '全部工具與試算' },
  ...TOOLBOX_CATEGORIES.map(cat => ({
    id: cat.id,
    label: cat.name
  }))
];

export const ToolboxHeader: React.FC<ToolboxHeaderProps> = ({
  selectedGroup,
  onSelectGroup,
  searchQuery,
  onSearchChange,
}) => {
  const countToolsInGroup = (group: string) =>
    group === 'ALL' ? LEGAL_TOOLS.length : LEGAL_TOOLS.filter(tool => tool.categoryGroup === group).length;

  return (
    <section className="border-b border-slate-800 pb-5 text-white" aria-labelledby="toolbox-heading">
      <div className="max-w-4xl">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">
            27+ 項專業法律工具
          </span>
          <span className="text-xs text-slate-400">即時試算 · 爭議評估 · 專業文件</span>
        </div>
        <h1 id="toolbox-heading" className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          全方位實用法務工具箱
        </h1>
        <p className="mt-2 text-xs sm:text-sm leading-6 text-slate-300">
          整合台灣家事、討債、車禍、勞資等四大常見爭議；自帶官方標準計算機、專業實務指引與防幽靈法規書狀產製。
        </p>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-400">核心爭議情境分類</h2>
          <span className="text-[11px] text-slate-500 sm:hidden">可左右滑動選擇</span>
        </div>
        <div className="mt-2 flex overflow-x-auto no-scrollbar gap-2 pb-1 sm:flex-wrap sm:pb-0 -mx-1 px-1">
          {TOOLBOX_GROUPS.map(group => {
            const active = selectedGroup === group.id;
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectGroup(group.id)}
                className={`min-h-11 rounded-xl border px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  active
                    ? 'border-blue-400 bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                {group.label} <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${active ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'}`}>{countToolsInGroup(group.id)}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <label htmlFor="legal-tool-search" className="mb-1.5 block text-xs font-semibold text-slate-300">
            搜尋工具、試算器或書狀（例如：扶養費、裁判費、折舊、特留分、存證信函）
          </label>
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="legal-tool-search"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="輸入關鍵字立即搜尋 27+ 項法律工具與試算..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
