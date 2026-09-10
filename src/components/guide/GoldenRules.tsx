
import React from 'react';
import {
  Scale, BookOpen, ShieldAlert, Sparkles, Phone, ArrowRight,
  Search, ShieldCheck, FileText, ChevronRight, CheckCircle2,
  AlertTriangle, EyeOff, Lock, LifeBuoy, Zap, Camera, Mic, MapPin, X, BookmarkCheck
} from 'lucide-react';

export interface GoldenRulesProps {
  [key: string]: any;
}

export const GoldenRules: React.FC<GoldenRulesProps> = (props) => {
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
        {/* 新手自保 3 大黃金原則 */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
          <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4 text-indigo-400" />
            實務法務重點：非法律人打官司/自保 3 大黃金步驟
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
              <span className="inline-block px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">步驟 1</span>
              <h4 className="font-bold text-slate-200 text-sm">第一時間固定證據</h4>
              <p className="text-slate-400 leading-relaxed">
                車禍立即報警拿初判表、借錢留存對話與金流、外遇截圖存檔。證據越早固定，對方越無法事後卸責狡辯。
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
              <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">步驟 2</span>
              <h4 className="font-bold text-slate-200 text-sm">善用低成本非訟程序</h4>
              <p className="text-slate-400 leading-relaxed">
                不要動輒花幾萬元請律師打官司！優先使用「郵局存證信函（中斷時效）」或「法院支付命令（只要500元）」，以最低成本合法要錢。
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
              <span className="inline-block px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">步驟 3</span>
              <h4 className="font-bold text-slate-200 text-sm">切記法定不變期間</h4>
              <p className="text-slate-400 leading-relaxed">
                刑事車禍提告限期「6個月」、收到法院判決上訴限期「20天」、拋棄繼承限期「3個月」。逾期權利直接歸零喪失，萬萬不可拖延！
              </p>
            </div>
          </div>
        </div>
    </>
  );
};
