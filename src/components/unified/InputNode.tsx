
import React from 'react';
import {
  Send, Sparkles, FileText, Upload, Loader2, Edit3, FilePlus
} from 'lucide-react';
import { UIConstants } from '../../constants/ui';

export interface InputNodeProps {
  [key: string]: any;
}

export const InputNode: React.FC<InputNodeProps> = (props) => {
  const { inputNarrative, setInputNarrative, inputSource, setInputSource, isSubmitting, setIsSubmitting, workflowState, setWorkflowState, supplementInput, setSupplementInput, isCopied, setIsCopied, acknowledgeSafetyInSession, setAcknowledgeSafetyInSession, isNode2Open, setIsNode2Open, isNode4Open, setIsNode4Open, isNode5Open, setIsNode5Open, isNode6Open, setIsNode6Open, customPreset, setCustomPreset, showCustomPresetModal, setShowCustomPresetModal, editPresetTitle, setEditPresetTitle, editPresetNarrative, setEditPresetNarrative, fileInputRef, isDragOver, setIsDragOver, isParsingFiles, setIsParsingFiles, parsingStatus, setParsingStatus, batchQueue, setBatchQueue, batchIndex, setBatchIndex, isBatchRunning, setIsBatchRunning, showHistory, setShowHistory, historyList, setHistoryList, handleFiles, handleDrop, handleExecuteWorkflow, handleSupplementFact, handleProceedFromSafety, handleResetWorkflow, handleCopyAnalysis, loadFromHistory, handleBatchNext, handleBatchPrev, handleSaveCurrentAsCustomPreset, handleSelectSuggestedOption, handleSaveCustomPreset, handleToggleAllNodes, defaultSample, handleSelectTool, saveCrossFeatureContext, exportAsHtml, exportAsText, printReport, deleteFromHistory, clearHistory, loadHistory, showDocTypeModal, setShowDocTypeModal } = props;

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
        {/* Batch upload bar */}
        {batchQueue.length > 1 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-amber-300">
              <FilePlus className="w-4 h-4" />
              <span className="font-bold">批量模式：第 {batchIndex + 1} / {batchQueue.length} 份</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchPrev}
                disabled={batchIndex === 0}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs font-bold border border-slate-700"
              >
                上一份
              </button>
              <button
                onClick={handleBatchNext}
                disabled={batchIndex === batchQueue.length - 1}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs font-bold border border-slate-700"
              >
                下一份
              </button>
              <button
                onClick={() => { setBatchQueue([]); setBatchIndex(0); }}
                className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30"
              >
                結束批量
              </button>
            </div>
          </div>
        )}

        {/* 節點 1：單一入口文本輸入 + 拖曳上傳 */}
        <div
          className={`p-6 rounded-xl bg-[#0e1424] border transition-colors space-y-4 ${isDragOver ? 'border-indigo-400 bg-indigo-500/5' : 'border-slate-800'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>{inputSource === 'judgment_document' ? '已上傳裁判書' : '案件事實描述 / 法律書狀初稿'}</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsingFiles || isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
              >
                {isParsingFiles ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>解析 PDF 中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    <span>上傳裁判書 (PDF/TXT)</span>
                  </>
                )}
              </button>
              <span className="text-xs text-[var(--color-text-muted)]">
                字數：{inputNarrative.length} 字
              </span>
            </div>
          </div>

          {/* PDF / File Parsing Indicator */}
          {isParsingFiles && (
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center gap-3 text-xs text-indigo-300">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
              <span>{parsingStatus || '正在解析司法院裁判書 PDF 內容，請稍候...'}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <select
              defaultValue=""
              onChange={(event) => {
                const sample = sampleCases[Number(event.target.value)];
                if (sample) { setInputNarrative(sample.narrative); setInputSource('facts'); }
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
            disabled={isSubmitting || isParsingFiles}
            placeholder="請直接輸入口語事實或案發經過（例如：我上個月在租屋處退租時房東扣住五萬元押金不還，說要收清潔費但沒收據...）&#10;&#10;亦可點選右上角按鈕或直接拖曳上傳司法院裁判書 PDF 檔（.pdf）或文字檔（.txt）。"
            rows={5}
            className="w-full p-4 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors leading-relaxed placeholder:text-[var(--color-text-secondary)] disabled:opacity-50"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>支援口語輸入自動提煉爭點，或拖曳上傳裁判書（.pdf / .txt）</span>
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
                  <span>{inputSource === 'judgment_document' ? '分析裁判書' : '開始分析'}</span>
                </>
              )}
            </button>
          </div>
        </div>

    </>
  );
};
