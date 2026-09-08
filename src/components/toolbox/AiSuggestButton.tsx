import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

export interface AiSuggestButtonProps {
  fieldLabel: string;
  fieldKey: string;
  toolName: string;
  incidentDetails: string;
  onSelect: (val: string) => void;
}

export const AiSuggestButton: React.FC<AiSuggestButtonProps> = ({ fieldLabel, fieldKey, toolName, incidentDetails, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  
  const handleSuggest = async () => {
    if (options.length > 0) {
      setIsOpen(!isOpen);
      return;
    }
    setIsLoading(true);
    setIsOpen(true);
    try {
      const res = await fetch('/api/workflow/suggest-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldLabel, toolName, incidentDetails })
      });
      const data = await res.json();
      if (data.success && data.options) {
        setOptions(data.options);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); handleSuggest(); }}
        className="flex items-center gap-1 text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded transition-all"
        disabled={isLoading}
      >
        <Sparkles className="w-3 h-3" /> AI 建議
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 z-50 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden p-2">
          {isLoading ? (
            <div className="text-xs text-slate-400 p-2 text-center animate-pulse">產生中...</div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center px-1 mb-1">
                <span className="text-[10px] font-bold text-slate-400">選擇一項快速帶入</span>
                <button type="button" onClick={() => setIsOpen(false)} className="text-[10px] text-slate-500 hover:text-slate-300">關閉</button>
              </div>
              {options.map((opt, i) => (                <button                  type="button"                  key={i}                  onClick={(e) => { e.preventDefault(); onSelect(opt); setIsOpen(false); }}                  className="text-left text-xs p-1.5 rounded bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700/50 transition-colors"                >                  {opt}                </button>              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
