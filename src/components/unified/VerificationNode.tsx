
import React from 'react';
import {
  Send, Sparkles, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  Cpu, Layers, FileCheck2, FileText, RotateCcw, Copy, Check, Loader2,
  ChevronRight, ArrowRight, HelpCircle, Clock, BookOpen, Scale,
  Upload, History, Download, Printer, Trash2, X, FilePlus, ChevronDown,
  ChevronUp, Star, Edit3, Plus, Bookmark, PenTool, LayoutTemplate, MessageSquare
} from 'lucide-react';
import { formatLegalChapter, formatVerificationStatus } from '../../lib/legalChapterLabels';

export interface VerificationNodeProps {
  [key: string]: any;
}

export const VerificationNode: React.FC<VerificationNodeProps> = (props) => {
  const { inputNarrative, setInputNarrative, isSubmitting, setIsSubmitting, workflowState, setWorkflowState, supplementInput, setSupplementInput, isCopied, setIsCopied, acknowledgeSafetyInSession, setAcknowledgeSafetyInSession, isNode2Open, setIsNode2Open, isNode4Open, setIsNode4Open, isNode5Open, setIsNode5Open, isNode6Open, setIsNode6Open, customPreset, setCustomPreset, showCustomPresetModal, setShowCustomPresetModal, editPresetTitle, setEditPresetTitle, editPresetNarrative, setEditPresetNarrative, fileInputRef, isDragOver, setIsDragOver, isParsingFiles, setIsParsingFiles, parsingStatus, setParsingStatus, batchQueue, setBatchQueue, batchIndex, setBatchIndex, isBatchRunning, setIsBatchRunning, showHistory, setShowHistory, historyList, setHistoryList, handleFiles, handleDrop, handleExecuteWorkflow, handleSupplementFact, handleProceedFromSafety, handleResetWorkflow, handleCopyAnalysis, loadFromHistory, handleBatchNext, handleBatchPrev, handleSaveCurrentAsCustomPreset, handleSelectSuggestedOption, handleSaveCustomPreset, handleToggleAllNodes, defaultSample, handleSelectTool, saveCrossFeatureContext, exportAsHtml, exportAsText, printReport, deleteFromHistory, clearHistory, loadHistory, showDocTypeModal, setShowDocTypeModal } = props;

  return (
    <>
        {/* 節點 6：真確性檢核閘門 (預設收起，可點擊展開) */}
        {workflowState?.verification && (
          <div className={`p-5 rounded-3xl border shadow-xl space-y-3 transition-all ${workflowState.verification.passGate ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setIsNode6Open(prev => !prev)}
            >
              <div className="flex items-center gap-3">
                {workflowState.verification.passGate ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-400" />
                )}
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>節點 6：真確性檢核閘門</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${workflowState.verification.passGate ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      {workflowState.verification.passGate ? '✓ 檢核通過' : '⚠ 待人工法學審核'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    查核 {workflowState.verification.totalChecked} 處 · 幽靈法條 {workflowState.verification.ghostCount} 處
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">
                  {isNode6Open ? '收起資料' : '展開檢視'}
                </span>
                {isNode6Open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {isNode6Open && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <p className="text-sm text-slate-300">{workflowState.verification.warningNotice || `檢核狀態：${formatVerificationStatus(workflowState.verification.verificationStatus)}`}</p>
                <p className="text-xs text-slate-400">狀態：{formatVerificationStatus(workflowState.verification.verificationStatus)} · 查核 {workflowState.verification.totalChecked} 處 · 幽靈法條 {workflowState.verification.ghostCount} 處</p>
                {workflowState.verification.officialEvidence?.length > 0 && (
                  <div className="space-y-1 border-t border-slate-800 pt-3">
                    <p className="text-xs font-bold text-slate-200">逐筆官方證據</p>
                    {workflowState.verification.officialEvidence.map((item, i) => (
                      <p key={i} className="text-xs text-slate-400">
                        {item.citation} · {item.status} · {new Date(item.checkedAt).toLocaleString()} · <a className="text-sky-400 underline" href={item.sourceUrl} target="_blank" rel="noreferrer">{item.source}</a>
                      </p>
                    ))}
                  </div>
                )}
                {(!workflowState.verification.officialEvidence || workflowState.verification.officialEvidence.length === 0) && (
                  <p className="text-xs text-amber-300">逐筆官方證據：無可查證引用（待法學審核）</p>
                )}
              </div>
            )}
          </div>
        )}
    </>
  );
};
