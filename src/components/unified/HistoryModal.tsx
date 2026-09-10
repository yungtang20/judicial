
import React from 'react';
import {
  Send, Sparkles, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  Cpu, Layers, FileCheck2, FileText, RotateCcw, Copy, Check, Loader2,
  ChevronRight, ArrowRight, HelpCircle, Clock, BookOpen, Scale,
  Upload, History, Download, Printer, Trash2, X, FilePlus, ChevronDown,
  ChevronUp, Star, Edit3, Plus, Bookmark, PenTool, LayoutTemplate, MessageSquare
} from 'lucide-react';
import { formatLegalChapter, formatVerificationStatus } from '../../lib/legalChapterLabels';

export interface HistoryModalProps {
  [key: string]: any;
}

export const HistoryModal: React.FC<HistoryModalProps> = (props) => {
  const { inputNarrative, setInputNarrative, isSubmitting, setIsSubmitting, workflowState, setWorkflowState, supplementInput, setSupplementInput, isCopied, setIsCopied, acknowledgeSafetyInSession, setAcknowledgeSafetyInSession, isNode2Open, setIsNode2Open, isNode4Open, setIsNode4Open, isNode5Open, setIsNode5Open, isNode6Open, setIsNode6Open, customPreset, setCustomPreset, showCustomPresetModal, setShowCustomPresetModal, editPresetTitle, setEditPresetTitle, editPresetNarrative, setEditPresetNarrative, fileInputRef, isDragOver, setIsDragOver, isParsingFiles, setIsParsingFiles, parsingStatus, setParsingStatus, batchQueue, setBatchQueue, batchIndex, setBatchIndex, isBatchRunning, setIsBatchRunning, showHistory, setShowHistory, historyList, setHistoryList, handleFiles, handleDrop, handleExecuteWorkflow, handleSupplementFact, handleProceedFromSafety, handleResetWorkflow, handleCopyAnalysis, loadFromHistory, handleBatchNext, handleBatchPrev, handleSaveCurrentAsCustomPreset, handleSelectSuggestedOption, handleSaveCustomPreset, handleToggleAllNodes, defaultSample, handleSelectTool, saveCrossFeatureContext, exportAsHtml, exportAsText, printReport, deleteFromHistory, clearHistory, loadHistory, showDocTypeModal, setShowDocTypeModal } = props;

  return (
    <>
        {/* History Panel (collapsible) */}
        {showHistory && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 max-h-72 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-400" />
                  <span>分析歷史記錄 ({historyList.length})</span>
                </h3>
                {historyList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      clearHistory();
                      setHistoryList([]);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>清空全部</span>
                  </button>
                )}
              </div>
              <button onClick={() => setShowHistory(false)} className="text-[var(--color-text-muted)] hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            {historyList.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">尚無歷史記錄</p>
            ) : (
              historyList.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 cursor-pointer transition-colors group"
                  onClick={() => loadFromHistory(record)}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-semibold text-slate-200 truncate">{record.title}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      {new Date(record.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
                      {' · '}
                      <span className="text-indigo-400">{record.workflowState?.router?.domain || '—'}</span>
                      {record.workflowState?.router?.chapter && (
                        <span className="text-[var(--color-text-muted)]"> · {formatLegalChapter(record.workflowState.router.chapter)}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFromHistory(record.id);
                        setHistoryList(loadHistory());
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors cursor-pointer"
                      title="刪除此筆記錄"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>刪除</span>
                    </button>
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

    </>
  );
};
