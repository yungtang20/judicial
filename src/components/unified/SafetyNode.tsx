
import React from 'react';
import {
  Send, Sparkles, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  Cpu, Layers, FileCheck2, FileText, RotateCcw, Copy, Check, Loader2,
  ChevronRight, ArrowRight, HelpCircle, Clock, BookOpen, Scale,
  Upload, History, Download, Printer, Trash2, X, FilePlus, ChevronDown,
  ChevronUp, Star, Edit3, Plus, Bookmark, PenTool, LayoutTemplate, MessageSquare
} from 'lucide-react';
import { formatLegalChapter, formatVerificationStatus } from '../../lib/legalChapterLabels';

export interface SafetyNodeProps {
  [key: string]: any;
}

export const SafetyNode: React.FC<SafetyNodeProps> = (props) => {
  const { inputNarrative, setInputNarrative, isSubmitting, setIsSubmitting, workflowState, setWorkflowState, supplementInput, setSupplementInput, isCopied, setIsCopied, acknowledgeSafetyInSession, setAcknowledgeSafetyInSession, isNode2Open, setIsNode2Open, isNode4Open, setIsNode4Open, isNode5Open, setIsNode5Open, isNode6Open, setIsNode6Open, customPreset, setCustomPreset, showCustomPresetModal, setShowCustomPresetModal, editPresetTitle, setEditPresetTitle, editPresetNarrative, setEditPresetNarrative, fileInputRef, isDragOver, setIsDragOver, isParsingFiles, setIsParsingFiles, parsingStatus, setParsingStatus, batchQueue, setBatchQueue, batchIndex, setBatchIndex, isBatchRunning, setIsBatchRunning, showHistory, setShowHistory, historyList, setHistoryList, handleFiles, handleDrop, handleExecuteWorkflow, handleSupplementFact, handleProceedFromSafety, handleResetWorkflow, handleCopyAnalysis, loadFromHistory, handleBatchNext, handleBatchPrev, handleSaveCurrentAsCustomPreset, handleSelectSuggestedOption, handleSaveCustomPreset, handleToggleAllNodes, defaultSample, handleSelectTool, saveCrossFeatureContext, exportAsHtml, exportAsText, printReport, deleteFromHistory, clearHistory, loadHistory, showDocTypeModal, setShowDocTypeModal } = props;

  return (
    <>
        {/* Safety Protection Node */}
        {workflowState?.currentStep === 'SAFETY_PROTECTION' && !acknowledgeSafetyInSession && (
          <div className="p-6 rounded-3xl bg-rose-950/40 border border-rose-500/40 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
              <h2 className="text-lg font-bold text-rose-200">安全保護節點觸發</h2>
            </div>
            <p className="text-sm text-rose-200/80 leading-relaxed">
              您的案件涉及敏感法律領域（家庭暴力、性侵、自殺等），系統將啟動安全保護機制。
              分析結果將附帶心理健康資源資訊，並優先建議尋求專業協助。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleProceedFromSafety}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors"
              >
                我已了解，繼續分析
              </button>
              <button
                onClick={handleResetWorkflow}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold border border-slate-700 transition-colors"
              >
                重新輸入
              </button>
            </div>
          </div>
        )}

        {/* Questioning Node */}
        {workflowState?.questioning && !workflowState?.router?.is_complete && (
          <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-amber-400" />
              <h2 className="text-lg font-bold text-amber-200">動態追問節點</h2>
            </div>
            <p className="text-sm text-amber-200/80">{workflowState.questioning.rawMessage}</p>

            <div className="flex flex-wrap gap-2">
              {workflowState.questioning.suggestedOptions?.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectSuggestedOption(opt)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 hover:border-amber-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <input
                value={supplementInput}
                onChange={(e) => setSupplementInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSupplementFact(); }}
                placeholder="或自行輸入補充事實..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                onClick={() => handleSupplementFact()}
                disabled={!supplementInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-bold transition-colors"
              >
                送出補充
              </button>
            </div>
          </div>
        )}

    </>
  );
};
