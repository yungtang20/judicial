
import React from 'react';
import { LEGAL_TOOLS } from '../../lib/legalToolRegistry';
import {
  Compass, FileCheck2,
  Scale, BookOpen, ShieldAlert, Sparkles, Phone, ArrowRight,
  Search, ShieldCheck, FileText, ChevronRight, CheckCircle2,
  AlertTriangle, EyeOff, Lock, LifeBuoy, Zap, Camera, Mic, MapPin, X
} from 'lucide-react';

export interface QuickEntrySectionProps {
  [key: string]: any;
}

export const QuickEntrySection: React.FC<QuickEntrySectionProps> = (props) => {
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
        {/* 法律流程引導（互動式表單）橫幅推薦 */}
        <div 
          onClick={() => handleSelectTool('processGuide')}
          className="cursor-pointer rounded-xl p-6 bg-slate-900 border border-indigo-500/30 hover:border-indigo-400 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-600 text-white shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  法律流程引導精靈（互動式問答與案件過濾）
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  性侵/家暴/人身案件安全篩查
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                不確定自己的遭遇屬於民事或刑事？透過 4 步驟互動問答，自動分析法律屬性、檢查時效與舉證要件，並指引專屬處置路徑。
              </p>
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
          >
            <span>開始流程引導</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3大核心捷徑入口 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            onClick={() => handleSelectTool('legalToolbox')}
            className="group cursor-pointer rounded-xl p-6 bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition-all relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                {LEGAL_TOOLS.length} 項實用法務
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-4 group-hover:text-indigo-300 transition-colors">
              常用生活法務與契約總匯
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
              妨害性自主告訴、親密關係保護令、車禍、借據、存證信函、支付命令、自書遺囑。
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
              立即前往產生書狀 <ChevronRight className="w-4 h-4 ml-0.5" />
            </div>
          </div>

          <div 
            onClick={() => handleSelectTool('litigation', 'defense')}
            className="group cursor-pointer rounded-xl p-6 bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition-all relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Scale className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800/60">
                一站式工作台
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-4 group-hover:text-amber-300 transition-colors">
              訴訟與上訴一站式中心
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
              判決書智慧上訴、原告/被告防禦、爭點證據整理、法定 20 天期限試算。
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
              進入訴訟分析系統 <ChevronRight className="w-4 h-4 ml-0.5" />
            </div>
          </div>

          <div 
            onClick={() => handleSelectTool('checker')}
            className="group cursor-pointer rounded-xl p-6 bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                司法院 API 整合
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-4 group-hover:text-emerald-300 transition-colors">
              判決檢索與 AI 防幽靈檢核
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
              查裁判白話文解讀、書狀一鍵查核「幽靈假法條與假案號」真實性。
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              檢驗文件與查判決 <ChevronRight className="w-4 h-4 ml-0.5" />
            </div>
          </div>
        </div>

    </>
  );
};
