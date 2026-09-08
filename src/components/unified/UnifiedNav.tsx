
import React from 'react';
import {
  Send, Sparkles, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  Cpu, Layers, FileCheck2, FileText, RotateCcw, Copy, Check, Loader2,
  ChevronRight, ArrowRight, HelpCircle, Clock, BookOpen, Scale,
  Upload, History, Download, Printer, Trash2, X, FilePlus, ChevronDown,
  ChevronUp, Star, Edit3, Plus, Bookmark, PenTool, LayoutTemplate, MessageSquare
} from 'lucide-react';
import { formatLegalChapter, formatVerificationStatus } from '../../lib/legalChapterLabels';

export interface UnifiedNavProps {
  [key: string]: any;
}

export const UnifiedNav: React.FC<UnifiedNavProps> = (props) => {
  const { inputNarrative, setInputNarrative, isSubmitting, setIsSubmitting, workflowState, setWorkflowState, supplementInput, setSupplementInput, isCopied, setIsCopied, acknowledgeSafetyInSession, setAcknowledgeSafetyInSession, isNode2Open, setIsNode2Open, isNode4Open, setIsNode4Open, isNode5Open, setIsNode5Open, isNode6Open, setIsNode6Open, customPreset, setCustomPreset, showCustomPresetModal, setShowCustomPresetModal, editPresetTitle, setEditPresetTitle, editPresetNarrative, setEditPresetNarrative, fileInputRef, isDragOver, setIsDragOver, isParsingFiles, setIsParsingFiles, parsingStatus, setParsingStatus, batchQueue, setBatchQueue, batchIndex, setBatchIndex, isBatchRunning, setIsBatchRunning, showHistory, setShowHistory, historyList, setHistoryList, handleFiles, handleDrop, handleExecuteWorkflow, handleSupplementFact, handleProceedFromSafety, handleResetWorkflow, handleCopyAnalysis, loadFromHistory, handleBatchNext, handleBatchPrev, handleSaveCurrentAsCustomPreset, handleSelectSuggestedOption, handleSaveCustomPreset, handleToggleAllNodes, defaultSample, handleSelectTool, saveCrossFeatureContext, exportAsHtml, exportAsText, printReport, deleteFromHistory, clearHistory, loadHistory, showDocTypeModal, setShowDocTypeModal } = props;

  return (
    <>
        {/* Cross-feature navigation bar */}
        {workflowState?.verification?.passGate && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs text-slate-400 font-semibold">還需要：</span>
            <button
              onClick={() => handleSelectTool('guide')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              生活情境導診
            </button>
            <button
              onClick={() => handleSelectTool('litigation')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              訴訟與書狀工作台
            </button>
          </div>
        )}

        {/* Quick action buttons — jump to document generation or guide */}
        {workflowState?.verification?.passGate && (
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <button
              onClick={() => setShowDocTypeModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold shadow-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              生成對應文書
            </button>
            <button
              onClick={() => {
                saveCrossFeatureContext({
                  scenarioKeywords: workflowState?.router?.cause || '',
                  domain: workflowState?.router?.domain,
                  cause: workflowState?.router?.cause,
                  sourceTool: 'unified'
                });
                handleSelectTool('guide');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              獲取後續導診建議
            </button>
          </div>
        )}

    </>
  );
};
