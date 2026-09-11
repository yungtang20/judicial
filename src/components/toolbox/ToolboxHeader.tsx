import React from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Car,
  CircleHelp,
  Coins,
  HeartHandshake,
  Home,
  Search,
  ShieldCheck,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { LEGAL_TOOLS } from '../../lib/legalToolRegistry';

export interface ToolboxHeaderProps {
  selectedGroup: string;
  onSelectGroup: (groupId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNavigateUnified: () => void;
  onNavigateGuide: () => void;
}

export const TOOLBOX_GROUPS = [
  { id: 'ALL', label: '全部需求', description: '瀏覽所有工具', icon: BriefcaseBusiness },
  { id: 'GENERAL', label: '不知道怎麼選', description: '先描述你的問題', icon: CircleHelp },
  { id: 'SAFETY', label: '安全與犯罪被害', description: '家暴、詐騙、恐嚇、性侵', icon: ShieldAlert },
  { id: 'DAMAGES', label: '車禍與損害賠償', description: '受傷、財損、精神慰撫金', icon: Car },
  { id: 'FAMILY', label: '家庭、婚姻與繼承', description: '離婚、遺囑、繼承分配', icon: Users },
  { id: 'ELDERLY', label: '長輩照護與監護', description: '監護、輔助與意定監護', icon: HeartHandshake },
  { id: 'DEBT_EXECUTION', label: '借款、欠款與執行', description: '催收、利息、扣押與查封', icon: Coins },
  { id: 'HOUSING_WORK', label: '租屋、房產與職場', description: '租約、工程瑕疵與勞資', icon: Home },
] as const;

export const ToolboxHeader: React.FC<ToolboxHeaderProps> = ({
  selectedGroup,
  onSelectGroup,
  searchQuery,
  onSearchChange,
  onNavigateUnified,
  onNavigateGuide,
}) => {
  const countToolsInGroup = (group: string) =>
    group === 'ALL' ? LEGAL_TOOLS.length : LEGAL_TOOLS.filter(tool => tool.categoryGroup === group).length;

  return (
    <section className="rounded-xl border border-slate-800 bg-[#0e1424] p-5 text-white md:p-6" aria-labelledby="toolbox-heading">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onNavigateGuide}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          回到生活法律導診
        </button>
        <button
          onClick={onNavigateUnified}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          前往智慧案件分析
        </button>
      </div>

      <div className="mt-5 max-w-3xl">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          共 {LEGAL_TOOLS.length} 項工具，產製後進行引用檢查
        </div>
        <h1 id="toolbox-heading" className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          你現在想處理哪一類法律問題？
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          不需要先判斷是民事或刑事。依照遇到的情況選分類，再挑選工具、填入資料並產製文件。
        </p>
        <ol className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300" aria-label="使用步驟">
          {['1 選擇生活情境', '2 挑選合適工具', '3 填資料並產製檢核'].map(step => (
            <li key={step} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5">{step}</li>
          ))}
        </ol>
      </div>

      <div className="mt-6 border-t border-slate-800 pt-5">
        <h2 className="text-sm font-bold text-white">依生活情境分類</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLBOX_GROUPS.map(group => {
            const Icon = group.icon;
            const active = selectedGroup === group.id;
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectGroup(group.id)}
                className={`min-h-16 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  active
                    ? 'border-blue-400 bg-blue-600 text-white'
                    : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 text-sm font-bold">
                      <span>{group.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-blue-950/30' : 'bg-slate-800 text-slate-400'}`}>
                        {countToolsInGroup(group.id)}
                      </span>
                    </span>
                    <span className={`mt-1 block text-xs leading-5 ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                      {group.description}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          <label htmlFor="legal-tool-search" className="mb-1.5 block text-xs font-semibold text-slate-300">
            找特定工具
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
