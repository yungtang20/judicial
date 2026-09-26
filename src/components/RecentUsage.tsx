import React, { useState, useEffect } from 'react';
import { Clock, Scale, Compass, FileText, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToolContext } from '../contexts/ToolContext';
import { canonicalizeRoute, isAppRoute, type AppRoute } from '../types/navigation';

interface UsageRecord {
  route: AppRoute;
  label: string;
  timestamp: number;
}

interface LegacyUsageRecord {
  toolId: string;
  label: string;
  timestamp: number;
}

const toolIcons: Record<string, LucideIcon> = {
  analysis: Compass,
  litigation: FileText,
  appeal: Scale,
  checker: FileText,
  sdlc: FileText,
};

function routeLabel(route: AppRoute): string {
  if (route.view === 'analysis') return '案件分析';
  if (route.view === 'litigation') return route.section === 'guide' ? '生活法律導診' : '全方位實用法務工具箱';
  if (route.view === 'appeal') return route.section === 'deadline' ? '上訴法定期間試算' : '智慧判決分析工作台';
  if (route.view === 'process-guide') return '程序導覽';
  if (route.view === 'sdlc') return 'SDLC 交付工作台';
  if (route.view === 'agent-chat') return '智慧助理對話';
  return '判決檢索與防假檢核';
}

function isUsageRecord(item: unknown): item is UsageRecord {
  if (typeof item !== 'object' || item === null) return false;
  if (!('route' in item) || !isAppRoute(item.route)) return false;
  if (!('label' in item) || typeof item.label !== 'string') return false;
  return 'timestamp' in item && typeof item.timestamp === 'number';
}

function isLegacyUsageRecord(item: unknown): item is LegacyUsageRecord {
  if (typeof item !== 'object' || item === null) return false;
  if (!('toolId' in item) || typeof item.toolId !== 'string' || !item.toolId) return false;
  if (!('label' in item) || typeof item.label !== 'string') return false;
  return 'timestamp' in item && typeof item.timestamp === 'number';
}

function normalizeUsageRecord(item: unknown): UsageRecord | null {
  if (isUsageRecord(item)) return item;
  if (!isLegacyUsageRecord(item)) return null;
  const toolId = item.toolId === 'agentChat' ? 'agent-chat' : item.toolId;
  const canonicalRoute = canonicalizeRoute(toolId).route;
  const route = canonicalRoute.view === 'analysis' && toolId !== 'analysis' && toolId !== 'unified'
    ? { view: 'litigation', section: 'toolbox' } as const
    : canonicalRoute;
  return { route, label: item.label, timestamp: item.timestamp };
}

function loadRecent(): UsageRecord[] {
  try {
    const raw = localStorage.getItem('recent_tools');
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const records = parsed
      .map(normalizeUsageRecord)
      .filter((record): record is UsageRecord => record !== null);
    if (JSON.stringify(records) !== raw) {
      localStorage.setItem('recent_tools', JSON.stringify(records));
    }
    return records;
  } catch {
    return [];
  }
}

function recordUsage(route: AppRoute, label: string): void {
  try {
    const recent = loadRecent().filter(record => JSON.stringify(record.route) !== JSON.stringify(route));
    recent.unshift({ route, label, timestamp: Date.now() });
    localStorage.setItem('recent_tools', JSON.stringify(recent.slice(0, 6)));
  } catch {
    // localStorage unavailable
  }
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '剛才';
  if (mins < 60) return `${mins} 分鐘前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小時前`;
  return `${Math.floor(hours / 24)} 天前`;
}

export function trackToolUsage(route: AppRoute): void {
  recordUsage(route, routeLabel(route));
}

export const RecentUsage: React.FC = () => {
  const [recent, setRecent] = useState<UsageRecord[]>([]);
  const { navigate } = useToolContext();

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  if (recent.length === 0) return null;

  return (
    <details className="relative group">
      <summary className="list-none flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold cursor-pointer">
        <Clock className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
        <span>最近使用</span>
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 md:left-auto md:right-0 z-30 mt-2 w-72 rounded-xl border border-slate-700 bg-[var(--color-surface-raised)] p-1.5 shadow-xl">
        {recent.slice(0, 4).map((item) => {
          const Icon = toolIcons[item.route.view] || FileText;
          return (
            <button
              key={`${item.route.view}-${item.timestamp}`}
              onClick={() => navigate(item.route)}
              className="flex w-full items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors"
            >
              <Icon className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span className="flex-1 text-left">{item.label}</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">{timeAgo(item.timestamp)}</span>
            </button>
          );
        })}
      </div>
    </details>
  );
};
