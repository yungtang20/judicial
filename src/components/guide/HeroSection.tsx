
import React from 'react';
import {
  Compass,
  Scale, BookOpen, ShieldAlert, Sparkles, Phone, ArrowRight,
  Search, ShieldCheck, FileText, ChevronRight, CheckCircle2,
  AlertTriangle, EyeOff, Lock, LifeBuoy, Zap, Camera, Mic, MapPin, X
} from 'lucide-react';

export interface HeroSectionProps {
  [key: string]: any;
}

export const HeroSection: React.FC<HeroSectionProps> = (props) => {
  const {
    searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
    selectedScenario, setSelectedScenario, showAiTriageModal, setShowAiTriageModal,
    aiTriageLoading, setAiTriageLoading, aiTriageResult, setAiTriageResult,
    copiedDraft, setCopiedDraft, syllogismAnswers, setSyllogismAnswers,
    sourceTab, setSourceTab, isSafetyQuery, filteredScenarios, categories,
    QUICK_TAGS, handleRunAiTriage, handleLaunchScenario, handleSelectTool
  } = props;

  return (
    <>
        {/* Hero Banner: 非法律人友善引導 */}
        <div className="relative overflow-hidden rounded-xl bg-slate-900 border border-slate-800 p-6">
          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold tracking-wide">
              <Compass className="w-3.5 h-3.5" />
              非法律專業專用 · 生活情境智能導診
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
              您遇到什麼法律問題？<br />
              <span className="text-indigo-400">
                點選生活情境，3 秒找到解答與標準書狀
              </span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              不用背艱澀法條！直接選擇您發生的狀況，系統以白話文引導您了解
              <span className="text-amber-300 font-semibold">「何時提告、要花多少錢、該準備哪些證物」</span>，並依循司法實務規則一鍵產製具法律效力的合規書狀。
            </p>

            {/* 即時智慧搜尋欄 */}
            <div className="pt-2">
              <div className="relative flex items-center">
                <Search className="w-5 h-5 absolute left-4 text-[var(--color-text-muted)]" />
                <textarea rows={4}
                  
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && searchQuery.trim()) {
                      e.preventDefault();
                      handleRunAiTriage(searchQuery);
                    }
                  }}
                  placeholder="輸入任何法律問題或狀況，例如：被女友竊盜了、車禍受傷、房客欠租、朋友借錢、收到判決..."
                  className="w-full pl-12 pr-4 md:pr-44 pb-14 md:pb-3.5 py-3.5 min-h-[120px] resize-y rounded-xl bg-slate-950/80 border border-indigo-500/30 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <div className="absolute right-2.5 bottom-2.5 md:bottom-auto md:top-1/2 md:-translate-y-1/2 flex items-center gap-1.5">
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      清除
                    </button>
                  )}
                  <button
                    onClick={() => handleRunAiTriage(searchQuery)}
                    disabled={!searchQuery.trim() || aiTriageLoading}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI 診斷與產狀</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
            <Scale className="w-96 h-96 text-indigo-400" />
          </div>
        </div>

    </>
  );
};
