
import React from 'react';
import {
  Send, Sparkles, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  Cpu, Layers, FileCheck2, FileText, RotateCcw, Copy, Check, Loader2,
  ChevronRight, ArrowRight, HelpCircle, Clock, BookOpen, Scale,
  Upload, History, Download, Printer, Trash2, X, FilePlus, ChevronDown,
  ChevronUp, Star, Edit3, Plus, Bookmark, PenTool, LayoutTemplate, MessageSquare
} from 'lucide-react';
import { formatLegalChapter, formatVerificationStatus } from '../../lib/legalChapterLabels';

export interface SyllogismNodeProps {
  [key: string]: any;
}

export const SyllogismNode: React.FC<SyllogismNodeProps> = (props) => {
  const { inputNarrative, setInputNarrative, isSubmitting, setIsSubmitting, workflowState, setWorkflowState, supplementInput, setSupplementInput, isCopied, setIsCopied, acknowledgeSafetyInSession, setAcknowledgeSafetyInSession, isNode2Open, setIsNode2Open, isNode4Open, setIsNode4Open, isNode5Open, setIsNode5Open, isNode6Open, setIsNode6Open, customPreset, setCustomPreset, showCustomPresetModal, setShowCustomPresetModal, editPresetTitle, setEditPresetTitle, editPresetNarrative, setEditPresetNarrative, fileInputRef, isDragOver, setIsDragOver, isParsingFiles, setIsParsingFiles, parsingStatus, setParsingStatus, batchQueue, setBatchQueue, batchIndex, setBatchIndex, isBatchRunning, setIsBatchRunning, showHistory, setShowHistory, historyList, setHistoryList, handleFiles, handleDrop, handleExecuteWorkflow, handleSupplementFact, handleProceedFromSafety, handleResetWorkflow, handleCopyAnalysis, loadFromHistory, handleBatchNext, handleBatchPrev, handleSaveCurrentAsCustomPreset, handleSelectSuggestedOption, handleSaveCustomPreset, handleToggleAllNodes, defaultSample, handleSelectTool, saveCrossFeatureContext, exportAsHtml, exportAsText, printReport, deleteFromHistory, clearHistory, loadHistory, showDocTypeModal, setShowDocTypeModal } = props;

  return (
    <>
        {/* 節點 5：三段論涵攝法學分析 (預設收起，可點擊展開) */}
        {workflowState?.syllogism && (
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-xl space-y-4 transition-all">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setIsNode5Open(prev => !prev)}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>節點 5：三段論涵攝法學分析</span>
                  </h2>
                  <p className="text-xs text-slate-400">大前提法規要件 ➔ 小前提事實涵攝 ➔ 結論請求權主張</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={handleCopyAnalysis}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? '已複製' : '複製'}</span>
                  </button>
                  <button
                    onClick={() => exportAsHtml(workflowState)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>HTML</span>
                  </button>
                  <button
                    onClick={() => exportAsText(workflowState)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>TXT</span>
                  </button>
                  <button
                    onClick={() => printReport(workflowState)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>列印</span>
                  </button>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  {isNode5Open ? '收起資料' : '展開檢視'}
                </span>
                {isNode5Open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {isNode5Open && (
              <div className="pt-3 border-t border-slate-800">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                    {workflowState.syllogism.fullAnalysis}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

    </>
  );
};
