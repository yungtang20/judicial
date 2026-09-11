import React from 'react';
import { Search } from 'lucide-react';
import { LEGAL_TOOLS } from '../../lib/legalToolRegistry';

export interface ToolboxHeaderProps {
  selectedGroup: string;
  onSelectGroup: (groupId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const TOOLBOX_GROUPS = [
  { id: 'ALL', label: '全部文件' },
  { id: 'GENERAL', label: '其他書狀需求' },
  { id: 'SAFETY', label: '安全與犯罪被害' },
  { id: 'DAMAGES', label: '車禍與損害賠償' },
  { id: 'FAMILY', label: '家庭、婚姻與繼承' },
  { id: 'ELDERLY', label: '長輩照護與監護' },
  { id: 'DEBT_EXECUTION', label: '借款、欠款與執行' },
  { id: 'HOUSING_WORK', label: '租屋、房產與職場' },
] as const;

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
      <div className="max-w-3xl">
        <h1 id="toolbox-heading" className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          選擇要製作的書狀或法律文件
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          依照遇到的情況選擇文件，填寫資料後即可產製；完成前會檢查法律引用。
        </p>
      </div>

      <div className="mt-5">
        <h2 className="text-xs font-semibold text-slate-400">文件用途</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {TOOLBOX_GROUPS.map(group => {
            const active = selectedGroup === group.id;
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectGroup(group.id)}
                className={`min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  active
                    ? 'border-blue-400 bg-blue-600 text-white'
                    : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
                }`}
              >
                {group.label} <span className={active ? 'text-blue-100' : 'text-slate-500'}>{countToolsInGroup(group.id)}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <label htmlFor="legal-tool-search" className="mb-1.5 block text-xs font-semibold text-slate-300">
            找特定書狀或文件
          </label>
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              id="legal-tool-search"
              type="search"
              placeholder="輸入問題、文件名稱或法條，例如：欠錢、離婚、存證信函"
              value={searchQuery}
              onChange={event => onSearchChange(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
