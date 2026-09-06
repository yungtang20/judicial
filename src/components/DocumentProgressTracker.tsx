import React from 'react';
import { Edit3, Cpu, LayoutTemplate, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export type DocumentGenerationStage = 'input' | 'analyzing' | 'formatting' | 'ready' | 'error';

interface DocumentProgressTrackerProps {
  currentStage: DocumentGenerationStage;
  className?: string;
  errorMessage?: string | null;
  onResetToInput?: () => void;
}

interface StepConfig {
  id: DocumentGenerationStage;
  title: string;
  subtitle: string;
  icon: React.ElementType<{ className?: string }>;
}

const STEPS: StepConfig[] = [
  {
    id: 'input',
    title: '資料輸入',
    subtitle: '當事人與事實填寫',
    icon: Edit3
  },
  {
    id: 'analyzing',
    title: 'AI 分析',
    subtitle: '構成要件與法條檢索',
    icon: Cpu
  },
  {
    id: 'formatting',
    title: '格式排版',
    subtitle: '司法實務書狀排版',
    icon: LayoutTemplate
  },
  {
    id: 'ready',
    title: '檢核完成',
    subtitle: '防虛構檢驗與交付',
    icon: ShieldCheck
  }
];

export const DocumentProgressTracker: React.FC<DocumentProgressTrackerProps> = ({
  currentStage,
  className = '',
  errorMessage,
  onResetToInput
}) => {
  const getStepStatus = (stepId: DocumentGenerationStage) => {
    if (currentStage === 'error') {
      if (stepId === 'input') return 'completed';
      return 'error';
    }

    const order: DocumentGenerationStage[] = ['input', 'analyzing', 'formatting', 'ready'];
    const currentIndex = order.indexOf(currentStage);
    const stepIndex = order.indexOf(stepId);

    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
  };

  const getProgressPercentage = () => {
    switch (currentStage) {
      case 'input':
        return 25;
      case 'analyzing':
        return 55;
      case 'formatting':
        return 85;
      case 'ready':
        return 100;
      case 'error':
        return 45;
      default:
        return 25;
    }
  };

  return (
    <div className={`bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-lg ${className}`}>
      {/* 頂部標題與目前進度百分比 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              currentStage === 'ready' 
                ? 'bg-emerald-400' 
                : currentStage === 'error' 
                ? 'bg-rose-400' 
                : 'bg-indigo-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              currentStage === 'ready' 
                ? 'bg-emerald-500' 
                : currentStage === 'error' 
                ? 'bg-rose-500' 
                : 'bg-indigo-500'
            }`} />
          </span>
          <h4 className="text-xs font-bold text-slate-200 tracking-wide">
            書狀產製流程進度
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold text-slate-400">
            {currentStage === 'input' && '步驟 1 / 4：填寫基本案情'}
            {currentStage === 'analyzing' && '步驟 2 / 4：法條與爭點分析中'}
            {currentStage === 'formatting' && '步驟 3 / 4：書狀格式標準化排版'}
            {currentStage === 'ready' && '完成：書狀已就緒可供使用'}
            {currentStage === 'error' && '產製中斷：需要補正'}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            currentStage === 'ready'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : currentStage === 'error'
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
          }`}>
            {getProgressPercentage()}%
          </span>
        </div>
      </div>

      {/* 總進度橫條 */}
      <div className="w-full bg-slate-950 rounded-full h-1.5 mb-5 overflow-hidden border border-slate-800/80">
        <div 
          className={`h-full transition-all duration-500 ease-out rounded-full ${
            currentStage === 'ready'
              ? 'bg-emerald-500'
              : currentStage === 'error'
              ? 'bg-rose-500'
              : 'bg-gradient-to-r from-indigo-500 via-sky-400 to-blue-500'
          }`}
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>

      {/* 4 步驟指示卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {STEPS.map((step, idx) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={`relative rounded-xl p-3 border transition-all duration-300 flex flex-col justify-between ${
                status === 'completed'
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                  : status === 'current'
                  ? 'bg-indigo-950/40 border-indigo-500/80 text-white shadow-md shadow-indigo-950/40'
                  : status === 'error'
                  ? 'bg-rose-950/20 border-rose-800/40 text-rose-400'
                  : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold opacity-60">
                  0{idx + 1}
                </span>
                {status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : status === 'current' ? (
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping shrink-0" />
                ) : status === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  status === 'completed'
                    ? 'bg-emerald-900/30 text-emerald-400'
                    : status === 'current'
                    ? 'bg-indigo-600/30 text-indigo-300'
                    : 'bg-slate-800/40 text-slate-600'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">
                    {step.title}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {step.subtitle}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 錯誤提示與重試機制 */}
      {errorMessage && (
        <div className="mt-3 p-3 bg-rose-950/40 border border-rose-600/50 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {onResetToInput && (
            <button
              onClick={onResetToInput}
              type="button"
              className="px-2.5 py-1 bg-rose-800/50 hover:bg-rose-700 text-white rounded-lg text-[11px] font-semibold transition-colors shrink-0"
            >
              返回修改資料
            </button>
          )}
        </div>
      )}
    </div>
  );
};
