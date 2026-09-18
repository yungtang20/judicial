
import React from 'react';
import {
  Send, Sparkles, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  Cpu, Layers, FileCheck2, FileText, RotateCcw, Copy, Check, Loader2,
  ChevronRight, ArrowRight, HelpCircle, Clock, BookOpen, Scale,
  Upload, History, Download, Printer, Trash2, X, FilePlus, ChevronDown,
  ChevronUp, Star, Edit3, Plus, Bookmark, PenTool, LayoutTemplate, MessageSquare
} from 'lucide-react';
import { formatLegalChapter, formatVerificationStatus } from '../../lib/legalChapterLabels';

export interface SettingsModalProps {
  [key: string]: any;
}

export const SettingsModal: React.FC<SettingsModalProps> = (props) => {
  const { inputNarrative, setInputNarrative, isSubmitting, setIsSubmitting, workflowState, setWorkflowState, supplementInput, setSupplementInput, isCopied, setIsCopied, acknowledgeSafetyInSession, setAcknowledgeSafetyInSession, isNode2Open, setIsNode2Open, isNode4Open, setIsNode4Open, isNode5Open, setIsNode5Open, isNode6Open, setIsNode6Open, customPreset, setCustomPreset, showCustomPresetModal, setShowCustomPresetModal, editPresetTitle, setEditPresetTitle, editPresetNarrative, setEditPresetNarrative, fileInputRef, isDragOver, setIsDragOver, isParsingFiles, setIsParsingFiles, parsingStatus, setParsingStatus, batchQueue, setBatchQueue, batchIndex, setBatchIndex, isBatchRunning, setIsBatchRunning, showHistory, setShowHistory, historyList, setHistoryList, handleFiles, handleDrop, handleExecuteWorkflow, handleSupplementFact, handleProceedFromSafety, handleResetWorkflow, handleCopyAnalysis, loadFromHistory, handleBatchNext, handleBatchPrev, handleSaveCurrentAsCustomPreset, handleSelectSuggestedOption, handleSaveCustomPreset, handleToggleAllNodes, defaultSample, handleSelectTool, saveCrossFeatureContext, exportAsHtml, exportAsText, printReport, deleteFromHistory, clearHistory, loadHistory, showDocTypeModal, setShowDocTypeModal } = props;

  return (
    <>
        {/* Document Type Selection Modal */}
        {showDocTypeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">選擇要產製的法律文書</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">根據案情階段推薦適合的法院或正式書面文件：</p>
                </div>
                <button
                  onClick={() => setShowDocTypeModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
                {/* 1. 民事起訴狀（一般案件事實最首要、最常見之法院起訴文書） */}
                <button
                  onClick={() => {
                    setShowDocTypeModal(false);
                    saveCrossFeatureContext({
                      documentType: 'civil_complaint',
                      partyName: workflowState?.router?.cause || '',
                      scenarioKeywords: workflowState?.router?.cause || '',
                      domain: workflowState?.router?.domain || '民事',
                      cause: workflowState?.router?.cause,
                      facts: workflowState?.userNarrative || '',
                      verificationStatus: workflowState?.verification?.verificationStatus,
                      sourceTool: 'unified'
                    });
                    handleSelectTool('litigation', undefined, {
                      initialTab: 'toolbox',
                      preselectedToolId: 'CIVIL_COMPLAINT_GENERAL',
                      facts: workflowState?.userNarrative || '',
                      autoGenerate: true
                    });
                  }}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-sky-500/40 hover:border-sky-400 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm text-sky-300 group-hover:text-sky-200">民事起訴狀</div>
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-medium">起訴首選</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">案件尚未經法院判決，向地方法院正式提起訴訟，請求判賠或履行義務</div>
                </button>

                {/* 2. 刑事告訴狀（若涉及刑事犯罪時適用） */}
                {workflowState?.router?.domain === '刑事' && (
                  <button
                    onClick={() => {
                      setShowDocTypeModal(false);
                      saveCrossFeatureContext({
                        documentType: 'criminal_complaint',
                        partyName: workflowState?.router?.cause || '',
                        scenarioKeywords: workflowState?.router?.cause || '',
                        domain: '刑事',
                        cause: workflowState?.router?.cause,
                        facts: workflowState?.userNarrative || '',
                        verificationStatus: workflowState?.verification?.verificationStatus,
                        sourceTool: 'unified'
                      });
                      handleSelectTool('litigation', undefined, {
                        initialTab: 'toolbox',
                        preselectedToolId: 'CRIMINAL_COMPLAINT_TRAFFIC',
                        facts: workflowState?.userNarrative || '',
                        autoGenerate: true
                      });
                    }}
                    className="w-full text-left p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-rose-500/40 hover:border-rose-400 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-rose-300 group-hover:text-rose-200">刑事告訴狀</div>
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-medium">刑事偵查</span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1">針對詐欺、過失傷害、恐嚇等刑事犯罪，向地檢署提出正式告訴</div>
                  </button>
                )}

                {/* 3. 存證信函（訴前催告、中斷時效） */}
                <button
                  onClick={() => {
                    setShowDocTypeModal(false);
                    saveCrossFeatureContext({
                      documentType: 'demand_letter',
                      partyName: workflowState?.router?.cause || '',
                      scenarioKeywords: workflowState?.router?.cause || '',
                      domain: workflowState?.router?.domain,
                      cause: workflowState?.router?.cause,
                      facts: workflowState?.userNarrative || '',
                      verificationStatus: workflowState?.verification?.verificationStatus,
                      sourceTool: 'unified'
                    });
                    handleSelectTool('litigation', undefined, {
                      initialTab: 'toolbox',
                      preselectedToolId: 'CIVIL_DEMAND_LETTER_GENERAL',
                      facts: workflowState?.userNarrative || '',
                      autoGenerate: true
                    });
                  }}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm text-amber-300 group-hover:text-amber-200">存證信函</div>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">訴前催告</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">以郵局標準正式書面限期對方處理，留存法定催告依據並中斷消滅時效</div>
                </button>

                {/* 4. 上訴狀（根據案件情境檢查器：若無判決或為新案，則自動停用） */}
                {workflowState?.router?.has_judgment === false || workflowState?.router?.is_new_case === true ? (
                  <div className="w-full text-left p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/50 cursor-not-allowed opacity-50 relative overflow-hidden">
                    <div className="absolute inset-0 bg-slate-900/40 z-10 flex items-center justify-center">
                      <span className="bg-slate-800 text-slate-300 text-xs px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 border border-slate-700">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        情境檢查：尚未有第一審判決，不適用上訴狀
                      </span>
                    </div>
                    <div className="flex items-center justify-between opacity-40">
                      <div className="font-bold text-sm text-indigo-300">上訴理由狀</div>
                      <span className="text-[10px] bg-slate-500/20 text-slate-400 border border-slate-500/30 px-2 py-0.5 rounded-full font-medium">已有判決才適用</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 opacity-40">已收到地方法院第一審判決，於法定 20 日不變期間內向上級法院提起上訴</div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowDocTypeModal(false);
                      saveCrossFeatureContext({
                        documentType: 'appeal',
                        partyName: workflowState?.router?.cause || '',
                        scenarioKeywords: workflowState?.router?.cause || '',
                        domain: workflowState?.router?.domain,
                        cause: workflowState?.router?.cause,
                        facts: workflowState?.userNarrative || '',
                        verificationStatus: workflowState?.verification?.verificationStatus,
                        sourceTool: 'unified'
                      });
                      handleSelectTool('appeal', 'appeal', { initialTab: 'appeal', facts: workflowState?.userNarrative || '' });
                    }}
                    className="w-full text-left p-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 transition-all group opacity-85 hover:opacity-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-indigo-300 group-hover:text-indigo-200">上訴理由狀</div>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">已有判決才適用</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">已收到地方法院第一審判決，於法定 20 日不變期間內向上級法院提起上訴</div>
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowDocTypeModal(false)}
                  className="text-xs text-[var(--color-text-muted)] hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Preset Case Modal */}
        {showCustomPresetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <Star className="w-5 h-5 fill-amber-400/40" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">自訂預設案例設定</h3>
                    <p className="text-xs text-[var(--color-text-muted)]">設定您的專屬自訂案例，點擊按鈕即可一鍵填入（非系統預置）</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustomPresetModal(false)}
                  className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    案例名稱 / 按鈕標籤
                  </label>
                  <input
                    type="text"
                    value={editPresetTitle}
                    onChange={(e) => setEditPresetTitle(e.target.value)}
                    placeholder="例如：自訂案例：車禍損害賠償"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    口語事實與案情內容
                  </label>
                  <textarea
                    rows={7}
                    value={editPresetNarrative}
                    onChange={(e) => setEditPresetNarrative(e.target.value)}
                    placeholder="請輸入欲測試的具體口語事實或案情敘述..."
                    className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 leading-relaxed placeholder:text-[var(--color-text-secondary)]"
                  />
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                    字數：{editPresetNarrative.length} 字 · 資料保存在您的本機瀏覽器，重新整理頁面依然保留。
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCustomPresetModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveCustomPreset(editPresetTitle, editPresetNarrative);
                    setShowCustomPresetModal(false);
                  }}
                  disabled={!editPresetTitle.trim() || !editPresetNarrative.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold transition-colors"
                >
                  儲存並套用為預設案例
                </button>
              </div>
            </div>
          </div>
        )}

    </>
  );
};
