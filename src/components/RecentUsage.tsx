import React, { useState, useEffect } from 'react';
import { Clock, Scale, Compass, FileText, ChevronRight } from 'lucide-react';

interface UsageRecord {
  toolId: string;
  label: string;
  timestamp: number;
}

interface RecentUsageProps {
  onSelectTool: (toolId: string) => void;
}

const toolIcons: Record<string, any> = {
  unified: Scale,
  guide: Compass,
  litigation: FileText,
  'agent-chat': FileText,
  checker: FileText,
  sdlc: FileText,
};

const toolLabels: Record<string, string> = {
  unified: '判決分析',
  guide: '生活情境導診',
  litigation: '訴訟工作台',
  'agent-chat': '智慧助理對話',
  checker: '判決檢索與防假檢核',
  sdlc: 'SDLC 交付工作台',
};

function loadRecent(): UsageRecord[] {
  try {
    const raw = localStorage.getItem('recent_tools');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function recordUsage(toolId: string, label: string) {
  try {
    const recent = loadRecent().filter((r) => r.toolId !== toolId);
    recent.unshift({ toolId, label, timestamp: Date.now() });
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
  const label = toolLabels[toolId] || toolId;
  recordUsage(toolId, label);
}

export const RecentUsage: React.FC<RecentUsageProps> = ({ onSelectTool }) => {
  const [recent, setRecent] = useState<UsageRecord[]>([]);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  if (recent.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>最近使用</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {recent.slice(0, 4).map((item) => {
          const Icon = toolIcons[item.toolId] || FileText;
          return (
            <button
              key={item.toolId + item.timestamp}
              onClick={() => onSelectTool(item.toolId)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 hover:border-slate-600 text-slate-200 text-xs font-medium transition-all group"
            >
              <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400" />
              <span>{item.label}</span>
              <span className="text-[10px] text-slate-500">{timeAgo(item.timestamp)}</span>
              <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
