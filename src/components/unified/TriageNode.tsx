
import React from 'react';
import {
  Send, Sparkles, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  Cpu, Layers, FileCheck2, FileText, RotateCcw, Copy, Check, Loader2,
  ChevronRight, ArrowRight, HelpCircle, Clock, BookOpen, Scale,
  Upload, History, Download, Printer, Trash2, X, FilePlus, ChevronDown,
  ChevronUp, Star, Edit3, Plus, Bookmark, PenTool, LayoutTemplate, MessageSquare
} from 'lucide-react';
import { formatLegalChapter, formatVerificationStatus } from '../../lib/legalChapterLabels';

export interface TriageNodeProps {
  [key: string]: any;
}

export const TriageNode: React.FC<TriageNodeProps> = (props) => {
  const { inputNarrative, setInputNarrative, isSubmitting, setIsSubmitting, workflowState, setWorkflowState, supplementInput, setSupplementInput, isCopied, setIsCopied, acknowledgeSafetyInSession, setAcknowledgeSafetyInSession, isNode2Open, setIsNode2Open, isNode4Open, setIsNode4Open, isNode5Open, setIsNode5Open, isNode6Open, setIsNode6Open, customPreset, setCustomPreset, showCustomPresetModal, setShowCustomPresetModal, editPresetTitle, setEditPresetTitle, editPresetNarrative, setEditPresetNarrative, fileInputRef, isDragOver, setIsDragOver, isParsingFiles, setIsParsingFiles, parsingStatus, setParsingStatus, batchQueue, setBatchQueue, batchIndex, setBatchIndex, isBatchRunning, setIsBatchRunning, showHistory, setShowHistory, historyList, setHistoryList, handleFiles, handleDrop, handleExecuteWorkflow, handleSupplementFact, handleProceedFromSafety, handleResetWorkflow, handleCopyAnalysis, loadFromHistory, handleBatchNext, handleBatchPrev, handleSaveCurrentAsCustomPreset, handleSelectSuggestedOption, handleSaveCustomPreset, handleToggleAllNodes, defaultSample, handleSelectTool, saveCrossFeatureContext, exportAsHtml, exportAsText, printReport, deleteFromHistory, clearHistory, loadHistory, showDocTypeModal, setShowDocTypeModal } = props;

  return (
    <>
        {/* 案件分析概要與收合控制列（依用戶指示：預設收起各節點詳細內容，避免雜亂） */}
        {workflowState?.router && (
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-indigo-500/30 shadow-lg flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-bold">分析簡報：</span>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold">
                領域：{workflowState.router.domain}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold max-w-xs truncate">
                罪章：{formatLegalChapter(workflowState.router.chapter)}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold max-w-xs truncate">
                案由：{workflowState.router.cause}
              </span>
              {workflowState.verification && (
                <span className={`px-2.5 py-1 rounded-lg border font-bold ${workflowState.verification.passGate ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                  {workflowState.verification.passGate ? '✓ 真確性檢核通過' : '⚠ 待人工法學審核'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-slate-500 hidden md:inline">預設已收起詳細資料</span>
              <button
                type="button"
                onClick={() => handleToggleAllNodes(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                全部展開
              </button>
              <button
                type="button"
                onClick={() => handleToggleAllNodes(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                全部收起
              </button>
            </div>
          </div>
        )}

        {/* 節點 2：智慧分流結構化結果 (預設收起，可點擊展開) */}
        {workflowState?.router && (
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-indigo-500/30 shadow-xl space-y-4 transition-all">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setIsNode2Open(prev => !prev)}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>節點 2：智慧分流結構化結果</span>
                    {!isNode2Open && (
                      <span className="text-xs font-normal text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 hidden sm:inline">
                        {workflowState.router.domain} · {formatLegalChapter(workflowState.router.chapter)}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">標準化法律分流標籤與事實完整度評估</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">
                  {isNode2Open ? '收起資料' : '展開檢視'}
                </span>
                {isNode2Open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {isNode2Open && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">法律領域</span>
                    <span className="text-sm font-bold text-indigo-300">{workflowState.router.domain}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">罪章/實體法專節</span>
                    <span className="text-sm font-bold text-white truncate block" title={formatLegalChapter(workflowState.router.chapter)}>
                      {formatLegalChapter(workflowState.router.chapter)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">案由爭點</span>
                    <span className="text-sm font-bold text-amber-300 truncate block">{workflowState.router.cause}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">敏感案件保護</span>
                    <span className={`text-sm font-bold ${workflowState.router.is_sensitive ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {workflowState.router.is_sensitive ? '⚠ 敏感' : '✓ 一般'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-1">事實完整度評估</span>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all"
                      style={{
                        width: `${Math.round(
                          (typeof workflowState.router.completeness === 'number'
                            ? workflowState.router.completeness
                            : workflowState.router.is_complete ? 1 : 0.6) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {Math.round(
                      (typeof workflowState.router.completeness === 'number'
                        ? workflowState.router.completeness
                        : workflowState.router.is_complete ? 1 : 0.6) * 100
                    )}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

    </>
  );
};
