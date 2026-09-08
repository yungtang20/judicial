
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
        <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Layers className="w-48 h-48 text-indigo-400" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold tracking-wide">
                <Cpu className="w-3.5 h-3.5" />
                <span>統一入口自動化工作流 · 全流程狀態圖導航</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                智慧法律統一分析工作台
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                廢除分散工具跳轉，以單一入口接收文本。由狀態機自動導航執行：
                <span className="text-indigo-300 font-semibold"> 智慧分流 ➔ 缺件追問 / 安全保護 ➔ 法規要件檢索 ➔ 三段論涵攝 ➔ 防偽真確性閘門</span>。
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* History button */}
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors shadow-md"
              >
                <History className="w-3.5 h-3.5" />
                <span>歷史記錄 ({historyList.length})</span>
              </button>

              {workflowState && (
                <button
                  type="button"
                  onClick={handleResetWorkflow}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors shadow-md"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>開立新案件分析</span>
                </button>
              )}
            </div>
          </div>
        </div>

    </>
  );
};
