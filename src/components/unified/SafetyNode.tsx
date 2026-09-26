
import React, { useState } from 'react';
import { ShieldAlert, HelpCircle, PhoneCall, ShieldCheck } from 'lucide-react';
import { UIConstants } from '../../constants/ui';
import { extractIncidentDate, toCalendarDate } from '../../lib/forensicGuidance';

export interface SafetyNodeProps {
  [key: string]: any;
}

export const SafetyNode: React.FC<SafetyNodeProps> = (props) => {
  const {
    workflowState, supplementInput, setSupplementInput, isSubmitting,
    handleSupplementFact, showSafety = true, showQuestioning = true
  } = props;
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  // 採證時效由系統依事發日期推定，使用者可在面板上手動覆寫。
  const [windowOverride, setWindowOverride] = useState<boolean | null>(null);

  const safety = workflowState?.safety;
  const effectiveWithinWindow = windowOverride ?? safety?.withinForensicWindow ?? false;
  const extractedIncidentDate = extractIncidentDate(workflowState?.userNarrative || '').date;
  const effectiveIncidentDate = safety?.incidentDate
    || (extractedIncidentDate ? toCalendarDate(extractedIncidentDate) : '');

  const questioningOptions = (() => {
    const options = workflowState?.questioning?.suggestedOptions || [];
    const hasNegative = options.some((opt: string) => /無|沒有/.test(opt));
    return hasNegative ? options : [...options, '目前沒有其他資料'];
  })();
  const isSexualAutonomy = workflowState?.router?.chapter?.includes('性自主') ||
    Boolean(workflowState?.router?.cause?.includes('性自主')) ||
    /性自主|性侵|猥褻|乘機性交|強制性交/.test(workflowState?.userNarrative || '');

  return (
    <>
        {/* Safety Protection Node - 敏感案件保護提示（直接顯示保護指引與援助資源，無須阻擋點擊確認） */}
        {showSafety && workflowState?.safety && (
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
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 space-y-1.5">
              <label className="flex items-start gap-2 text-[11px] text-rose-200/90 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-slate-600 bg-slate-900 text-rose-400 focus:ring-rose-500"
                  checked={effectiveWithinWindow}
                  onChange={(e) => setWindowOverride(e.target.checked)}
                />
                <span>勾選表示本案<strong>仍發生於 72 小時採證保存時效內</strong>（系統{effectiveIncidentDate ? `依事發日 ${effectiveIncidentDate} 推定` : '未能取得事發日，預設視為已過時效'}，可手動更正）</span>
              </label>
              <p className="text-[11px] leading-5 text-rose-200/70">{safety?.forensicWindowLabel || '採證保存時效可能已過，請改以數位事證與證人陳述為主軸'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-semibold text-rose-300">
              <span className="flex items-center gap-1"><PhoneCall className="w-3.5 h-3.5 text-rose-400" /> 全國婦幼保護專線：113</span>
              <span className="flex items-center gap-1"><PhoneCall className="w-3.5 h-3.5 text-rose-400" /> 緊急報案：110</span>
              <span className="flex items-center gap-1"><PhoneCall className="w-3.5 h-3.5 text-rose-400" /> 衛福部安心專線：1925</span>
            </div>
            <div className="grid gap-2 pt-2 md:grid-cols-2">
              <div>
                <div className="font-bold text-rose-300 mb-1">立即行動</div>
                {workflowState.safety.immediateSteps
                  // 面板上方已逐一列出 113／110／1925，熱線不得在此重複出現
                  .filter((step: string) => !/(113|110|1925)|(婦幼保護專線|警察報案|安心專線)/.test(step))
                  .map((step: string) => <div key={step}>• {step}</div>)}
              </div>
              <div>
                <div className="font-bold text-rose-300 mb-1">證據保全</div>
                {workflowState.safety.preservationTips.map((tip: string) => <div key={tip}>• {tip}</div>)}
              </div>
            </div>
          </div>
        )}

        {/* Questioning Node */}
        {showQuestioning && workflowState?.questioning && workflowState.currentStep === 'QUESTIONING' && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-amber-200">動態追問節點</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${workflowState.questioning.generationMode === 'AI' ? 'bg-violet-500/20 text-violet-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {workflowState.questioning.generationMode === 'AI' ? 'AI 動態生成' : '規則式安全備援'}
              </span>
            </div>
            <p className="text-xs text-amber-200/80 leading-relaxed">{workflowState.questioning.rawMessage}</p>

            {/* 兩步驟：先選取再送出。過往點擊選項會立即送出，
                使用者看不到自己選了哪一項，也無法在送出前更正。 */}
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="補充事實選項">
              {questioningOptions.map((opt: string, i: number) => {
                const selected = selectedOption === opt;
                return (
                  <button
                    key={`${opt}-${i}`}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setSelectedOption(opt);
                      setSupplementInput(opt);
                    }}
                    disabled={isSubmitting}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      selected
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-amber-500/40'
                    }`}
                  >
                    {selected && <span aria-hidden="true">✓ </span>}
                    {opt}
                  </button>
                );
              })}
            </div>

            {selectedOption && (
              <p className="text-[11px] text-amber-200/80">已選：{selectedOption}</p>
            )}

            <div className="flex gap-3">
              <input
                value={supplementInput}
                onChange={(e) => {
                  setSupplementInput(e.target.value);
                  setSelectedOption(e.target.value.trim() ? selectedOption : null);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSupplementFact(); }}
                placeholder="或自行輸入補充事實..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                onClick={() => handleSupplementFact()}
                disabled={!supplementInput.trim() || isSubmitting}
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
