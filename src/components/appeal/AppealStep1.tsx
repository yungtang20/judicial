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
        <div className="bg-white p-6 rounded-xl shadow-xs border border-karoshi-border space-y-6">
          <div className="flex justify-between items-center border-b border-karoshi-border pb-4 flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold text-karoshi-text">第一步：匯入裁判書與 AI 分析</h2>
              <p className="text-xs text-gray-500 mt-1">上傳裁判 PDF 檔或直接貼上判決全文，支援單一裁判書分析或雙裁判書（二個判決）對照比對。</p>
            </div>
            
            {/* 模式切換鈕 */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 transition">
                <input
                  type="checkbox"
                  checked={isDualMode}
                  onChange={(e) => setIsDualMode(e.target.checked)}
                  className="rounded text-karoshi-accent focus:ring-karoshi-accent"
                />
                <span>開啟雙裁判書對照剖析模式 (放入二個判決書)</span>
              </label>
            </div>
          </div>

          {isParsingPdf && (
            <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg animate-pulse">
              📄 正在解析 PDF 文字，請稍候...
            </div>
          )}

          {!isDualMode ? (
            /* 單一裁判書模式 */
            <div>
              <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                <label className="text-sm font-bold text-karoshi-text">原審裁判全文內容：</label>
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
                  <label className="bg-karoshi-sidebar border border-karoshi-border text-karoshi-text hover:bg-karoshi-hover px-3 py-1 rounded text-xs font-bold cursor-pointer transition-colors flex items-center gap-1">
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
                  className="flex-1 border border-karoshi-border rounded px-3 py-1.5 text-xs focus:outline-none focus:border-karoshi-accent"
                />
                <button
                  type="button"
                  onClick={() => fetchFromUrl('first')}
                  disabled={!firstUrl || isFetchingUrl}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {isFetchingUrl && targetJudicialField === 'first' ? '讀取中...' : '🌐 讀取網址'}
                </button>
              </div>
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                rows={10}
                className="w-full border border-karoshi-border rounded-lg p-3 text-xs leading-relaxed font-mono focus:outline-none focus:ring-2 focus:ring-karoshi-accent"
                placeholder="請在此貼上原審裁判書全文，例如：「臺灣臺北地方法院 113 年度訴字第 1234 號民事判決...」"
              />
            </div>
          ) : (
            /* 雙裁判書對照模式 */
            <div className="space-y-4">
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-800 font-medium flex items-center gap-2">
                <span>💡 雙裁判對照模式：您可以放入【二個判決書】（例如：一審判決 + 二審/抗告裁定，或是對照判決）。AI 將會比對兩判決之間的事實認定差異與訴訟矛盾點！</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 判決一 */}
                <div className="border border-gray-200 p-4 rounded-xl bg-gray-50/50 space-y-2">
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <label className="text-xs font-bold text-blue-900 flex items-center gap-1">
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
                      <label className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 px-2.5 py-1 rounded text-2xs font-bold cursor-pointer transition flex items-center gap-0.5">
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
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => fetchFromUrl('first')}
                        disabled={!firstUrl || isFetchingUrl}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        🌐 讀取
                      </button>
                    </div>
                  <textarea
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    rows={8}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs leading-relaxed font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="請在此貼上第一個判決書內容..."
                  />
                </div>

                {/* 判決二 */}
                <div className="border border-gray-200 p-4 rounded-xl bg-gray-50/50 space-y-2">
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <label className="text-xs font-bold text-emerald-900 flex items-center gap-1">
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
                      <label className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 px-2.5 py-1 rounded text-2xs font-bold cursor-pointer transition flex items-center gap-0.5">
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
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => fetchFromUrl('second')}
                        disabled={!secondUrl || isFetchingUrl}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        🌐 讀取
                      </button>
                    </div>
                  <textarea
                    value={secondText}
                    onChange={e => setSecondText(e.target.value)}
                    rows={8}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs leading-relaxed font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    placeholder="請在此貼上第二個判決書內容（用以與判決一做對照比對）..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* 原審裁判案件事實故事化與裁判結果 */}
          <div ref={summaryCardRef} className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 text-xs space-y-4 text-blue-950 scroll-mt-6 shadow-xs">
            <div className="font-bold flex items-center justify-between text-sm border-b border-blue-200 pb-3">
              <span className="flex items-center gap-2 text-blue-900 font-extrabold text-base">
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
                <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-2xs space-y-2">
                  <div className="font-bold text-sm text-blue-900 flex items-center justify-between border-b border-blue-100 pb-2">
                    <span className="flex items-center gap-2">
                      <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-2xs font-bold">1</span>
                      <span>案件事實用說故事的方式（至少五百字・綜合被害人、涉嫌人與證人觀點）</span>
                    </span>
                    {(judgmentSummary.storyNarrative || judgmentSummary.overview) && (
                      <span className="text-3xs text-gray-400 font-mono font-normal">
                        字數：{(judgmentSummary.storyNarrative || judgmentSummary.overview || '').length} 字
                      </span>
                    )}
                  </div>
                  <p className="text-gray-800 font-medium leading-relaxed whitespace-pre-line text-xs">
                    {judgmentSummary.storyNarrative || judgmentSummary.overview}
                  </p>
                </div>

                {/* 2. 裁判結果 */}
                <div className="bg-white p-4 rounded-lg border border-red-200 shadow-2xs space-y-2">
                  <div className="font-bold text-sm text-red-800 flex items-center gap-2 border-b border-red-100 pb-2">
                    <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-2xs font-bold">2</span>
                    <span>裁判結果（刑期或裁判結果要旨）</span>
                  </div>
                  <div className="p-3 bg-red-50/70 rounded-md border border-red-200 text-xs font-bold text-red-950 whitespace-pre-line leading-relaxed">
                    {judgmentSummary.mainHolding || '（尚未載入裁判主文）'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-600 text-xs py-3 leading-relaxed">
                💡 貼上或匯入判決書全文後，點擊下方按鈕即可自動提煉：
                <ul className="list-disc list-inside mt-2 space-y-1.5 text-gray-700 font-medium">
                  <li><b>1. 案件事實用說故事的方式</b>（至少五百字・綜合被害人、涉嫌人與證人觀點）</li>
                  <li><b>2. 裁判結果</b>（刑期或判決主文要旨）</li>
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
            <div className="text-2xs text-gray-500">
              💡 提示：點擊「提煉案件事實故事與裁判結果」可於上方卡片直接閱讀。
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleDeidentify}
                disabled={isAnalyzing || isAnalyzingSummaryOnly || (!rawText.trim() && !secondText.trim())}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 px-4 py-2.5 rounded-lg font-bold text-xs shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
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
                className="bg-karoshi-accent text-white px-5 py-2.5 rounded-lg font-bold text-xs hover:opacity-90 transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
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
