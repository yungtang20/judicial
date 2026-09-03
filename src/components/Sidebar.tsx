import React, { useState } from 'react';
import { 
  Layers,
  Compass, 
  FolderLock, 
  Scale, 
  FileCheck2, 
  Sparkles,
  ShieldAlert,
  Menu,
  X
} from 'lucide-react';

interface SidebarProps {
  activeTool: string;
  setActiveTool: (tool: string) => void;
}

export default function Sidebar({ activeTool, setActiveTool }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const mainNavItems = [
    { 
      id: 'unified', 
      label: '統一入口自動化工作流', 
      sublabel: 'StateGraph：Router ➔ 追問/保護 ➔ RAG ➔ 涵攝 ➔ 防偽閘門',
      icon: Layers, 
      badge: '統一入口',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
    },
    { 
      id: 'guide', 
      label: '生活情境智能導診', 
      sublabel: '非法律人生活問答指引',
      icon: Compass, 
      badge: '輔助模式',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
    },
    { 
      id: 'sdlc', 
      label: 'AI 原生 SDLC 交付工作台', 
      sublabel: 'Plan ➔ Design ➔ Build ➔ Test ➔ Deploy ➔ Maintain',
      icon: Sparkles, 
      badge: '工程骨架',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    },
    { 
      id: 'litigation', 
      label: '全生命週期法務與訴訟工作台', 
      sublabel: '整合法律工具箱 / 雙軌防禦 / 爭點 / 上訴',
      icon: Scale, 
      badge: '歷史工具庫',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
    },
    { 
      id: 'checker', 
      label: '判決檢索與 AI 防假檢核', 
      sublabel: '司法院官方API / 防幽靈假法條',
      icon: FileCheck2, 
      badge: '查核專區',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
    },
  ];

  return (
    <>
      {/* Mobile Header Toggle */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white shadow-lg">
            <Scale className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-extrabold text-white tracking-tight">
            智慧法律書狀系統
          </h2>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <nav className={`
        fixed md:relative top-[65px] md:top-0 left-0 w-3/4 max-w-[300px] md:w-[290px] h-[calc(100vh-65px)] md:h-screen
        bg-slate-950 flex flex-col border-r border-slate-800 select-none shadow-2xl
        transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* 頂部品牌標題 (Desktop only) */}
        <header className="hidden md:block p-5 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="m-0 text-base font-extrabold text-white tracking-tight leading-tight flex items-center gap-1.5">
                智慧法律書狀系統
              </h2>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                專業司法實務 · 智慧法務工作台
              </div>
            </div>
          </div>
        </header>

        {/* 核心分區選單 */}
        <div className="p-3">
          <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 py-1.5">
            主要功能分區
          </div>
        </div>

        <ul className="list-none px-3 pb-3 m-0 flex-grow space-y-2 overflow-y-auto">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTool === item.id || 
              (item.id === 'litigation' && ['smartAppeal', 'defenseWorkflow', 'appealDeadline', 'issueTableGenerator', 'evidenceListGenerator', 'legalToolbox'].includes(activeTool)) ||
              (item.id === 'checker' && ['docAiChecker', 'judicialOpenData', 'judgmentSearch'].includes(activeTool));
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveTool(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-2xl transition-all duration-200 border ${
                    isActive
                      ? 'bg-slate-900 text-white border-indigo-500/60 shadow-lg shadow-indigo-950/50'
                      : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800/80 text-slate-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm md:text-xs font-bold leading-tight">{item.label}</div>
                        <div className="text-[11px] md:text-[10px] text-slate-400 mt-0.5 leading-tight">{item.sublabel}</div>
                      </div>
                    </div>
                    {item.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {/* 底部服務狀態與指引 */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 space-y-3">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 hidden md:block">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>不知道該用哪一個？</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              直接點擊 <strong className="text-indigo-400">生活情境智能導診</strong>，輸入遇到的狀況，系統將自動為您推薦最適書狀與步驟。
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              司法院資料庫連線中
            </span>
            <span className="text-slate-400 font-mono">v2.5</span>
          </div>
        </div>
      </nav>
    </>
  );
}
