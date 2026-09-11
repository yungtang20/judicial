
import React from 'react';
import {
  Send, Sparkles, FileText, Loader2, Edit3
} from 'lucide-react';
import { UIConstants } from '../../constants/ui';

export interface InputNodeProps {
  [key: string]: any;
}

export const InputNode: React.FC<InputNodeProps> = (props) => {
  const { inputNarrative, setInputNarrative, isSubmitting, customPreset, setShowCustomPresetModal, setEditPresetTitle, setEditPresetNarrative, handleExecuteWorkflow, handleSaveCurrentAsCustomPreset, defaultSample } = props;

  const sampleCases = [
    { label: '租賃押金', narrative: defaultSample },
    { label: '家暴與人身安全', narrative: '我的同居伴侶長期對我施暴，昨天又動手毆打我致全身多處瘀傷，還在未經我同意下偷拍我的私密影像，威脅若我報警就要將影像散布到網路。我已前往醫院驗傷並取得診斷證明書，現場亦有破碎家具與血跡。' },
    { label: '欠款追討', narrative: '我三年前借了朋友新台幣十萬元，當時只有口頭約定，沒有簽借條。對方一直拖延說會還，但至今分文未付且已讀不回。我手上只有銀行轉帳記錄可以證明有匯款。' },
    { label: '交通罰單異議', narrative: '上週騎機車行經台北市忠孝東路與復興南路口時收到一張闖紅燈罰單，但我確定當時是綠燈才通過。我有行車記錄器畫面可以佐證，路口也有監視器。希望針對這張罰單提出異議。' },
    { label: '消費詐欺糾紛', narrative: '我上個月在蝦皮買了一台二手筆電，賣家在私訊裡保證全機功能正常、電池健康度90%，結果收到當天開機不到十分鐘就自動斷電，螢幕還有一條明顯綠線。我傳LINE要求退貨退款，他直接封鎖我，去賣場檢舉也沒用，我轉帳了兩萬八千元，有銀行交易截圖跟聊天對話截圖，我現在該怎麼告他詐欺或要回錢？' },
    { label: customPreset.title, narrative: customPreset.narrative },
  ];

  return (
    <>
        {/* 節點 1：案件事實輸入 */}
        <div className="p-6 rounded-xl bg-[var(--color-surface-raised)] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>案件事實描述</span>
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--color-text-muted)]">
                字數：{inputNarrative.length} 字
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <select
              defaultValue=""
              onChange={(event) => {
                const sample = sampleCases[Number(event.target.value)];
                if (sample) setInputNarrative(sample.narrative);
                event.target.value = '';
              }}
              className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-slate-300"
              aria-label="載入範例案件"
            >
              <option value="" disabled>載入範例案件…</option>
              {sampleCases.map((sample, index) => (
                <option key={`${sample.label}-${index}`} value={index}>{sample.label}</option>
              ))}
            </select>

            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setEditPresetTitle(customPreset.title);
                  setEditPresetNarrative(customPreset.narrative);
                  setShowCustomPresetModal(true);
                }}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-slate-800 hover:text-white transition-colors"
                title="編輯自訂預設案例"
                aria-label="編輯自訂預設案例"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentAsCustomPreset}
                className="px-2 py-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-slate-800 hover:text-slate-200 text-[11px] transition-colors"
                title="將目前輸入框內容存為自訂預設案例"
              >
                儲存目前內容
              </button>
            </div>
          </div>

          <textarea
            value={inputNarrative}
            onChange={(e) => setInputNarrative(e.target.value)}
            disabled={isSubmitting}
            placeholder="請直接輸入口語事實或案發經過（例如：我上個月在租屋處退租時房東扣住五萬元押金不還，說要收清潔費但沒收據...）"
            rows={5}
            className="w-full p-4 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors leading-relaxed placeholder:text-[var(--color-text-secondary)] disabled:opacity-50"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>輸入口語案情，系統會先追問關鍵事實，再整理法律爭點。</span>
            </div>

            <button
              type="button"
              onClick={() => handleExecuteWorkflow()}
              disabled={!inputNarrative.trim() || isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>分析與推論進行中...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>開始分析</span>
                </>
              )}
            </button>
          </div>
        </div>

    </>
  );
};
