import React from 'react';
import { ToolDefinition } from '../../lib/legalToolRegistry';

export interface ToolSelectorGridProps {
  tools: ToolDefinition[];
  activeToolId: string;
  onSelect: (id: string) => void;
}

export const ToolSelectorGrid: React.FC<ToolSelectorGridProps> = ({ tools, activeToolId, onSelect }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isSelected = activeToolId === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => onSelect(tool.id)}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 ${
              isSelected
                ? 'bg-blue-600/90 border-blue-400 text-white ring-2 ring-blue-400/40 shadow-lg font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/90 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-blue-400'}`} />
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950/60 text-slate-300 border border-slate-700">
                  {tool.badge}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold leading-snug line-clamp-1">{tool.name}</div>
              <div className="text-[10px] opacity-75 line-clamp-1 mt-0.5">{tool.legalBasis}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
