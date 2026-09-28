import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, Info } from "lucide-react";
import { AntiGhostBadge } from "../AntiGhostBadge";
import { LegalSourcesDisplay } from "../LegalSourcesDisplay";
import type { AppealStepContext } from './appealStepContext';
import { fetchWithAuth } from '../../lib/apiClient';


export function AppealStep1({ ctx }: { ctx: AppealStepContext }) {
  // 與 AppealStep4 相同：先確認進階檢索是否啟用，
  // 使用者才不會點下去才被告知功能未開通。
  //
  // 必須用 fetchWithAuth 而非裸 fetch：
  // 正式環境的 /api/* 需要訪客權杖，裸 fetch 會 401。
  const [tlrStatus, setTlrStatus] = useState<'loading' | 'enabled' | 'disabled' | 'unknown'>('loading');
  useEffect(() => {
    const controller = new AbortController();
    fetchWithAuth('/api/health', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (typeof data?.tlrStatus?.enabled !== 'boolean') throw new Error('invalid health');
        setTlrStatus(data.tlrStatus.enabled ? 'enabled' : 'disabled');
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setTlrStatus('unknown');
      });
    return () => controller.abort();
  }, []);
  const {
    currentStep,
    rawText,
    setRawText,
    groundingWarning,
    isLocalFallbackResult,
    degradedReason,
    degradedDetail,
    rejectedCitation,
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

          {/*
            上訴書狀產製尚未開放，必須在流程起點說明。

            實測：/api/generate-appeal-petition 目前無條件回 409
            （尚未建立經核准的書狀結構與 rule profile，屬正確的 fail-closed）。
            但使用者要填完四步、走到最後按下產製，才會知道產不出來——
            與先前修的「填完表單才被告知」是同一種浪費。
            前三步的判決分析、爭點整理、證據清單仍然可用並有價值，
            因此說明放在這裡而非封鎖整個流程。
          */}
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <Info className="w-3.5 h-3.5" aria-hidden="true" />
              最終的「上訴書狀」目前尚未開放產製
            </div>
            <p>
              法院書狀必須先建立經核准的格式結構與合規規則，系統才會產出，
              這段審核完成前不會交付任何未經授權的書狀。
              你仍可完整使用前三步：判決分析、爭點整理、調查證據清單，
              這些結果可直接用於自行撰寫或諮詢律師。
            </p>
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
                  {/*
                    按鈕文字必須反映實際狀態。

                    先前固定寫「2,250萬筆免帳密」，但進階檢索未啟用時
                    點下去只會得到「尚未啟用」。按鈕文字是用者最先讀到的，
                    宣傳一個開不起的功能等於誤導。
                  */}
                  <button
                    type="button"
                    onClick={() => {
                      setTargetJudicialField('first');
                      setShowJudicialModal(true);
                    }}
                    aria-label={tlrStatus === 'disabled' ? '判決全文庫檢索（進階檢索尚未開通）' : undefined}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs ${
                      tlrStatus === 'disabled'
                        ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <span>
                      {tlrStatus === 'disabled'
                        ? '⚖️ 判決全文庫檢索（尚未開通）'
                        : '⚖️ 判決全文庫檢索載入 (2,250萬筆免帳密)'}
                    </span>
                  </button>
                  <label className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-overlay)] px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1">
                    📁 上傳裁判 PDF / TXT 檔
                    <input type="file" accept=".pdf,.txt" aria-label="上傳原審裁判書 PDF 或 TXT" onChange={(e) => handleFileUpload(e, 'first')} className="hidden" />
                  </label>
                </div>
              </div>

                {/*
                  未啟用的功能必須在使用者點下去之前就說明。

                  實測：按鈕寫「判決全文庫檢索載入 (2,250萬筆免帳密)」，
                  使用者點下去才看到「進階 TW-Legal-RAG 尚未啟用」。
                  介面宣傳了一個開不起的功能，等於誤導。
                */}
                {tlrStatus === 'disabled' && (
                  <p className="mt-2 text-[11px] text-amber-300/90 flex items-start gap-1.5 leading-relaxed">
                    <Info className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>進階全文檢索（TW-Legal-RAG）尚未開通，點擊後無法載入。請改用司法院官方 API 或直接貼上判決全文。</span>
                  </p>
                )}
                {tlrStatus === 'unknown' && (
                  <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
                    無法確認進階全文檢索的可用狀態；若載入失敗，請改用司法院官方 API 或直接貼上判決全文。
                  </p>
                )}
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
                        <input type="file" accept=".pdf,.txt" aria-label="上傳原審裁判書 PDF 或 TXT" onChange={(e) => handleFileUpload(e, 'first')} className="hidden" />
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
                        <input type="file" accept=".pdf,.txt" aria-label="上傳第二份裁判書 PDF 或 TXT（對照剖析用）" onChange={(e) => handleFileUpload(e, 'second')} className="hidden" />
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
              {/*
                備援結果是本機規則產生的固定範本（含「案發當日」「特定現場」
                等未填入的佔位詞），不是從判決書提煉而來。
                先前只要有 judgmentSummary 就顯示「✓ 智慧剖析完成」，
                使使用者把範本文字當成自己案件的事實。
              */}
              {judgmentSummary && !isLocalFallbackResult && (
                <span className="text-2xs bg-emerald-600 text-white px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 shadow-2xs">
                  ✓ 智慧剖析完成
                </span>
              )}
              {judgmentSummary && isLocalFallbackResult && (
                <span className="text-2xs bg-amber-600 text-white px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 shadow-2xs">
                  ⚠ 本機規則備援範本（非提煉結果）
                </span>
              )}
            </div>

            {/*
              備援揭露直接由此處的狀態驅動，不依賴 ctx 傳遞。
              實測：groundingWarning 狀態存在、元件也有解構，
              卻因未納入 ctx 而在傳遞時被丟棄，
              導致揭露文字從未顯示——三者在、畫面上卻什麼都沒有。
            */}
            {judgmentSummary && isLocalFallbackResult && (
              <div
                role="alert"
                className="rounded-lg border border-amber-500/60 bg-amber-950/40 px-3 py-2.5 text-2xs leading-5 text-amber-100"
              >
                <span className="font-bold mr-1">⚠️ 本結果為本機規則備援範本：</span>
                下方敘事是固定範本（含「案發當日」「特定現場」等未填入的佔位詞），
                <b>並非從您提供的判決書提煉而來</b>，不得作為案件事實引用。
                {degradedDetail || '請自行核對原始裁判書後再撰寫理由。'}
                {degradedReason === 'CITATION_REJECTED' && rejectedCitation && (
                  <span className="mt-1 block">
                    被拒絕的引用：<b>{rejectedCitation}</b>。AI 可能捏造裁判字號，請特別留意。
                  </span>
                )}
                {degradedReason === 'SIMPLIFIED_OUTPUT' && (
                  <span className="mt-1 block">
                    請特別檢視所引用裁判書的原文用字，本次產出的用字未被採用。
                  </span>
                )}
              </div>
            )}

            {judgmentSummary ? (
              <div className="space-y-4 text-xs leading-relaxed">
                {/* 1. 案件事實忠實整理（字數與內容範圍需與提示詞一致） */}
                <div className="bg-[var(--color-surface-overlay)] p-4 rounded-lg border border-[var(--color-status-info)]/30 shadow-2xs space-y-2">
                  <div className="font-bold text-sm text-[var(--color-status-info)] flex items-center justify-between border-b border-[var(--color-status-info)]/30 pb-2">
                    <span className="flex items-center gap-2">
                      <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-2xs font-bold">1</span>
                      <span>案件事實忠實整理（200~400 字・只寫判決書記載的內容）</span>
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
                    {judgmentSummary.mainHolding || '（無法從所提供的文字確認裁判主文，請自行對照判決書正本填寫）'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[var(--color-text-secondary)] text-xs py-3 leading-relaxed">
                💡 貼上或匯入判決書全文後，點擊下方按鈕即可自動提煉：
                <ul className="list-disc list-inside mt-2 space-y-1.5 text-[var(--color-text-secondary)] font-medium">
                  <li><b>1. 案件事實忠實整理</b>（200~400 字・只寫判決書記載的內容）</li>
                  <li><b>2. 裁判結果</b>（刑期或判決主文要旨）</li>
                </ul>
              </div>
            )}
          </div>

          {groundingWarning && (
            <div role="alert" className="rounded-lg border border-amber-500/50 bg-amber-950/30 px-3 py-2 text-2xs leading-5 text-amber-100">
              <span className="font-bold mr-1">⚠️ 請核對原文：</span>
              {groundingWarning}
            </div>
          )}

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
