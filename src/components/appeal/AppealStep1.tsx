import React from 'react';
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { AntiGhostBadge } from "../AntiGhostBadge";
import { LegalSourcesDisplay } from "../LegalSourcesDisplay";

export function AppealStep1({ ctx }: { ctx: any }) {
  const {
    currentStep,
    rawText,
    setRawText,
    secondText,
    setSecondText,
    isDualMode,
    setIsDualMode,
    isParsingPdf,
    isAnalyzing,
    setShowJudicialModal,
    targetJudicialField,
    setTargetJudicialField,
    firstUrl,
    setFirstUrl,
    secondUrl,
    setSecondUrl,
    isFetchingUrl,
    fetchFromUrl,
    judgmentSummary,
    isAnalyzingSummaryOnly,
    summaryCardRef,
    handleFileUpload,
    handleDeidentify,
    handleAnalyzeJudgment
  } = ctx;

  return (
    <>
      {/* 步驟 1: 匯入判決 */}
      {currentStep === 1 && (
        <div className="bg-[var(--color-surface-overlay)] p-6 rounded-xl shadow-xs border border-[var(--color-border-subtle)] space-y-6">
          <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-4 flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">第一步：匯入裁判書與 AI 分析</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">上傳裁判 PDF 檔或直接貼上判決全文，支援單一裁判書分析或雙裁判書（二個判決）對照比對。</p>
            </div>
            
            {/* 模式切換鈕 */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer bg-[var(--color-surface-overlay)] hover:bg-[var(--color-border-strong)] px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--color-text-secondary)] transition">
                <input
                  type="checkbox"
                  checked={isDualMode}
                  onChange={(e) => setIsDualMode(e.target.checked)}
                  className="rounded text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
                />
                <span>開啟雙裁判書對照剖析模式 (放入二個判決書)</span>
              </label>
            </div>
          </div>

          {isParsingPdf && (
            <div className="p-3 bg-[var(--color-status-info-bg)] text-[var(--color-status-info)] text-xs rounded-lg animate-pulse">
              📄 正在解析 PDF 文字，請稍候...
            </div>
          )}

          {!isDualMode ? (
            /* 單一裁判書模式 */
            <div>
              <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                <label className="text-sm font-bold text-[var(--color-text-primary)]">原審裁判全文內容：</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetJudicialField('first');
                      setShowJudicialModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <span>⚖️ 判決全文庫檢索載入 (2,250萬筆免帳密)</span>
                  </button>
                  <label className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-overlay)] px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1">
                    📁 上傳裁判 PDF / TXT 檔
                    <input type="file" accept=".pdf,.txt" onChange={(e) => handleFileUpload(e, 'first')} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 mb-2">
                <input
                  type="url"
                  value={firstUrl}
                  onChange={(e) => setFirstUrl(e.target.value)}
                  placeholder="或輸入網址載入內容 (例如新聞、判決網址)..."
                  className="flex-1 border border-[var(--color-border-subtle)] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--color-brand-primary)]"
                />
                <button
                  type="button"
                  onClick={() => fetchFromUrl('first')}
                  disabled={!firstUrl || isFetchingUrl}
                  className="bg-[var(--color-surface-overlay)] hover:bg-[var(--color-border-strong)] text-[var(--color-text-secondary)] border border-[var(--color-border-strong)] px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {isFetchingUrl && targetJudicialField === 'first' ? '讀取中...' : '🌐 讀取網址'}
                </button>
              </div>
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                rows={10}
                className="w-full border border-[var(--color-border-subtle)] rounded-lg p-3 text-xs leading-relaxed font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
                placeholder="請在此貼上原審裁判書全文，例如：「臺灣臺北地方法院 113 年度訴字第 1234 號民事判決...」"
              />
            </div>
          ) : (
            /* 雙裁判書對照模式 */
            <div className="space-y-4">
              <div className="bg-[var(--color-status-warning-bg)] p-3 rounded-lg border border-[var(--color-status-warning)]/30 text-xs text-[var(--color-status-warning)] font-medium flex items-center gap-2">
                <span>💡 雙裁判對照模式：您可以放入【二個判決書】（例如：一審判決 + 二審/抗告裁定，或是對照判決）。AI 將會比對兩判決之間的事實認定差異與訴訟矛盾點！</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 判決一 */}
                <div className="border border-[var(--color-border-subtle)] p-4 rounded-xl bg-[var(--color-surface-raised)]/50 space-y-2">
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <label className="text-xs font-bold text-[var(--color-status-info)] flex items-center gap-1">
                      <span>📄 裁判書 一 (主裁判 / 原審判決)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetJudicialField('first');
                          setShowJudicialModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-2xs font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        ⚖️ 判決全文庫檢索
                      </button>
                      <label className="bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)] px-2.5 py-1 rounded text-2xs font-bold cursor-pointer transition flex items-center gap-0.5">
                        📁 上傳 PDF
                        <input type="file" accept=".pdf,.txt" onChange={(e) => handleFileUpload(e, 'first')} className="hidden" />
                      </label>
                    </div>
                  </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 mb-2">
                      <input
                        type="url"
                        value={firstUrl}
                        onChange={(e) => setFirstUrl(e.target.value)}
                        placeholder="輸入網址..."
                        className="flex-1 border border-[var(--color-border-strong)] rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 bg-[var(--color-surface-overlay)]"
                      />
                      <button
                        type="button"
                        onClick={() => fetchFromUrl('first')}
                        disabled={!firstUrl || isFetchingUrl}
                        className="bg-[var(--color-surface-overlay)] hover:bg-[var(--color-border-strong)] text-[var(--color-text-secondary)] border border-[var(--color-border-strong)] px-3 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        🌐 讀取
                      </button>
                    </div>
                  <textarea
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    rows={8}
                    className="w-full border border-[var(--color-border-strong)] rounded-lg p-2.5 text-xs leading-relaxed font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[var(--color-surface-overlay)]"
                    placeholder="請在此貼上第一個判決書內容..."
                  />
                </div>

                {/* 判決二 */}
                <div className="border border-[var(--color-border-subtle)] p-4 rounded-xl bg-[var(--color-surface-raised)]/50 space-y-2">
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <label className="text-xs font-bold text-[var(--color-status-success)] flex items-center gap-1">
                      <span>📄 裁判書 二 (對照裁判 / 原裁定或對照案)</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetJudicialField('second');
                          setShowJudicialModal(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-2xs font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        🏛️ 司法院 API
                      </button>
                      <label className="bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)] px-2.5 py-1 rounded text-2xs font-bold cursor-pointer transition flex items-center gap-0.5">
                        📁 上傳 PDF
                        <input type="file" accept=".pdf,.txt" onChange={(e) => handleFileUpload(e, 'second')} className="hidden" />
                      </label>
                    </div>
                  </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2 mb-2">
                      <input
                        type="url"
                        value={secondUrl}
                        onChange={(e) => setSecondUrl(e.target.value)}
                        placeholder="輸入網址..."
                        className="flex-1 border border-[var(--color-border-strong)] rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 bg-[var(--color-surface-overlay)]"
                      />
                      <button
                        type="button"
                        onClick={() => fetchFromUrl('second')}
                        disabled={!secondUrl || isFetchingUrl}
                        className="bg-[var(--color-surface-overlay)] hover:bg-[var(--color-border-strong)] text-[var(--color-text-secondary)] border border-[var(--color-border-strong)] px-3 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        🌐 讀取
                      </button>
                    </div>
                  <textarea
                    value={secondText}
                    onChange={e => setSecondText(e.target.value)}
                    rows={8}
                    className="w-full border border-[var(--color-border-strong)] rounded-lg p-2.5 text-xs leading-relaxed font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-[var(--color-surface-overlay)]"
                    placeholder="請在此貼上第二個判決書內容（用以與判決一做對照比對）..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* 原審裁判案件事實故事化與裁判結果 */}
          <div ref={summaryCardRef} className="bg-[var(--color-status-info-bg)] border border-[var(--color-status-info)]/30 rounded-xl p-5 text-xs space-y-4 text-[var(--color-status-info)] scroll-mt-6 shadow-xs">
            <div className="font-bold flex items-center justify-between text-sm border-b border-[var(--color-status-info)]/30 pb-3">
              <span className="flex items-center gap-2 text-[var(--color-status-info)] font-extrabold text-base">
                📋 案件事實故事與裁判結果
              </span>
              {judgmentSummary && (
                <span className="text-2xs bg-emerald-600 text-white px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 shadow-2xs">
                  ✓ 智慧剖析完成
                </span>
              )}
            </div>

            {judgmentSummary ? (
              <div className="space-y-4 text-xs leading-relaxed">
                {/* 1. 案件事實用說故事的方式 (至少五百字・綜合被害人、涉嫌人、證人觀點) */}
                <div className="bg-[var(--color-surface-overlay)] p-4 rounded-lg border border-[var(--color-status-info)]/30 shadow-2xs space-y-2">
                  <div className="font-bold text-sm text-[var(--color-status-info)] flex items-center justify-between border-b border-[var(--color-status-info)]/30 pb-2">
                    <span className="flex items-center gap-2">
                      <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-2xs font-bold">1</span>
                      <span>案件事實用說故事的方式（至少五百字・綜合被害人、涉嫌人與證人觀點）</span>
                    </span>
                    {(judgmentSummary.storyNarrative || judgmentSummary.overview) && (
                      <span className="text-3xs text-[var(--color-text-muted)] font-mono font-normal">
                        字數：{(judgmentSummary.storyNarrative || judgmentSummary.overview || '').length} 字
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--color-text-primary)] font-medium leading-relaxed whitespace-pre-line text-xs">
                    {judgmentSummary.storyNarrative || judgmentSummary.overview}
                  </p>
                </div>

                {/* 2. 裁判結果 */}
                <div className="bg-[var(--color-surface-overlay)] p-4 rounded-lg border border-[var(--color-status-danger)]/30 shadow-2xs space-y-2">
                  <div className="font-bold text-sm text-[var(--color-status-danger)] flex items-center gap-2 border-b border-[var(--color-status-danger)]/30 pb-2">
                    <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-2xs font-bold">2</span>
                    <span>裁判結果（刑期或裁判結果要旨）</span>
                  </div>
                  <div className="p-3 bg-[var(--color-status-danger-bg)]/70 rounded-md border border-[var(--color-status-danger)]/30 text-xs font-bold text-red-950 whitespace-pre-line leading-relaxed">
                    {judgmentSummary.mainHolding || '（尚未載入裁判主文）'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[var(--color-text-secondary)] text-xs py-3 leading-relaxed">
                💡 貼上或匯入判決書全文後，點擊下方按鈕即可自動提煉：
                <ul className="list-disc list-inside mt-2 space-y-1.5 text-[var(--color-text-secondary)] font-medium">
                  <li><b>1. 案件事實用說故事的方式</b>（至少五百字・綜合被害人、涉嫌人與證人觀點）</li>
                  <li><b>2. 裁判結果</b>（刑期或判決主文要旨）</li>
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
            <div className="text-2xs text-[var(--color-text-muted)]">
              💡 提示：點擊「提煉案件事實故事與裁判結果」可於上方卡片直接閱讀。
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleDeidentify}
                disabled={isAnalyzing || isAnalyzingSummaryOnly || (!rawText.trim() && !secondText.trim())}
                className="bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-strong)] border border-[var(--color-border-subtle)] px-4 py-2.5 rounded-lg font-bold text-xs shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                title="清除身分證、電話及部分地址資訊"
              >
                <span>🛡️ 一鍵去識別化</span>
              </button>
              <button
                onClick={() => handleAnalyzeJudgment(false)}
                disabled={isAnalyzing || isAnalyzingSummaryOnly || !rawText.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold text-xs shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isAnalyzingSummaryOnly ? (
                  '⚡ 案件事實分析中...'
                ) : (
                  <>
                    <span>📋 提煉案件事實故事與裁判結果</span>
                    <span className="text-2xs font-normal opacity-90">(留在本頁)</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleAnalyzeJudgment(true)}
                disabled={isAnalyzing || isAnalyzingSummaryOnly || !rawText.trim()}
                className="bg-[var(--color-brand-primary)] text-white px-5 py-2.5 rounded-lg font-bold text-xs hover:opacity-90 transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isAnalyzing ? (
                  '🤖 正在剖析爭點與檢索實務見解...'
                ) : (
                  <>
                    <span>⚡ 分析爭點與相關判解函釋</span>
                    <span>前往第二步 ➔</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      
    </>
  );
}
