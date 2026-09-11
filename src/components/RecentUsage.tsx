import React, { useState, useEffect } from 'react';
import { Clock, Scale, Compass, FileText, ChevronDown } from 'lucide-react';
import { useToolContext } from '../contexts/ToolContext';

interface UsageRecord {
  toolId: string;
  label: string;
  timestamp: number;
}

const toolIcons: Record<string, any> = {
  unified: Compass,
  guide: Compass,
  litigation: FileText,
  appeal: Scale,
  smartAppeal: Scale,
  appealDeadline: Clock,
  'agent-chat': FileText,
  checker: FileText,
  sdlc: FileText,
};

const toolLabels: Record<string, string> = {
  unified: '案件分析',
  guide: '生活法律導診',
  litigation: '全方位實用法務工具箱',
  appeal: '智慧判決分析工作台',
  smartAppeal: '智慧判決分析工作台',
  appealDeadline: '上訴法定期間試算',
  'agent-chat': '智慧助理對話',
  checker: '判決檢索與防假檢核',
  sdlc: 'SDLC 交付工作台',
};

function loadRecent(): UsageRecord[] {
  try {
    const raw = localStorage.getItem('recent_tools');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is UsageRecord =>
        Boolean(item && typeof item === 'object' && typeof item.toolId === 'string' && typeof item.timestamp === 'number')
    );
  } catch {
    return [];
  }
}

function recordUsage(toolId: string, label: string) {
  try {
    if (typeof toolId !== 'string') return;
    const safeLabel = typeof label === 'string' ? label : String(toolId);
    const recent = loadRecent().filter((r) => r.toolId !== toolId);
    recent.unshift({ toolId, label: safeLabel, timestamp: Date.now() });
    localStorage.setItem('recent_tools', JSON.stringify(recent.slice(0, 6)));
  } catch {
    // localStorage unavailable
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '剛才';
  if (mins < 60) return `${mins} 分鐘前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

export function trackToolUsage(toolId: string) {
  if (typeof toolId !== 'string') return;
  const label = toolLabels[toolId] || toolId;
  recordUsage(toolId, label);
}

export const RecentUsage: React.FC = () => {
  const [recent, setRecent] = useState<UsageRecord[]>([]);
  const { handleSelectTool } = useToolContext();

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  if (recent.length === 0) return null;

  return (
    <details className="relative group">
      <summary className="list-none flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold cursor-pointer">
        <Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
        <span>最近使用</span>
        <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 md:left-auto md:right-0 z-30 mt-2 w-72 rounded-xl border border-slate-700 bg-[#0e1424] p-1.5 shadow-xl">
        {recent.slice(0, 4).map((item) => {
          const Icon = (typeof item.toolId === 'string' && toolIcons[item.toolId]) || FileText;
          const keyStr = `${String(item.toolId)}-${String(item.timestamp)}`;
          return (
            <button
              key={keyStr}
              onClick={() => handleSelectTool(String(item.toolId))}
              className="flex w-full items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors"
            >
              <Icon className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span className="flex-1 text-left">{String(item.label || item.toolId)}</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">{timeAgo(item.timestamp)}</span>
            </button>
          );
        })}
      </div>
    </details>
  );
};
