
import React from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, FileText, Settings, Book, Sparkles, Check, Copy } from 'lucide-react';
import type { MineScanResult } from '../../types';

export interface Stage4MineScanProps {
  mineScanResult: MineScanResult | null;
  handleGeneratePleading: (type: 'LAWYER' | 'PERSONAL') => void;
  isLoadingPleading: boolean;
  copiedSection: string | null;
  handleCopyText: (text: string, id: string) => void;
}

export const Stage4MineScan: React.FC<Stage4MineScanProps> = ({
  mineScanResult, handleGeneratePleading, isLoadingPleading, copiedSection, handleCopyText
}) => {
  if (!mineScanResult) return null;
  return (
    <>
          {/* STAGE 4: PHASE 3 - 6 ADMISSION MINE SCAN RESULTS */}
          {mineScanResult && (
            <div className="bg-[var(--color-surface-overlay)] border border-[var(--color-border-subtle)] rounded-xl p-6 space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--color-border-subtle)] gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-rose-100 text-[var(--color-status-danger)] flex items-center justify-center text-xs font-bold">4</span>
                    <h2 className="text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                      Phase 3：民事訴訟法第 279 條【6 大不利自認地雷掃描結果】
                    </h2>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] pl-8">
                    自認拘束力判定：共偵測出 {mineScanResult.totalMinesCount} 項潛在陷阱
                  </p>
                </div>
                <div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold inline-flex items-center gap-1.5 ${
                    mineScanResult.hasFatalMines ? 'bg-rose-100 text-[var(--color-status-danger)] border border-rose-300' : 'bg-amber-100 text-[var(--color-status-warning)]'
                  }`}>
                    {mineScanResult.hasFatalMines ? '🔴 含有致命自認地雷' : '🟡 具備常規訴訟風險'}
                  </span>
                </div>
              </div>

              {/* Overall Summary Box */}
              <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                mineScanResult.hasFatalMines ? 'bg-[var(--color-status-danger-bg)] border-[var(--color-status-danger)]/30 text-[var(--color-status-danger)]' : 'bg-[var(--color-status-warning-bg)] border-[var(--color-status-warning)]/30 text-[var(--color-status-warning)]'
              }`}>
                <div className="font-bold flex items-center gap-1.5 mb-1 text-sm">
                  <AlertTriangle className="w-4 h-4" /> 自認風險綜合診斷
                </div>
                <p>{mineScanResult.overallRiskSummary}</p>
              </div>

              {/* Detailed Mine Cards */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[var(--color-text-secondary)]">偵測出之自認陷阱清單：</h3>
                <div className="space-y-3">
                  {mineScanResult.mines.map((mine, idx) => (
                    <div 
                      key={mine.id || idx}
                      className={`border rounded-xl p-4 space-y-2 text-xs transition-all ${
                        mine.riskLevel === 'FATAL_ADMISSION' 
                          ? 'border-rose-300 bg-[var(--color-status-danger-bg)]/40'
                          : 'border-[var(--color-status-warning)]/30 bg-[var(--color-status-warning-bg)]/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            mine.riskLevel === 'FATAL_ADMISSION' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                          }`}>
                            {mine.riskLevel === 'FATAL_ADMISSION' ? '致命自認' : '戰術缺陷'}
                          </span>
                          #{idx + 1} {mine.mineName}
                        </div>
                        <span className="text-[11px] text-[var(--color-text-muted)] font-mono">依據：{mine.articleBasis}</span>
                      </div>

                      <div className="bg-[var(--color-surface-overlay)]/80 p-2.5 rounded-lg border border-[var(--color-border-subtle)]/60 text-[var(--color-text-primary)]">
                        <strong>觸發原句：</strong><span className="text-rose-700 font-medium">「{mine.triggerQuote}」</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-[var(--color-surface-overlay)]/60 p-2.5 rounded border border-[var(--color-border-subtle)]/50">
                          <strong className="text-[var(--color-status-danger)]">法律陷阱與後果：</strong>
                          <p className="text-[var(--color-text-secondary)] mt-0.5">{mine.legalTrap}</p>
                          <p className="text-rose-600 font-medium mt-1">⚠️ 審判後果：{mine.potentialConsequence}</p>
                        </div>
                        <div className="bg-[var(--color-status-success-bg)]/60 p-2.5 rounded border border-[var(--color-status-success)]/30">
                          <strong className="text-[var(--color-status-success)]">建議安全修飾句型：</strong>
                          <p className="text-[var(--color-status-success)] mt-0.5">{mine.modificationSuggestion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cleaned Suggestion Text */}
              {mineScanResult.cleanedTextSuggestion && (
                <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-xl p-4 space-y-2 text-xs">
                  <div className="font-bold text-[var(--color-text-primary)] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      去除致命自認後之當事人意見建議版（保留核心心聲但避開自認陷阱）
                    </span>
                    <button
                      onClick={() => handleCopyText(mineScanResult.cleanedTextSuggestion, 'cleaned_text')}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] text-xs flex items-center gap-1"
                    >
                      {copiedSection === 'cleaned_text' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />} 複製修飾版
                    </button>
                  </div>
                  <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed bg-[var(--color-surface-overlay)] p-3 rounded-lg border border-[var(--color-border-subtle)]">
                    {mineScanResult.cleanedTextSuggestion}
                  </p>
                </div>
              )}

              {/* Generation Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  onClick={() => handleGeneratePleading('CLIENT_PERSONAL_REPORT')}
                  disabled={isLoadingPleading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  {isLoadingPleading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      正在產製《當事人個人陳報狀》...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 text-rose-200" />
                      產製《民事/刑事陳報個人意見狀》（當事人個人具名·律師不背書）
                    </>
                  )}
                </button>
              </div>
            </div>
          )}


    </>
  );
};
