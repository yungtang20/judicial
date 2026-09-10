
import React from 'react';
import {
  Scale, BookOpen, ShieldAlert, Sparkles, Phone, ArrowRight,
  Search, ShieldCheck, FileText, ChevronRight, CheckCircle2,
  AlertTriangle, EyeOff, Lock, LifeBuoy, Zap, Camera, Mic, MapPin, X
} from 'lucide-react';

export interface DynamicBannerProps {
  [key: string]: any;
}

export const DynamicBanner: React.FC<DynamicBannerProps> = (props) => {
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
        {/* AI 即時動態導診橫幅（當有輸入內容時突顯） */}
        {searchQuery.trim().length > 0 && (
          <div className="p-6 rounded-xl bg-slate-900 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-spin-slow" />
                <span>AI 全能案件分析與法律書狀一鍵產製</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                針對您輸入的「<span className="text-amber-300 font-semibold">{searchQuery}</span>」，AI 可即時分析適用法條、程序管轄、公訴/告訴乃論時效防呆，並直接生成專屬訴狀草稿。
              </p>
            </div>
            <button
              onClick={() => handleRunAiTriage(searchQuery)}
              disabled={aiTriageLoading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-2 shrink-0 w-full md:w-auto justify-center"
            >
              {aiTriageLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>AI 正在深入診斷案件...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>立即為「{searchQuery.slice(0, 10)}...」進行 AI 診斷與產狀</span>
                </>
              )}
            </button>
          </div>
        )}

    </>
  );
};
