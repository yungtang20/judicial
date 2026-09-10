
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
          <div className="p-4 rounded-xl bg-[#0e1424] border border-slate-800 space-y-3 transition-all">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setIsNode4Open(prev => !prev)}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold">
                  檢索庫
                </span>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>法規與裁判要件庫檢索</span>
                    {!isNode4Open && (
                      <span className="text-[11px] font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded hidden sm:inline">
                        法規 {workflowState.rag.statuteCitations?.length || 0} 筆 · 判例 {workflowState.rag.precedents?.length || 0} 筆
                      </span>
                    )}
                  </h2>
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
              <div className="pt-3 border-t border-slate-800 space-y-3 text-xs">
                {workflowState.rag.legalElements && (
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{workflowState.rag.legalElements}</p>
                )}

                {workflowState.rag.statuteCitations?.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">關聯實體法條清單</span>
                    <div className="flex flex-wrap gap-1.5">
                      {workflowState.rag.statuteCitations.map((citation: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-indigo-200 font-mono">{citation}</span>
                      ))}
                    </div>
                  </div>
                )}

                {workflowState.rag.precedents?.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">實務裁判先例清單</span>
                    <div className="divide-y divide-slate-800/80">
                      {workflowState.rag.precedents.map((precedent: any, i: number) => (
                        <div key={i} className="py-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 font-mono">
                              <span className="font-bold text-sky-300">{precedent.caseNumber}</span>
                              <span className="text-slate-600">·</span>
                              <span className="text-slate-400 text-[11px]">{precedent.courtName}</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed mt-1">{precedent.summary}</p>
                          </div>
                          {precedent.sourceUrl && (
                            <a className="text-xs text-sky-400 hover:underline shrink-0" href={precedent.sourceUrl} target="_blank" rel="noreferrer">
                              裁判全文 ↗
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {workflowState.rag.officialEvidence?.length > 0 && (
                  <div className="border-t border-slate-800 pt-2.5">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">官方資料庫查驗紀錄</span>
                    <div className="divide-y divide-slate-800/80">
                      {workflowState.rag.officialEvidence.map((item: any, i: number) => (
                        <div key={i} className="py-1.5 flex items-center justify-between text-[11px] text-slate-400">
                          <div>
                            <span className="font-mono text-slate-200">{item.citation}</span>
                            <span className="mx-1.5 text-slate-600">·</span>
                            <span className={item.status === 'VALID' ? 'text-emerald-400' : 'text-amber-400'}>{item.status}</span>
                            {item.claimSupportStatus && <span className="ml-1 text-slate-500">({item.claimSupportStatus})</span>}
                          </div>
                          {item.sourceUrl && (
                            <a className="text-sky-400 hover:underline shrink-0" href={item.sourceUrl} target="_blank" rel="noreferrer">
                              {item.source}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

    </>
  );
};
