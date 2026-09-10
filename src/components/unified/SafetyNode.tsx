
import React from 'react';
import { ShieldAlert, HelpCircle, PhoneCall, ShieldCheck } from 'lucide-react';
import { UIConstants } from '../../constants/ui';

export interface SafetyNodeProps {
  [key: string]: any;
}

export const SafetyNode: React.FC<SafetyNodeProps> = (props) => {
  const { workflowState, supplementInput, setSupplementInput, acknowledgeSafetyInSession, isSubmitting, handleSupplementFact, handleProceedFromSafety, handleResetWorkflow, handleSelectSuggestedOption } = props;

  const isSexualAutonomy = workflowState?.router?.chapter?.includes('性自主') ||
    Boolean(workflowState?.router?.cause?.includes('性自主')) ||
    /性自主|性侵|猥褻|乘機性交|強制性交/.test(workflowState?.userNarrative || '');

  return (
    <>
        {/* Safety Protection Node - 敏感案件保護提示（直接顯示保護指引與援助資源，無須阻擋點擊確認） */}
        {workflowState?.safety && (
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-2.5 text-xs text-rose-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                <span>{isSexualAutonomy ? '性自主保護指引與援助資源（已自動加載）' : '敏感法律保護指引與社會援助資源（已自動加載）'}</span>
              </div>
              <span className={UIConstants.badgeDanger}>保護指引已啟用</span>
            </div>
            <p className="opacity-90 leading-relaxed">
              {isSexualAutonomy
                ? '本件已自動附帶性自主權益保護資源。若有人身危難或急迫採證需求，請優先保全生物檢體與通話紀錄，並可即刻撥打 24 小時免付費保護專線。'
                : '本案件涉及敏感法律領域，系統已自動加載心理支持與人身安全指引。分析持續進行，若有緊急危難請即刻尋求專業或緊急救助。'}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-semibold text-rose-300">
              <span className="flex items-center gap-1"><PhoneCall className="w-3.5 h-3.5 text-rose-400" /> 全國婦幼保護專線：113</span>
              <span className="flex items-center gap-1"><PhoneCall className="w-3.5 h-3.5 text-rose-400" /> 緊急報案：110</span>
              <span className="flex items-center gap-1"><PhoneCall className="w-3.5 h-3.5 text-rose-400" /> 衛福部安心專線：1925</span>
            </div>
          </div>
        )}

        {/* Questioning Node */}
        {workflowState?.questioning && !workflowState?.router?.is_complete && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-amber-200">動態追問節點</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${workflowState.questioning.generationMode === 'AI' ? 'bg-violet-500/20 text-violet-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {workflowState.questioning.generationMode === 'AI' ? 'AI 動態生成' : '規則式安全備援'}
              </span>
            </div>
            <p className="text-xs text-amber-200/80 leading-relaxed">{workflowState.questioning.rawMessage}</p>

            <div className="flex flex-wrap gap-2">
              {workflowState.questioning.suggestedOptions?.map((opt: string, i: number) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectSuggestedOption(opt)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 hover:border-amber-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <input
                value={supplementInput}
                onChange={(e) => setSupplementInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSupplementFact(); }}
                placeholder="或自行輸入補充事實..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                onClick={() => handleSupplementFact()}
                disabled={!supplementInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-bold transition-colors"
              >
                送出補充
              </button>
            </div>
          </div>
        )}

    </>
  );
};
