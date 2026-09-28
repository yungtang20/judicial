import React, { useMemo, useState } from 'react';
import {
  Scale,
  Compass,
  FileCheck2,
  Menu,
  X,
  Gavel,
  MessagesSquare,
  BookOpenCheck,
  type LucideIcon,
} from 'lucide-react';
import { useToolContext } from '../contexts/ToolContext';
import { canonicalizeRoute } from '../types/navigation';

interface NavItem {
  id: string;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  /**
   * 導覽目標。預設指向 id 自身；
   * 「我遇到問題要處理」改指向情境導診頁，因為點情境可直接派單到對應工具，
   * 比要求使用者先打字描述自己的狀況更省力。
   */
  target?: { toolId: string; tab?: string };
  children?: Array<{ label: string; badge: string; tab: string }>;
}

/**
 * 導覽分兩層。
 *
 * 主要入口用「一般民眾答得出來的問句」當標題，
 * 而不是功能模組名稱。先前列出 13 個工具，實際是依模組組織，
 * 使用者的思考卻是「我現在該做什麼」。
 *
 * SDLC 交付工作台是軟體工程工具（規劃到部署的階段閘門），
 * 與解決法律問題無關，已從使用者介面移除；
 * 路由與元件本身保留，開發使用不受影響。
 */
const primaryEntries: NavItem[] = [
  {
    id: 'unified',
    label: '我遇到問題要處理',
    sublabel: '點選你的情況，系統直接帶你到該做的事',
    icon: Compass,
    // 情境導診頁：16 個常見生活情境，點一下即派單到對應工具。
    // 先前這裡是空白輸入框，要求正在慌張的使用者組織語言描述狀況，
    // 是整條路徑上要求最高的一步。
    target: { toolId: 'litigation', tab: 'guide' },
  },
  {
    id: 'appeal',
    label: '我收到判決書了',
    sublabel: '先看期限還有多少天，再分析上訴怎麼打',
    icon: Scale,
    children: [
      { label: '還有多少時間可以上訴', badge: '期限', tab: 'deadline' },
      { label: '分析判決書，擬上訴狀', badge: '分析', tab: 'appeal' },
      { label: '準備防守與答辯', badge: '防禦', tab: 'defense' },
      { label: '整理爭點與證據', badge: '清單', tab: 'issues' },
    ],
  },
  {
    id: 'litigation',
    label: '我要自己做一份文件',
    sublabel: '選擇文件種類，填寫內容後產製',
    icon: Gavel,
    children: [
      { label: '選擇文件並填寫內容', badge: '製作', tab: 'toolbox' },
    ],
  },
];

/** 次要工具：具備特定需求時才會用到，收在主流程之外。 */
const secondaryEntries: NavItem[] = [
  {
    id: 'checker',
    label: '檢查文件有沒有問題',
    sublabel: '確認引用的法條與判決是真的',
    icon: FileCheck2,
  },
  {
    id: 'process-guide',
    label: '依案件類型看流程',
    sublabel: '該準備哪些文件、哪一間法院管轄',
    icon: BookOpenCheck,
  },
  {
    id: 'agent-chat',
    label: '問一個法律問題',
    sublabel: '逐題釐清你的案件事實',
    icon: MessagesSquare,
  },
];

/** AppRoute.view 與 NavItem.id 的對應，用於標示最近使用的項目。 */
const ROUTE_VIEW_TO_ENTRY_ID: Record<string, string> = {
  analysis: 'unified',
  litigation: 'litigation',
  appeal: 'appeal',
  'process-guide': 'process-guide',
  'agent-chat': 'agent-chat',
  checker: 'checker'
};

const RECENT_TOOLS_STORAGE_KEY = 'recent_tools';
const RECENT_ENTRY_LIMIT = 3;

function readRouteView(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('route' in value)) return null;
  const route = value.route;
  if (!route || typeof route !== 'object' || !('view' in route)) return null;
  const view = route.view;
  return typeof view === 'string' ? view : null;
}

function readRecentEntryIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_TOOLS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const ids: string[] = [];
    for (const item of parsed) {
      const view = readRouteView(item);
      if (!view) continue;
      const entryId = ROUTE_VIEW_TO_ENTRY_ID[view];
      if (entryId && !ids.includes(entryId)) ids.push(entryId);
    }
    return ids;
  } catch {
    return [];
  }
}

const moduleColors: Record<string, string> = {
  unified: 'var(--color-module-analysis)',
  litigation: 'var(--color-module-litigation)',
  appeal: 'var(--color-module-appeal)',
  checker: '#059669',
  'process-guide': '#7c3aed',
  sdlc: '#0891b2',
  'agent-chat': '#be185d',
};

export default function Sidebar() {
  const { route, navigate } = useToolContext();
  const [isOpen, setIsOpen] = useState(false);
  // 最近使用紀錄寫在 localStorage，本身不會觸發 React 重渲染；
  // 以 route 作為重算依據，讓使用者返回本頁時置頂區塊反映最新狀態。
  // 最近使用改為 id 清單：在主清單內標示即可，
  // 不再另開一個與主清單重疊的區塊。
  const recentEntryIds = useMemo(() => readRecentEntryIds().slice(0, RECENT_ENTRY_LIMIT), [route]);
  /** 入口的實際導覽目標：優先用 target，沒有就用 id 自身。 */
  const targetOf = (entry: NavItem): { toolId: string; tab?: string } =>
    entry.target ?? { toolId: entry.id };

  const isActive = (entry: NavItem) => {
    const { toolId, tab } = targetOf(entry);
    const { route: next } = canonicalizeRoute(toolId, tab);
    if (next.view !== route.view) return false;
    if (!('section' in next) || !('section' in route)) return true;
    return next.section === route.section;
  };
  const selectedTab = route.view === 'appeal'
    ? route.section === 'analysis' ? 'appeal' : route.section
    : route.view === 'litigation' ? route.section : undefined;

  const handleNav = (entry: NavItem, tab?: string) => {
    // 沒有指定子階段時，用 target 自帶的預設段落。
    // 否則「我遇到問題要處理」會因為只取 toolId 而落到 litigation 預設段落。
    const { toolId, tab: defaultTab } = targetOf(entry);
    const next = canonicalizeRoute(toolId, tab ?? defaultTab);
    navigate(next.route);
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

        {/* 主要入口。用問句當標題，讓一般民眾不必先知道要選哪一類。 */}
        <div className="px-3 pt-3 pb-1">
          <div className="text-[10px] font-bold tracking-wider text-[var(--color-text-muted)] uppercase px-3 py-1.5">
            從這裡開始
          </div>
        </div>

        {/* 最近使用不再另開一區。
            先前「核心功能」與「常用功能」放的是同一批項目，
            首頁並列顯示同一個工具兩次，使用者無從判斷兩區的差異。
            改為在主清單內標示，資訊只出現一次。 */}
        <ul className="list-none px-3 pb-2 m-0 space-y-1">
          {primaryEntries.map((entry) => {
            const Icon = entry.icon;
            const active = isActive(entry);
            const 最近用過 = recentEntryIds.includes(entry.id);


            return (
              <li key={entry.id}>
                <button
                  onClick={() => handleNav(entry)}
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold leading-tight">{entry.label}</span>
                        {最近用過 && !active && (
                          <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-300/90">
                            最近用過
                          </span>
                        )}
                      </div>
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
                            onClick={() => handleNav(entry, child.tab)}
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

        {/* 次要工具：具備特定需求時才會用到，不與主要流程競爭注意力。 */}
        <div className="px-3 pt-2 pb-1">
          <div className="text-[10px] font-bold tracking-wider text-[var(--color-text-muted)] uppercase px-3 py-1.5">
            其他工具
          </div>
        </div>
        <ul className="list-none px-3 pb-3 m-0 space-y-1">
          {secondaryEntries.map((entry) => {
            const Icon = entry.icon;
            const active = isActive(entry);
            return (
              <li key={entry.id}>
                <button
                  onClick={() => handleNav(entry)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    active
                      ? 'bg-slate-800 text-white'
                      : 'text-[var(--color-text-muted)] hover:bg-slate-900/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-semibold">{entry.label}</span>
                  </div>
                  <div className="mt-0.5 pl-5.5 text-[10px] leading-4 text-[var(--color-text-muted)]">
                    {entry.sublabel}
                  </div>
                </button>
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
