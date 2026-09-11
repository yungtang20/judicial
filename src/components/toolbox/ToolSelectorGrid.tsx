import React from 'react';
import { ToolDefinition } from '../../lib/legalToolRegistry';

export interface ToolSelectorGridProps {
  tools: ToolDefinition[];
  activeToolId: string;
  onSelect: (id: string) => void;
}

export const ToolSelectorGrid: React.FC<ToolSelectorGridProps> = ({ tools, activeToolId, onSelect }) => {
  if (tools.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-5 py-10 text-center">
        <p className="text-sm font-semibold text-slate-200">找不到符合條件的工具</p>
        <p className="mt-1 text-xs text-slate-400">請縮短搜尋文字，或改用其他生活情境分類。</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isSelected = activeToolId === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(tool.id)}
            className={`min-h-36 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              isSelected
                ? 'border-blue-400 bg-slate-900 text-slate-100 ring-1 ring-blue-400/40'
                : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-700 hover:bg-slate-800/90'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${isSelected ? 'bg-blue-950/30 text-blue-300' : 'bg-slate-800 text-blue-300'}`}>
                {tool.badge}
              </span>
              <div className="flex items-center gap-2">
                {isSelected && <span className="text-[11px] font-semibold text-blue-300">目前選擇</span>}
                <Icon className="h-5 w-5 shrink-0 text-blue-400" aria-hidden="true" />
              </div>
            </div>
            <h3 className="mt-3 text-sm font-bold leading-5">{tool.name}</h3>
            <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-400">{tool.shortDesc}</p>
            <p className="mt-3 text-[11px] leading-4 text-slate-500">依據：{tool.legalBasis}</p>
          </button>
        );
      })}
    </div>
  );
};
