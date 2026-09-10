
import React from 'react';
import {
  DollarSign, Clock, HelpCircle,
  Scale, BookOpen, ShieldAlert, Sparkles, Phone, ArrowRight,
  Search, ShieldCheck, FileText, ChevronRight, CheckCircle2,
  AlertTriangle, EyeOff, Lock, LifeBuoy, Zap, Camera, Mic, MapPin, X
} from 'lucide-react';

export interface ScenarioListProps {
  [key: string]: any;
}

export const ScenarioList: React.FC<ScenarioListProps> = (props) => {
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
        {/* 分類標籤切換 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

          {/* 熱門關鍵字快捷搜尋 */}
          <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-800/50">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mr-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              快捷搜尋
            </span>
            {QUICK_TAGS.map((qt) => (
              <button
                key={qt.tag}
                onClick={() => {
                  setSearchQuery(qt.label);
                  setSelectedCategory(qt.tag);
                }}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                  selectedCategory === qt.tag
                    ? "bg-indigo-600 text-white border-indigo-500"
                    : "bg-slate-900/80 text-slate-300 border-slate-700/50 hover:border-indigo-600/50 hover:text-indigo-300"
                }`}
              >
                #{qt.label}
              </button>
            ))}
          </div>

        {/* 生活情境清單 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              常見法律狀況速查指引（共 {filteredScenarios.length} 種生活情境）
            </h2>
            <span className="text-xs text-slate-400">點選卡片查看詳細白話解法與必備文件</span>
          </div>

          {/* 當無靜態情境符合時呈現動態 AI 深度診斷卡 */}
          {filteredScenarios.length === 0 && (
            <div className="rounded-xl bg-slate-900 border border-indigo-500/30 p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-white">
                  針對「{searchQuery}」未找到預設情境？
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  別擔心！我國法律體系龐大，系統已配備<strong>全能 AI 法律爭議即時診斷與書狀生成器</strong>。請直接點擊下方按鈕，AI 將依據臺灣實體法與訴訟法為您即時診斷並產製標準書狀！
                </p>
              </div>
              <button
                onClick={() => handleRunAiTriage(searchQuery)}
                disabled={aiTriageLoading}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all inline-flex items-center gap-2"
              >
                {aiTriageLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>AI 正在深入診斷法律要件...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>立即啟動「{searchQuery}」AI 爭議診斷與書狀產製</span>
                  </>
                )}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredScenarios.map((scenario) => {
              const IconComponent = scenario.icon;
              return (
                <div
                  key={scenario.id}
                  className="rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-6 flex flex-col justify-between transition-all space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${scenario.color} border flex-shrink-0`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-slate-100 leading-snug">
                          {scenario.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {scenario.plainDesc}
                        </p>
                      </div>
                    </div>

                    {/* 資訊摘要 */}
                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="truncate text-slate-400">規費：<strong className="text-slate-200">{scenario.feeInfo.split('（')[0]}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="truncate text-slate-400">時效：<strong className="text-slate-200">{scenario.timeInfo.split('：')[1] || scenario.timeInfo}</strong></span>
                      </div>
                    </div>

                    {/* 標籤 */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {scenario.tags.slice(0, 4).map((tag, idx) => (
                        <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/50">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedScenario(scenario)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                      白話步驟與準備清單
                    </button>
                    <button
                      onClick={() => handleLaunchScenario(scenario)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      一鍵啟用此工具
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

    </>
  );
};
