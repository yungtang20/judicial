import React, { useState } from 'react';
import {
  Scale,
  Compass,
  ChevronDown,
  FileText,
  FileCheck2,
  ShieldAlert,
  Sparkles,
  Menu,
  X,
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

const moreTools: NavItem[] = [
  {
    id: 'sdlc',
    label: 'AI 原生 SDLC 交付工作台',
    sublabel: 'Plan ➜ Design ➜ Build ➜ Test',
    icon: Sparkles,
  },
  {
    id: 'litigation',
    label: '全生命週期法務與訴訟工作台',
    sublabel: '整合法律工具箱 / 雙軌防禦 / 爭點 / 上訴',
    icon: Scale,
  },
  {
    id: 'agent-chat',
    label: '法律智慧助理對話',
    sublabel: '狀態對話式法律談詢',
    icon: FileText,
  },
  {
    id: 'checker',
    label: '判決檢索與 AI 防假檢核',
    sublabel: '司法院官方API / 防幽靈假法條',
    icon: FileCheck2,
  },
  {
    id: 'docAiChecker',
    label: '文件合規檢核',
    sublabel: 'AI 文件審查與合規驗證',
    icon: ShieldAlert,
  },
];

export default function Sidebar({ activeTool, setActiveTool }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const isActive = (id: string) =>
    activeTool === id ||
    (id === 'litigation' &&
      ['smartAppeal', 'defenseWorkflow', 'appealDeadline', 'issueTableGenerator', 'evidenceListGenerator', 'legalToolbox'].includes(activeTool)) ||
    (id === 'checker' && ['docAiChecker', 'judicialOpenData', 'judgmentSearch'].includes(activeTool));

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

        {/* Main Nav: 3 items */}
        <div className="p-3">
          <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 py-1.5">
            核心功能
          </div>
        </div>

        <ul className="list-none px-3 pb-2 m-0 space-y-2">
          {/* #1: 判決分析 */}
          <li>
            <button
              onClick={() => {
                setActiveTool('unified');
                setIsOpen(false);
                setShowMore(false);
              }}
              className={`w-full text-left p-3 rounded-2xl transition-all duration-200 border ${
                isActive('unified')
                  ? 'bg-indigo-500/20 text-white border-indigo-500/60 shadow-lg shadow-indigo-950/50'
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border-slate-800/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    isActive('unified') ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800/80 text-slate-400'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold leading-tight">判決分析</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                    統一入口 · StateGraph 自動化工作流
                  </div>
                </div>
              </div>
            </button>
          </li>

          {/* #2: 生活情境導診 */}
          <li>
            <button
              onClick={() => {
                setActiveTool('guide');
                setIsOpen(false);
                setShowMore(false);
              }}
              className={`w-full text-left p-3 rounded-2xl transition-all duration-200 border ${
                isActive('guide')
                  ? 'bg-sky-500/20 text-white border-sky-500/60 shadow-lg shadow-sky-950/50'
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border-slate-800/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    isActive('guide') ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800/80 text-slate-400'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold leading-tight">生活情境導診</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                    非法律人生活問答指引
                  </div>
                </div>
              </div>
            </button>
          </li>

          {/* #3: 更多工具 Dropdown */}
          <li>
            <button
              onClick={() => setShowMore(!showMore)}
              className={`w-full text-left p-3 rounded-2xl transition-all duration-200 border ${
                showMore || moreTools.some((t) => isActive(t.id))
                  ? 'bg-slate-800 text-white border-slate-600'
                  : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border-slate-800/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-xl ${showMore ? 'bg-slate-700 text-slate-200' : 'bg-slate-800/80 text-slate-400'}`}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold leading-tight">更多工具</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                      文書生成 · 檢核 · 高階工具
                    </div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showMore ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showMore && (
              <ul className="list-none pl-3 mt-1 space-y-1">
                {moreTools.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          setActiveTool(item.id);
                          setIsOpen(false);
                          setShowMore(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all duration-200 border flex items-center gap-2.5 ${
                          active
                            ? 'bg-slate-800 text-white border-slate-600'
                            : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 border-transparent'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
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
        </ul>

        {/* Bottom Status */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 space-y-3 mt-auto">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 hidden md:block">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>不知道該用哪一個？</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              點擊 <strong className="text-sky-400">生活情境導診</strong>，輸入遇到的狀況，系統將自動為您推薦最適書狀與步驟。
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
