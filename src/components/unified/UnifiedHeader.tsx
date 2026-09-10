
import React from 'react';
import {
  Send, Sparkles, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  Cpu, Layers, FileCheck2, FileText, RotateCcw, Copy, Check, Loader2,
  ChevronRight, ArrowRight, HelpCircle, Clock, BookOpen, Scale,
  Upload, History, Download, Printer, Trash2, X, FilePlus, ChevronDown,
  ChevronUp, Star, Edit3, Plus, Bookmark, PenTool, LayoutTemplate, MessageSquare
} from 'lucide-react';
import { formatLegalChapter, formatVerificationStatus } from '../../lib/legalChapterLabels';

export interface UnifiedHeaderProps {
  [key: string]: any;
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = (props) => {
  const { inputNarrative, setInputNarrative, isSubmitting, setIsSubmitting, workflowState, setWorkflowState, supplementInput, setSupplementInput, isCopied, setIsCopied, acknowledgeSafetyInSession, setAcknowledgeSafetyInSession, isNode2Open, setIsNode2Open, isNode4Open, setIsNode4Open, isNode5Open, setIsNode5Open, isNode6Open, setIsNode6Open, customPreset, setCustomPreset, showCustomPresetModal, setShowCustomPresetModal, editPresetTitle, setEditPresetTitle, editPresetNarrative, setEditPresetNarrative, fileInputRef, isDragOver, setIsDragOver, isParsingFiles, setIsParsingFiles, parsingStatus, setParsingStatus, batchQueue, setBatchQueue, batchIndex, setBatchIndex, isBatchRunning, setIsBatchRunning, showHistory, setShowHistory, historyList, setHistoryList, handleFiles, handleDrop, handleExecuteWorkflow, handleSupplementFact, handleProceedFromSafety, handleResetWorkflow, handleCopyAnalysis, loadFromHistory, handleBatchNext, handleBatchPrev, handleSaveCurrentAsCustomPreset, handleSelectSuggestedOption, handleSaveCustomPreset, handleToggleAllNodes, defaultSample, handleSelectTool, saveCrossFeatureContext, exportAsHtml, exportAsText, printReport, deleteFromHistory, clearHistory, loadHistory, showDocTypeModal, setShowDocTypeModal } = props;

  return (
    <>
        {/* 頂部 Header */}
        <div className="p-5 rounded-xl bg-[#0e1424] border border-slate-800 text-white relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                <Cpu className="w-3.5 h-3.5" />
                <span>統一入口自動化工作流 · 全流程狀態圖導航</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                智慧法律統一分析工作台
              </h1>
              <div className="h-0.5 w-16 rounded-full bg-[var(--color-module-analysis)]" aria-hidden="true" />
              <p className="text-xs text-[var(--color-text-muted)] max-w-2xl leading-relaxed">
                以單一入口接收案情文本，由狀態機自動導航：
                <span className="text-slate-300"> 智慧分流 ➔ 缺件追問 / 安全保護 ➔ 法規要件檢索 ➔ 三段論涵攝 ➔ 防偽真確性閘門</span>。
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* History button */}
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                <span>歷史記錄 ({historyList.length})</span>
              </button>

              {workflowState && (
                <button
                  type="button"
                  onClick={handleResetWorkflow}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>開立新案件</span>
                </button>
              )}
            </div>
          </div>
        </div>

    </>
  );
};
