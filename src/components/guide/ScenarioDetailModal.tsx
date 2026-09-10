import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  DollarSign,
  FileSignature,
  Search,
  Sparkles
} from 'lucide-react';

export interface ScenarioItem {
  id: string;
  category: string;
  icon: LucideIcon;
  color: string;
  title: string;
  plainDesc: string;
  situation: string;
  recommendedAction: string;
  targetToolId: string;
  targetSubTab?: string;
  targetSubTool?: string;
  feeInfo: string;
  timeInfo: string;
  mustPrepare: string[];
  tags: string[];
}

export interface ScenarioDetailModalProps {
  scenario: ScenarioItem;
  onClose: () => void;
  onLaunch: (scenario: ScenarioItem) => void;
  onSelectTool: (toolId: string, subTab?: string, initialData?: unknown) => void;
}

export const ScenarioDetailModal: React.FC<ScenarioDetailModalProps> = ({
  scenario,
  onClose,
  onLaunch,
  onSelectTool
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
    <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
      <div className="flex items-start justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-800 border">
            {React.createElement(scenario.icon, { className: 'w-6 h-6' })}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{scenario.title}</h3>
            <span className="text-xs text-indigo-400 font-semibold">白話法律指引與教戰手冊</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4 text-xs md:text-sm">
        <div className="space-y-1.5 bg-slate-950/60 p-6 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> 什麼時候該用這個？（適用時機）
          </span>
          <p className="text-slate-300 leading-relaxed">{scenario.situation}</p>
        </div>

        <div className="space-y-1.5 bg-slate-950/60 p-6 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> 律師建議的最佳解法
          </span>
          <p className="text-slate-300 leading-relaxed">{scenario.recommendedAction}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-slate-950/60 p-6 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> 法院或行政規費
            </span>
            <p className="text-slate-300 text-xs">{scenario.feeInfo}</p>
          </div>
          <div className="bg-slate-950/60 p-6 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> 重要法定期間與時效
            </span>
            <p className="text-slate-300 text-xs">{scenario.timeInfo}</p>
          </div>
        </div>

        <div className="space-y-2 bg-slate-950/60 p-6 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> 必備文件與證據清單（請先準備好）
          </span>
          <ul className="space-y-1.5 pl-2">
            {scenario.mustPrepare.map((item, index) => (
              <li key={index} className="text-slate-300 text-xs flex items-start gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              onClose();
              onSelectTool('unified');
            }}
            className="px-3 py-2 rounded-xl bg-sky-950/60 text-sky-300 border border-sky-800/50 text-[11px] font-semibold hover:bg-sky-900/60 transition-all flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            查看類似判決
          </button>
          <button
            onClick={() => {
              onClose();
              onSelectTool('legalToolbox', undefined, {
                preselectedToolId: 'UNIVERSAL_AI_PLEADING',
                prefilledData: { incidentDetails: scenario.situation }
              });
            }}
            className="px-3 py-2 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-800/50 text-[11px] font-semibold hover:bg-amber-900/60 transition-all flex items-center gap-1.5"
          >
            <FileSignature className="w-3.5 h-3.5" />
            一鍵產書狀
          </button>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition-colors"
          >
            返回選單
          </button>
          <button
            onClick={() => {
              onClose();
              onLaunch(scenario);
            }}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            立即啟用此工具
          </button>
        </div>
      </div>
    </div>
  </div>
);
