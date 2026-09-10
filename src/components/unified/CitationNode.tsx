
import React from 'react';
import {
  Send, Sparkles, ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2,
  Cpu, Layers, FileCheck2, FileText, RotateCcw, Copy, Check, Loader2,
  ChevronRight, ArrowRight, HelpCircle, Clock, BookOpen, Scale,
  Upload, History, Download, Printer, Trash2, X, FilePlus, ChevronDown,
  ChevronUp, Star, Edit3, Plus, Bookmark, PenTool, LayoutTemplate, MessageSquare
} from 'lucide-react';
import { formatLegalChapter, formatVerificationStatus } from '../../lib/legalChapterLabels';

export interface CitationNodeProps {
  [key: string]: any;
}

export const CitationNode: React.FC<CitationNodeProps> = (props) => {
  const { inputNarrative, setInputNarrative, isSubmitting, setIsSubmitting, workflowState, setWorkflowState, supplementInput, setSupplementInput, isCopied, setIsCopied, acknowledgeSafetyInSession, setAcknowledgeSafetyInSession, isNode2Open, setIsNode2Open, isNode4Open, setIsNode4Open, isNode5Open, setIsNode5Open, isNode6Open, setIsNode6Open, customPreset, setCustomPreset, showCustomPresetModal, setShowCustomPresetModal, editPresetTitle, setEditPresetTitle, editPresetNarrative, setEditPresetNarrative, fileInputRef, isDragOver, setIsDragOver, isParsingFiles, setIsParsingFiles, parsingStatus, setParsingStatus, batchQueue, setBatchQueue, batchIndex, setBatchIndex, isBatchRunning, setIsBatchRunning, showHistory, setShowHistory, historyList, setHistoryList, handleFiles, handleDrop, handleExecuteWorkflow, handleSupplementFact, handleProceedFromSafety, handleResetWorkflow, handleCopyAnalysis, loadFromHistory, handleBatchNext, handleBatchPrev, handleSaveCurrentAsCustomPreset, handleSelectSuggestedOption, handleSaveCustomPreset, handleToggleAllNodes, defaultSample, handleSelectTool, saveCrossFeatureContext, exportAsHtml, exportAsText, printReport, deleteFromHistory, clearHistory, loadHistory, showDocTypeModal, setShowDocTypeModal } = props;

  return (
    <>
        {/* 節點 4：法規與裁判要件檢索庫 (預設收起，可點擊展開) */}
        {workflowState?.rag && (
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 transition-all">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setIsNode4Open(prev => !prev)}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>節點 4：法規與裁判要件庫檢索</span>
                    {!isNode4Open && (
                      <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md hidden sm:inline">
                        法規 {workflowState.rag.statuteCitations?.length || 0} 筆 · 判例 {workflowState.rag.precedents?.length || 0} 筆
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">智慧法條要件對照與實務裁判先例</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400">
                  {isNode4Open ? '收起資料' : '展開檢視'}
                </span>
                {isNode4Open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {isNode4Open && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{workflowState.rag.legalElements}</p>
                {workflowState.rag.statuteCitations?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {workflowState.rag.statuteCitations.map((citation, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200">{citation}</span>
                    ))}
                  </div>
                )}
                {workflowState.rag.precedents?.length > 0 && (
                  <div className="space-y-2">
                    {workflowState.rag.precedents.map((precedent, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <p className="text-xs font-bold text-sky-300">{precedent.caseNumber} · {precedent.courtName}</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{precedent.summary}</p>
                        {precedent.sourceUrl && (
                          <a className="text-xs text-sky-400 underline" href={precedent.sourceUrl} target="_blank" rel="noreferrer">開啟司法院裁判全文</a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {workflowState.rag.officialSearch && (
                  <div className="text-xs text-slate-400 border-t border-slate-800 pt-3">
                    司法院裁判查詢：{workflowState.rag.officialSearch.status} · {workflowState.rag.officialSearch.source} · {new Date(workflowState.rag.officialSearch.checkedAt).toLocaleString()}
                    {workflowState.rag.officialSearch.sourceUrl && <> · <a className="text-sky-400 underline" href={workflowState.rag.officialSearch.sourceUrl} target="_blank" rel="noreferrer">查詢來源</a></>}
                    {workflowState.rag.officialSearch.error ? ` · ${workflowState.rag.officialSearch.error}` : ''}
                  </div>
                )}
                {workflowState.rag.officialEvidence?.length > 0 && (
                  <div className="space-y-1 border-t border-slate-800 pt-3">
                    <p className="text-xs font-bold text-indigo-300">官方查證紀錄</p>
                    {workflowState.rag.officialEvidence.map((item, i) => (
                      <p key={i} className="text-xs text-slate-400">
                        {item.citation} · 存在性 {item.status}{item.claimSupportStatus ? ` · 主張綁定 ${item.claimSupportStatus}` : ''} · {item.source} · {new Date(item.checkedAt).toLocaleString()}
                        {item.sourceUrl && <> · <a className="text-sky-400 underline" href={item.sourceUrl} target="_blank" rel="noreferrer">來源</a></>}
                      </p>
                    ))}
                  </div>
                )}
                {(!workflowState.rag.officialEvidence || workflowState.rag.officialEvidence.length === 0) && (
                  <p className="text-xs text-amber-300 border-t border-slate-800 pt-3">官方查證：無可查證引用或尚未取得官方結果（待法學審核）</p>
                )}
              </div>
            )}
          </div>
        )}

    </>
  );
};
