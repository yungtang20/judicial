import React from 'react';
import { Edit3, Cpu, LayoutTemplate, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { UIConstants } from '../constants/ui';

export type DocumentGenerationStage = 'input' | 'analyzing' | 'formatting' | 'ready' | 'error';

interface DocumentProgressTrackerProps {
  currentStage: DocumentGenerationStage;
  className?: string;
  errorMessage?: string | null;
  onResetToInput?: () => void;
}

const STAGE_LABELS: Record<DocumentGenerationStage, { title: string; desc: string }> = {
  input: { title: '資料填寫', desc: '案情與要素輸入中' },
  analyzing: { title: '智慧分析', desc: '檢索法條與法定構成要件' },
  formatting: { title: '書狀排版', desc: '套用司法實務標準格式' },
  ready: { title: '完成就緒', desc: '書狀已產製完成，隨時可匯出' },
  error: { title: '需修正補充', desc: '請檢視提示並補充資料' }
};

export const DocumentProgressTracker: React.FC<DocumentProgressTrackerProps> = ({
  currentStage,
  className = '',
  errorMessage,
  onResetToInput
}) => {
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

  const percentage = getProgressPercentage();
  const currentInfo = STAGE_LABELS[currentStage] || STAGE_LABELS.input;

  return (
    <div className={`${UIConstants.cardCompact} ${className}`}>
      {/* 簡約進度列：清晰報告當前進程 */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${
            currentStage === 'ready' 
              ? 'bg-emerald-400' 
              : currentStage === 'error' 
              ? 'bg-rose-400' 
              : 'bg-sky-400'
          }`} />
          <span className="text-xs font-bold text-slate-200">
            {currentInfo.title}
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            · {currentInfo.desc}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-slate-400">
            {currentStage === 'ready' ? '100%' : `${percentage}%`}
          </span>
          <span className={
            currentStage === 'ready'
              ? UIConstants.badgeSuccess
              : currentStage === 'error'
              ? UIConstants.badgeDanger
              : UIConstants.badgePrimary
          }>
            {currentStage === 'ready' ? '完成' : currentStage === 'error' ? '待查' : '處理中'}
          </span>
        </div>
      </div>

      {/* 極簡進度條 */}
      <div className={UIConstants.progressBar}>
        <div 
          className={`${UIConstants.progressFill} ${
            currentStage === 'ready'
              ? 'bg-emerald-500'
              : currentStage === 'error'
              ? 'bg-rose-500'
              : 'bg-sky-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* 錯誤提示與返回按鈕 */}
      {errorMessage && (
        <div className="mt-3 p-3 bg-rose-950/40 border border-rose-700/40 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {onResetToInput && (
            <button
              onClick={onResetToInput}
              type="button"
              className="px-2.5 py-1 bg-rose-800/60 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors shrink-0"
            >
              返回修改
            </button>
          )}
        </div>
      )}
    </div>
  );
};
