
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-[380px] space-y-4">
              <h3 className="text-base font-bold text-white">選擇文書類型</h3>
              <p className="text-xs text-[var(--color-text-muted)]">根據您的案件類型，推薦以下文書：</p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowDocTypeModal(false);
                    saveCrossFeatureContext({
                      documentType: 'appeal',
                      partyName: workflowState?.router?.cause || '',
                      scenarioKeywords: workflowState?.router?.cause || '',
                      domain: workflowState?.router?.domain,
                      cause: workflowState?.router?.cause,
                      sourceTool: 'unified'
                    });
                    handleSelectTool('appeal', 'appeal', { initialTab: 'appeal' });
                  }}
                  className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  <div className="font-bold text-sm text-white">上訴狀</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">不服地方法院判決，向上級法院提起上訴</div>
                </button>
                <button
                  onClick={() => {
                    setShowDocTypeModal(false);
                    saveCrossFeatureContext({
                      documentType: 'demand_letter',
                      partyName: workflowState?.router?.cause || '',
                      scenarioKeywords: workflowState?.router?.cause || '',
                      domain: workflowState?.router?.domain,
                      cause: workflowState?.router?.cause,
                      sourceTool: 'unified'
                    });
                    handleSelectTool('litigation', undefined, { initialTab: 'toolbox', preselectedToolId: 'CIVIL_DEMAND_LETTER_GENERAL' });
                  }}
                  className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                >
                  <div className="font-bold text-sm text-white">存證信函</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-1">以正式書面通知對方，留存法律證據</div>
                </button>
              </div>
              <button
                onClick={() => setShowDocTypeModal(false)}
                className="w-full text-xs text-[var(--color-text-muted)] hover:text-slate-300 py-1 transition-colors"
              >
                取消
              </button>
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
