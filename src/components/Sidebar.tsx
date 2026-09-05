import React, { useState } from 'react';
import {
  Scale,
  Compass,
  ChevronDown,
  ChevronRight,
  FileText,
  FileCheck2,
  ShieldAlert,
  Sparkles,
  Menu,
  X,
  Briefcase,
  Gavel,
} from 'lucide-react';

interface SidebarProps {
  activeTool: string;
  setActiveTool: (tool: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  sublabel: string;
  icon: any;
}

// 三大核心入口
const coreEntries: NavItem[] = [
  {
    id: 'unified',
    label: '案件分析',
    sublabel: '判決分析 · 情境導診 · 案件分類',
    icon: Scale,
  },
  {
    id: 'litigation',
    label: '文書生成',
    sublabel: '訴訟工作台 · SDLC · 上訴 · 爭點',
    icon: FileText,
  },
  {
    id: 'legalToolbox',
    label: '法律工具箱',
    sublabel: '20+ 法律實務工具',
    icon: Briefcase,
  },
];

// 文書生成子項目
const litigationSubItems: NavItem[] = [
  { id: 'litigation', label: '訴訟工作台', sublabel: '全生命週期法務', icon: Gavel },
  { id: 'sdlc', label: 'SDLC 工作台', sublabel: 'Plan → Design → Build → Test', icon: Sparkles },
  { id: 'agent-chat', label: '智慧助理', sublabel: '對話式法律談詢', icon: FileText },
  { id: 'checker', label: '判決檢索', sublabel: '司法院 API / 防假法條', icon: FileCheck2 },
  { id: 'docAiChecker', label: '文件合規', sublabel: 'AI 文件審查', icon: ShieldAlert },
];

// 案件分析子項目
const analysisSubItems: NavItem[] = [
  { id: 'unified', label: '判決分析', sublabel: 'StateGraph 自動化工作流', icon: Scale },
  { id: 'guide', label: '情境導診', sublabel: '生活問答 → 自動推薦', icon: Compass },
];

export default function Sidebar({ activeTool, setActiveTool }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const isActive = (id: string) =>
    activeTool === id ||
    (id === 'litigation' &&
      ['sdlc', 'agent-chat', 'checker', 'docAiChecker', 'judgmentSearch', 'smartAppeal', 'defenseWorkflow', 'appealDeadline', 'issueTableGenerator', 'evidenceListGenerator'].includes(activeTool)) ||
    (id === 'unified' && ['guide', 'processGuide'].includes(activeTool)) ||
    (id === 'checker' && ['docAiChecker', 'judicialOpenData', 'judgmentSearch'].includes(activeTool));

  const isSubActive = (id: string) => activeTool === id;

  const handleNav = (id: string) => {
    setActiveTool(id);
    setIsOpen(false);
    setExpandedGroup(null);
  };

  const toggleGroup = (id: string) => {
    setExpandedGroup(expandedGroup === id ? null : id);
    // If clicking the main item, also navigate to it
    if (id === 'unified' || id === 'litigation' || id === 'legalToolbox') {
      setActiveTool(id === 'legalToolbox' ? 'legalToolbox' : id);
    }
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white shadow-lg">
            <Scale className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-extrabold text-white tracking-tight">智慧法律書狀系統</h2>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed md:relative top-[65px] md:top-0 left-0 w-3/4 max-w-[300px] md:w-[290px] h-[calc(100vh-65px)] md:h-screen bg-slate-950 flex flex-col border-r border-slate-800 select-none shadow-2xl transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Desktop Header */}
        <header className="hidden md:block p-5 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="m-0 text-base font-extrabold text-white tracking-tight leading-tight">
                智慧法律書狀系統
              </h2>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                專業司法實務 · 智慧法務工作台
              </div>
            </div>
          </div>
        </header>

        {/* Section Label */}
        <div className="p-3">
          <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 py-1.5">
            核心功能
          </div>
        </div>

        {/* 3 Core Entry Points */}
        <ul className="list-none px-3 pb-2 m-0 space-y-2">
          {coreEntries.map((entry) => {
            const Icon = entry.icon;
            const active = isActive(entry.id);
            const expanded = expandedGroup === entry.id;
            const hasSubItems = entry.id === 'unified' || entry.id === 'litigation';

            return (
              <li key={entry.id}>
                <button
                  onClick={() => hasSubItems ? toggleGroup(entry.id) : handleNav(entry.id)}
                  className={`w-full text-left p-3 rounded-2xl transition-all duration-200 border ${
                    active
                      ? 'bg-indigo-500/20 text-white border-indigo-500/60 shadow-lg shadow-indigo-950/50'
                      : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl ${
                        active ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800/80 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold leading-tight">{entry.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                        {entry.sublabel}
                      </div>
                    </div>
                    {hasSubItems && (
                      <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </button>

                {/* Sub-items */}
                {hasSubItems && expanded && (
                  <ul className="list-none pl-3 mt-1 space-y-1">
                    {(entry.id === 'unified' ? analysisSubItems : litigationSubItems).map((item) => {
                      const ItemIcon = item.icon;
                      const subActive = isSubActive(item.id);
                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => handleNav(item.id)}
                            className={`w-full text-left p-2.5 rounded-xl transition-all duration-200 border flex items-center gap-2.5 ${
                              subActive
                                ? 'bg-slate-800 text-white border-slate-600'
                                : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 border-transparent'
                            }`}
                          >
                            <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                            <div className="text-left">
                              <div className="text-xs font-medium leading-tight">{item.label}</div>
                              <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{item.sublabel}</div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        {/* Bottom Status */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 space-y-3 mt-auto">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 hidden md:block">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>不知道該用哪一個？</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              點擊 <strong className="text-sky-400">案件分析 → 情境導診</strong>，輸入遇到的狀況，系統將自動為您推薦最適書狀與步驟。
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              司法院資料庫連線中
            </span>
            <span className="text-slate-400 font-mono">v2.6</span>
          </div>
        </div>
      </nav>
    </>
  );
}
