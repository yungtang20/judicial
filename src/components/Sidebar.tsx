import React, { useState } from 'react';
import {
  Scale,
  Compass,
  FileCheck2,
  Menu,
  X,
  Gavel,
} from 'lucide-react';
import { useToolContext } from '../contexts/ToolContext';

interface NavItem {
  id: string;
  label: string;
  sublabel: string;
  icon: any;
  children?: Array<{ label: string; badge: string; tab: string }>;
}

// 四個任務導向入口；其餘工具收進對應工作台，避免左側重複。
const coreEntries: NavItem[] = [
  {
    id: 'unified',
    label: '智慧案件分析工作台',
    sublabel: '案件事實 → 法律爭點與證據',
    icon: Compass,
  },
  {
    id: 'appeal',
    label: '智慧判決分析工作台',
    sublabel: '期限試算 · 判決剖析 · 訴訟防禦 · 爭點證據',
    icon: Scale,
    children: [
      { label: '上訴法定期間試算', badge: '期限', tab: 'deadline' },
      { label: '判決分析與上訴狀', badge: '上訴', tab: 'appeal' },
      { label: '雙軌訴訟防禦', badge: '防禦', tab: 'defense' },
      { label: '爭點與證據清單', badge: '附表', tab: 'issues' },
    ],
  },
  {
    id: 'litigation',
    label: '全方位實用法務工具箱',
    sublabel: '依情境選書狀 · 填資料 · 產製檢核',
    icon: Gavel,
    children: [
      { label: '書狀與法律文件製作', badge: '製作', tab: 'toolbox' },
    ],
  },
  {
    id: 'checker',
    label: '法律工具台',
    sublabel: '幽靈法條與假判決精準攔截 · 支援 PDF',
    icon: FileCheck2,
  },
];

const moduleColors: Record<string, string> = {
  unified: 'var(--color-module-analysis)',
  litigation: 'var(--color-module-litigation)',
  appeal: 'var(--color-module-appeal)',
  checker: '#059669',
};

export default function Sidebar() {
  const { activeTool, initialData, handleSelectTool } = useToolContext();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (id: string) =>
    activeTool === id ||
    (id === 'appeal' && ['appeal', 'smartAppeal', 'appealDeadline'].includes(activeTool)) ||
    (id === 'litigation' &&
      ['guide', 'processGuide', 'legalToolbox', 'sdlc', 'agent-chat', 'defenseWorkflow', 'issueTableGenerator', 'evidenceListGenerator'].includes(activeTool)) ||
    (id === 'checker' && ['docAiChecker', 'judicialOpenData', 'judgmentSearch'].includes(activeTool));
  const selectedTab = initialData?.initialTab ||
    (activeTool === 'smartAppeal' ? 'appeal' :
      (['appeal', 'appealDeadline'].includes(activeTool) ? 'deadline' :
        (activeTool === 'guide' ? 'guide' : (activeTool === 'litigation' ? 'toolbox' : undefined))));

  const handleNav = (id: string, tab?: string) => {
    handleSelectTool(id, tab);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
            <Scale className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-extrabold text-white tracking-tight">智慧法律書狀系統</h2>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
          aria-label={isOpen ? '關閉功能選單' : '開啟功能選單'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed lg:relative top-[65px] lg:top-0 left-0 w-3/4 max-w-[300px] lg:w-[240px] h-[calc(100vh-65px)] lg:h-screen bg-[var(--color-surface-base)] flex flex-col border-r border-slate-800/90 select-none transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Desktop Header */}
        <header className="hidden lg:block p-4 border-b border-slate-800 bg-[var(--color-surface-raised)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="m-0 text-base font-extrabold text-white tracking-tight leading-tight">
                智慧法律書狀系統
              </h2>
              <div className="text-[11px] text-[var(--color-text-muted)] font-medium mt-0.5">
                專業司法實務 · 智慧法務工作台
              </div>
            </div>
          </div>
        </header>

        {/* Section Label */}
        <div className="px-3 pt-3 pb-1">
          <div className="text-[10px] font-bold tracking-wider text-[var(--color-text-muted)] uppercase px-3 py-1.5">
            核心功能
          </div>
        </div>

        {/* Core Entry Points */}
        <ul className="list-none px-3 pb-2 m-0 space-y-1 flex-1 overflow-y-auto">
          {coreEntries.map((entry) => {
            const Icon = entry.icon;
            const active = isActive(entry.id);

            return (
              <li key={entry.id}>
                <button
                  onClick={() => handleNav(entry.id)}
                  className={`w-full text-left p-2.5 rounded-lg transition-colors ${
                    active
                      ? 'bg-slate-800 text-white'
                      : 'text-[var(--color-text-muted)] hover:bg-slate-900/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="p-1.5 rounded-lg text-white"
                      style={{ backgroundColor: moduleColors[entry.id] }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold leading-tight">{entry.label}</div>
                      <div className="mt-1 text-[10px] leading-4 text-[var(--color-text-muted)]">{entry.sublabel}</div>
                    </div>
                  </div>
                </button>
                {entry.children && (
                  <ul className="list-none m-0 ml-5 mt-1 space-y-1 border-l border-slate-800 pl-2">
                    {entry.children.map((child) => {
                      const childActive = active && selectedTab === child.tab;
                      return (
                        <li key={child.tab}>
                          <button
                            onClick={() => handleNav(entry.id, child.tab)}
                            className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                              childActive
                                ? 'bg-slate-800 text-white'
                                : 'text-[var(--color-text-muted)] hover:bg-slate-900/60 hover:text-slate-200'
                            }`}
                          >
                            <span className="font-semibold">{child.label}</span>
                            <span className="shrink-0 rounded-md bg-slate-900 px-1.5 py-0.5 text-[9px] text-slate-400">{child.badge}</span>
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
        <div className="p-4 border-t border-slate-800 bg-[var(--color-surface-raised)] mt-auto">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              司法院資料庫連線中
            </span>
            <span className="text-[var(--color-text-muted)] font-mono">v2.6</span>
          </div>
        </div>
      </nav>
    </>
  );
}
