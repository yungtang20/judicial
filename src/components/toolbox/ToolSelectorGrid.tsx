import React from 'react';
import { Calculator, Sparkles, ArrowRight } from 'lucide-react';
import { ToolDefinition } from '../../lib/legalToolRegistry';

export interface ToolSelectorGridProps {
  tools: ToolDefinition[];
  activeToolId: string;
  onSelect: (id: string) => void;
}

export const ToolSelectorGrid: React.FC<ToolSelectorGridProps> = ({ tools, activeToolId, onSelect }) => {
  if (tools.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-5 py-12 text-center">
        <p className="text-sm font-semibold text-slate-200">找不到符合條件的法律工具或試算器</p>
        <p className="mt-1 text-xs text-slate-400">請嘗試簡化搜尋關鍵字，或切換上方分類標籤。</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isSelected = activeToolId === tool.id;
        const isCalculator = tool.toolType === 'calculator' || tool.toolType === 'assessment';

        return (
          <button
            key={tool.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(tool.id)}
            className={`min-h-[140px] sm:min-h-[150px] rounded-2xl border p-4 sm:p-5 text-left transition-all duration-150 relative flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 active:scale-[0.99] ${
              isSelected
                ? 'border-blue-400 bg-gradient-to-br from-slate-900 to-blue-950/40 text-slate-100 ring-2 ring-blue-400/40 shadow-lg shadow-blue-950/20'
                : 'border-slate-800 bg-slate-900/80 text-slate-200 hover:border-slate-700 hover:bg-slate-800/90'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {tool.isNew && (
                    <span className="rounded-md bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                      新
                    </span>
                  )}
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      isCalculator 
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {tool.badge}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isSelected && (
                    <span className="text-[11px] font-semibold text-blue-300 animate-pulse">目前開啟</span>
                  )}
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-750'} transition-colors`}>
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </div>
                </div>
              </div>

              <h3 className="mt-3 text-sm font-bold leading-snug group-hover:text-blue-300 transition-colors">
                {tool.name}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
                {tool.shortDesc}
              </p>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
              <span className="truncate max-w-[75%]">依據：{tool.legalBasis}</span>
              <span className="font-semibold flex items-center gap-1 text-blue-400/90 group-hover:text-blue-300">
                {isCalculator ? '進入試算' : '產生書狀'}
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
