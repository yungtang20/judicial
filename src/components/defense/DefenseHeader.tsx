import React from 'react';
import { ShieldAlert, BookOpen } from 'lucide-react';

export interface DefenseHeaderProps {
  onLoadPreset1: () => void;
  onLoadPreset2: () => void;
  onLoadPreset3: () => void;
}

export const DefenseHeader: React.FC<DefenseHeaderProps> = ({
  onLoadPreset1,
  onLoadPreset2,
  onLoadPreset3,
}) => {
  return (
    <div className="bg-[var(--color-surface-raised)] border border-slate-800 rounded-xl p-6 text-white relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> 訴訟防禦 × 當事人雙軌協同
            </span>
            <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-[var(--color-text-muted)] border border-slate-700">
              民訴§279自認防禦 · 7大問卷 · 責任隔離
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            AI 訴訟防禦與當事人雙軌工作流
          </h1>
          <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
            依據臺灣訴訟審判實務，針對當事人原始陳述進行「B點實益分流」。有實益事實進入【律師專業攻防軌】；無實益情緒啟動【Phase 2 溝通話術與 7 大問卷】。當事人若堅持送交法院，則啟動【Phase 3 6大不利自認地雷掃描】並產製責任隔離之《個人陳報狀》。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onLoadPreset1}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            title="載入借款自認案例"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" /> 載入借款自認爭議
          </button>
          <button
            onClick={onLoadPreset2}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            title="載入裝潢瑕疵案例"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" /> 載入工程瑕疵時效
          </button>
          <button
            onClick={onLoadPreset3}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            title="載入車禍過失案例"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> 載入車禍自述爭議
          </button>
        </div>
      </div>
    </div>
  );
};
