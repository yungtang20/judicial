
import React from 'react';
import {
  Send, Sparkles, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  Cpu, Layers, FileCheck2, FileText, RotateCcw, Copy, Check, Loader2,
  ChevronRight, ArrowRight, HelpCircle, Clock, BookOpen, Scale,
  Upload, History, Download, Printer, Trash2, X, FilePlus, ChevronDown,
  ChevronUp, Star, Edit3, Plus, Bookmark, PenTool, LayoutTemplate, MessageSquare
} from 'lucide-react';
import { formatLegalChapter, formatVerificationStatus } from '../../lib/legalChapterLabels';

export interface UnifiedProgressProps {
  [key: string]: any;
}

export const UnifiedProgress: React.FC<UnifiedProgressProps> = (props) => {
  const { inputNarrative, setInputNarrative, isSubmitting, setIsSubmitting, workflowState, setWorkflowState, supplementInput, setSupplementInput, isCopied, setIsCopied, acknowledgeSafetyInSession, setAcknowledgeSafetyInSession, isNode2Open, setIsNode2Open, isNode4Open, setIsNode4Open, isNode5Open, setIsNode5Open, isNode6Open, setIsNode6Open, customPreset, setCustomPreset, showCustomPresetModal, setShowCustomPresetModal, editPresetTitle, setEditPresetTitle, editPresetNarrative, setEditPresetNarrative, fileInputRef, isDragOver, setIsDragOver, isParsingFiles, setIsParsingFiles, parsingStatus, setParsingStatus, batchQueue, setBatchQueue, batchIndex, setBatchIndex, isBatchRunning, setIsBatchRunning, showHistory, setShowHistory, historyList, setHistoryList, handleFiles, handleDrop, handleExecuteWorkflow, handleSupplementFact, handleProceedFromSafety, handleResetWorkflow, handleCopyAnalysis, loadFromHistory, handleBatchNext, handleBatchPrev, handleSaveCurrentAsCustomPreset, handleSelectSuggestedOption, handleSaveCustomPreset, handleToggleAllNodes, defaultSample, handleSelectTool, saveCrossFeatureContext, exportAsHtml, exportAsText, printReport, deleteFromHistory, clearHistory, loadHistory, showDocTypeModal, setShowDocTypeModal } = props;

  return (
    <>
        {/* 狀態導航節點進度列 (StateGraph Timeline) */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${workflowState ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
            <span>文本輸入</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${workflowState?.router ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">2</span>
            <span>智慧分流</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${workflowState?.currentStep === 'QUESTIONING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse' : workflowState?.currentStep === 'SAFETY_PROTECTION' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' : workflowState?.router?.is_complete ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">3</span>
            <span>條件邊界分流</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${workflowState?.rag ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">4</span>
            <span>法規裁判要件庫</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${workflowState?.syllogism ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">5</span>
            <span>三段論涵攝</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold ${workflowState?.verification ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px]">6</span>
            <span>真確性檢核閘門</span>
          </div>
        </div>

    </>
  );
};
