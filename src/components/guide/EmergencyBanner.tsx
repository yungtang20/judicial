
import React from 'react';
import {
  PhoneCall, Clock, HeartHandshake,
  Scale, BookOpen, ShieldAlert, Sparkles, Phone, ArrowRight,
  Search, ShieldCheck, FileText, ChevronRight, CheckCircle2,
  AlertTriangle, EyeOff, Lock, LifeBuoy, Zap, Camera, Mic, MapPin, X
} from 'lucide-react';

export interface EmergencyBannerProps {
  [key: string]: any;
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = (props) => {
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
        {/* 緊急安全支援指引（當使用者查詢性侵、暴力、保護令時主動顯示） */}
        {isSafetyQuery && (
          <div className="rounded-xl p-6 bg-rose-950/40 border border-rose-800/60 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-300 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <span>受害保護與緊急求助指引（男女平等受刑法保護）</span>
              </div>
              <a 
                href="tel:113" 
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                撥打 113 保護專線（24小時免費）
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-900/40 space-y-1">
                <div className="font-semibold text-rose-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-rose-400" /> 1. 非告訴乃論公訴罪
                </div>
                <p className="text-[var(--color-text-muted)] text-[11px] leading-relaxed">
                  刑法第221條妨害性自主為公訴罪，不受6個月告訴時效限制。不論受害者為男性或女性、不論加害者是否為現任伴侶/女友，法律一律平等究責追訴。
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-900/40 space-y-1">
                <div className="font-semibold text-amber-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" /> 2. 72小時驗傷採證黃金期
                </div>
                <p className="text-[var(--color-text-muted)] text-[11px] leading-relaxed">
                  請儘速前往公私立醫院急診進行「一站式性侵害採證」，切勿先行沐浴、刷牙或更換衣物，並將衣物放入紙袋保存DNA生物跡證。
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-900/40 space-y-1">
                <div className="font-semibold text-sky-200 flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-sky-400" /> 3. 伴侶保護令與社工陪同
                </div>
                <p className="text-[var(--color-text-muted)] text-[11px] leading-relaxed">
                  受親密伴侶肢體暴力、性暴力或恐嚇騷擾，可依家庭暴力防治法第63條之1聲請保護令；警詢與偵訊時可要求社工全程陪同並隱匿個人身分。
                </p>
              </div>
            </div>
          </div>
        )}

    </>
  );
};
