import React from 'react';
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { AntiGhostBadge } from "../AntiGhostBadge";
import { LegalSourcesDisplay } from "../LegalSourcesDisplay";

export function AppealStep4({ ctx }: { ctx: any }) {
  const {
    confirmDocument,
    activeCase,
    isFallbackMode,
    currentStep,
    setCurrentStep,
    outputTab,
    setOutputTab,
    isDualMode,
    showJudicialModal,
    setShowJudicialModal,
    judicialModalTab,
    setJudicialModalTab,
    targetJudicialField,
    tlrQuery,
    setTlrQuery,
    tlrSearchType,
    setTlrSearchType,
    tlrLoading,
    tlrResults,
    tlrNote,
    tlrFetchingDocId,
    judicialJid,
    setJudicialJid,
    judicialAccount,
    setJudicialAccount,
    judicialPassword,
    setJudicialPassword,
    judicialToken,
    judicialAuthLoading,
    judicialFetchLoading,
    judicialMsg,
    jlistData,
    jlistLoading,
    courtName,
    caseNo,
    appellantName,
    appelleeName,
    attachmentText,
    tableCourtName,
    tableYear,
    tableWord,
    tableNo,
    tableSubmitter,
    tableSubmitDate,
    issues,
    setIssues,
    evidences,
    generatedPetition,
    generatedDocumentId,
    petitionLegalSources,
    isExternalRetrievalUsed,
    retrievalStatusMessage,
    allowedCitations,
    humanGateNote,
    setHumanGateNote,
    petitionVerification,
    handleTlrSearch,
    handleTlrFetchFulltext,
    handleJudicialAuth,
    handleFetchJDocToField,
    handleFetchJListInModal,
    isVerifyingAi,
    verifyNotice,
    setVerifyNotice,
    handleFullVerify,
    handlePrint
  } = ctx;

  return (
    <>
      {/* 步驟 4: 生成正式上訴狀預覽與列印 */}
      {currentStep === 4 && (
        <div className="bg-white p-6 rounded-xl shadow-xs border border-karoshi-border space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-karoshi-border pb-4 gap-3">
            <div>
              <h2 className="text-xl font-bold text-karoshi-text flex items-center gap-2">
                <span>第四步：司法院標準格式書狀與專用表單輸出</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">含正式上訴/覆審書狀，以及可獨立匯出列印之司法院標準「爭點整理對照表」與「調查證據聲請表」。</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {outputTab === 'petition' && (
                <button
                  onClick={() => handleFullVerify()}
                  disabled={isVerifyingAi}
                  className="bg-emerald-900 hover:bg-emerald-800 text-emerald-100 border border-emerald-700/80 px-3 py-2 rounded text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                  title="手動重新執行全篇法條與判例防虛構檢核"
                >
                  {isVerifyingAi ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-emerald-300/30 border-t-emerald-300 rounded-full animate-spin" />
                      檢核中...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      全篇 AI 檢核
                    </>
                  )}
                </button>
              )}

              {outputTab === 'petition' ? (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPetition);
                  }}
                  className="bg-gray-100 border border-gray-300 text-gray-700 px-3 py-2 rounded text-xs font-bold hover:bg-gray-200"
                >
                  📋 複製書狀全文
                </button>
              ) : outputTab === 'issues_table' ? (
                <button
                  onClick={() => {
                    const md = `| 項次 | 爭點類型與名稱 | 原審判決/原決定認定內容 | 我方上訴/覆審指摘不服理由 | 對應證據編號 | 引用法條與實務見解 | 攻防定位提示 |\n|---|---|---|---|---|---|---|\n` +
                      issues.map((i, idx) => `| ${idx + 1} | [${i.issueType || '爭點'}] ${i.title} | ${i.originalHolding} | ${i.appealArgument} | ${i.relatedEvidenceCodes || '-'} | ${i.legalBasis || '-'} | ${i.legalStrength === 'NEED_SUPPLEMENT' ? '⚠️ 需補充證據' : '🎯 重點攻擊'} |`).join('\n');
                    navigator.clipboard.writeText(md);
                  }}
                  className="bg-amber-100 border border-amber-300 text-amber-900 px-3 py-2 rounded text-xs font-bold hover:bg-amber-200"
                >
                  📋 複製爭點表 (Markdown)
                </button>
              ) : (
                <button
                  onClick={() => {
                    const md = `| 聲調編號 | 證據標的與名稱 | 種類 | 待證事實 | 對應爭點 | 保管機關/占有人 | 調查方法 | 聲請調查必要性(民訴286/刑訴163Ⅱ) | 備註 |\n|---|---|---|---|---|---|---|---|---|\n` +
                      evidences.map((e) => `| ${e.code} | ${e.target} | ${e.type || '書證'} | ${e.provenFact || '-'} | ${e.relatedIssueTitle || '-'} | ${e.holder || '詳卷'} | ${e.method} | ${e.necessity || '-'} | ${e.note || '-'} |`).join('\n');
                    navigator.clipboard.writeText(md);
                  }}
                  className="bg-blue-100 border border-blue-300 text-blue-900 px-3 py-2 rounded text-xs font-bold hover:bg-blue-200"
                >
                  📋 複製證據表 (Markdown)
                </button>
              )}

              <button
                onClick={() => {
                  if (isFallbackMode) {
                    return;
                  }
                  handlePrint();
                }}
                className={`${isFallbackMode ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#2C7873] hover:opacity-90'} text-white px-4 py-2 rounded text-xs font-bold shadow-xs`}
                title={isFallbackMode ? '示範模式下禁用' : ''}
              >
                🖨 列印 / 存為 A4 PDF
              </button>
            </div>
          </div>

          {outputTab === 'petition' && generatedPetition && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 space-y-2 text-xs text-amber-900">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <span>⚖️ 律師複核與人工查證提示</span>
                </span>
                {activeCase?.documents.find(d => d.id === generatedDocumentId)?.status === 'HUMAN_APPROVED' && (
                  <span className="text-2xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">已人工查證標記</span>
                )}
              </div>
              <div className="text-[11px] text-amber-800 leading-relaxed">
                系統驗證不代表最終法律效力；具狀前請人工核對事實、法定上訴期間與每一筆判解引用。
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={humanGateNote}
                  onChange={e => setHumanGateNote(e.target.value)}
                  placeholder="可選填：記錄人工查證筆記或備忘..."
                  className="flex-1 border border-amber-200 rounded px-2.5 py-1 text-xs bg-white"
                />
                <button
                  disabled={!generatedDocumentId || !humanGateNote.trim()}
                  onClick={() => generatedDocumentId && confirmDocument(generatedDocumentId, humanGateNote.trim())}
                  className="px-3 py-1 rounded bg-amber-700 text-white text-xs font-bold disabled:opacity-40"
                >
                  記錄查證
                </button>
              </div>
            </div>
          )}

          {/* 表單切換頁籤 (Tab Switcher) */}
          <div className="flex border-b border-gray-200 text-xs font-bold">
            <button
              onClick={() => setOutputTab('petition')}
              className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${outputTab === 'petition' ? 'border-karoshi-accent text-karoshi-accent bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              <span>📄 正式訴訟書狀全文</span>
            </button>

            <button
              onClick={() => setOutputTab('issues_table')}
              className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${outputTab === 'issues_table' ? 'border-amber-600 text-amber-700 bg-amber-50/50' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              <span>📊 專用附表一：司法院標準【爭點整理對照表】</span>
              <span className="bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full text-3xs font-mono">{issues.length}</span>
            </button>

            <button
              onClick={() => setOutputTab('evidences_table')}
              className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-1.5 ${outputTab === 'evidences_table' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              <span>📋 專用附表二：司法院標準【調查證據聲請表】</span>
              <span className="bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded-full text-3xs font-mono">{evidences.length}</span>
            </button>
          </div>

          {/* 爭點與證據完整度檢核與核對清單 */}
          <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center border-b border-emerald-200/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold text-sm">✅ 【書狀爭點與證據完全寫入檢核面板】</span>
                <span className="bg-emerald-600 text-white text-3xs px-2 py-0.5 rounded-full font-bold">逐項整理與對應</span>
              </div>
              <button
                onClick={() => setCurrentStep(2)}
                className="text-xs text-emerald-800 font-bold hover:underline"
              >
                ✏️ 增刪爭點與證據 ➔
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* 爭點核對列表 */}
              <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-2">
                <div className="font-bold text-emerald-950 flex justify-between">
                  <span>⚖️ 本狀已載入之爭點 ({issues.length} 項)</span>
                  <span className="text-3xs text-emerald-600">均已設立獨立理由段落</span>
                </div>
                {issues.length === 0 ? (
                  <p className="text-gray-400 italic">無特定爭點</p>
                ) : (
                  <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {issues.map((issue, idx) => (
                      <li key={issue.id || idx} className="bg-emerald-50/40 p-1.5 rounded border border-emerald-100/60">
                        <div className="font-bold text-emerald-900">
                          {idx + 1}. [{issue.issueType || '爭點'}] {issue.title || '爭點標題'}
                        </div>
                        <p className="text-3xs text-gray-600 truncate mt-0.5">
                          <b>攻擊理由：</b>{issue.appealArgument || '指摘認定瑕疵'}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 證據核對列表 */}
              <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-2">
                <div className="font-bold text-emerald-950 flex justify-between">
                  <span>📋 本狀已載入之證據與物證 ({evidences.length} 項)</span>
                  <span className="text-3xs text-emerald-600">均已列入聲請調查證據表</span>
                </div>
                {evidences.length === 0 ? (
                  <p className="text-gray-400 italic">無特定證據</p>
                ) : (
                  <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {evidences.map((ev, idx) => (
                      <li key={ev.id || idx} className="bg-emerald-50/40 p-1.5 rounded border border-emerald-100/60 flex items-start gap-1.5">
                        <span className="bg-emerald-200 text-emerald-900 font-bold text-3xs px-1.5 py-0.5 rounded whitespace-nowrap">
                          {ev.code || `證${idx + 1}`}
                        </span>
                        <div className="overflow-hidden">
                          <div className="font-bold text-gray-800 text-3xs truncate">[{ev.type || '書證'}] {ev.target || '證據名稱'}</div>
                          <div className="text-3xs text-gray-500 truncate"><b>方法：</b>{ev.method || '待證事實'}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* 視圖區域 */}
          {outputTab === 'petition' && (
            <div className="space-y-4">
              {verifyNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between animate-fadeIn shadow-xs font-sans">
                  <span className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    {verifyNotice}
                  </span>
                  <button 
                    onClick={() => setVerifyNotice(null)} 
                    className="text-emerald-700 hover:text-emerald-900 text-xs ml-2 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}
              <LegalSourcesDisplay 
                sources={petitionLegalSources}
                isExternal={isExternalRetrievalUsed}
                statusMessage={retrievalStatusMessage}
                allowedCitations={allowedCitations}
                theme="light"
              />
              <AntiGhostBadge verification={petitionVerification} />
              <div className="w-full flex justify-center bg-gray-100 p-6 rounded-xl overflow-y-auto">
                <div className="bg-white p-12 rounded-xl w-full max-w-[210mm] min-h-[297mm] text-black text-sm leading-relaxed border border-gray-300 font-serif whitespace-pre-wrap">
                  {generatedPetition || '上訴狀生成中...'}
                </div>
              </div>
            </div>
          )}

          {outputTab === 'issues_table' && (
            <div className="w-full bg-white border border-gray-300 rounded-xl p-6 overflow-x-auto font-serif">
              <div className="text-center space-y-1 mb-6 border-b pb-4">
                <h2 className="text-xl font-bold text-gray-900">附表一：司法院標準 爭點整理對照表</h2>
                <p className="text-xs text-gray-600">案號：{caseNo || '詳卷'} ｜ 當事人：{appellantName} vs {appelleeName}</p>
              </div>

              <table className="w-full border-collapse border border-gray-400 text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-900 font-bold">
                    <th className="border border-gray-400 p-2 w-12 text-center">項次</th>
                    <th className="border border-gray-400 p-2 w-36">爭點類型與標題</th>
                    <th className="border border-gray-400 p-2 w-1/3">原審判決/原決定認定內容與理由</th>
                    <th className="border border-gray-400 p-2 w-1/3">我方上訴/覆審攻擊與指摘理由</th>
                    <th className="border border-gray-400 p-2 w-20 text-center">對應證物</th>
                    <th className="border border-gray-400 p-2 w-28">引用法條與實務見解</th>
                    <th className="border border-gray-400 p-2 w-24 text-center">攻防定位提示</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((i, idx) => (
                    <tr key={i.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="border border-gray-400 p-2 font-bold text-center font-mono">{idx + 1}</td>
                      <td className="border border-gray-400 p-2 font-bold text-gray-900">
                        <span className="text-3xs bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.5 rounded block w-max mb-1">
                          {i.issueType || '爭點事項'}
                        </span>
                        {i.title}
                      </td>
                      <td className="border border-gray-400 p-2 text-gray-700 leading-relaxed whitespace-pre-wrap">{i.originalHolding || '（未說明）'}</td>
                      <td className="border border-gray-400 p-2 text-blue-950 font-medium leading-relaxed whitespace-pre-wrap">{i.appealArgument || '（未說明）'}</td>
                      <td className="border border-gray-400 p-2 text-center font-bold text-blue-800 font-mono">{i.relatedEvidenceCodes || '-'}</td>
                      <td className="border border-gray-400 p-2 text-gray-800">{i.legalBasis || '-'}</td>
                      <td className="border border-gray-400 p-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const newVal = i.legalStrength === 'NEED_SUPPLEMENT' ? 'HIGH' : 'NEED_SUPPLEMENT';
                            setIssues(issues.map(item => item.id === i.id ? { ...item, legalStrength: newVal } : item));
                          }}
                          title="點擊切換爭點定位（🎯 重點攻擊 ↔ ⚠️ 需補充證據）"
                          className={`px-2 py-1 rounded text-3xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            i.legalStrength === 'NEED_SUPPLEMENT'
                              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300'
                          }`}
                        >
                          {i.legalStrength === 'NEED_SUPPLEMENT' ? '⚠️ 需補充證據' : '🎯 重點攻擊'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {outputTab === 'evidences_table' && (
            <div className="w-full bg-white border border-black p-8 rounded-xl font-serif space-y-4 text-black">
              {/* 頂部附件標籤 */}
              <div className="text-left font-bold text-sm text-black">
                {attachmentText || '附件'}
              </div>

              {/* 標題外框 */}
              <div className="text-center font-bold text-lg text-black border-2 border-black p-3 tracking-wider bg-gray-50/50">
                {tableCourtName || courtName || '臺灣高等法院'}{tableYear || '112'}年度{tableWord || '重上'}字第{tableNo || '123'}號調查證據聲請表
              </div>

              {/* 提出人與日期列 */}
              <div className="grid grid-cols-2 border border-black text-xs font-bold p-2.5 bg-gray-50/30">
                <div>提出人（簽章）：{tableSubmitter || `上訴人 ${appellantName}`}</div>
                <div className="text-right">提出日期：{tableSubmitDate || '112年12月25日'}</div>
              </div>

              {/* 精準 6 欄位表格 */}
              <table className="w-full border-collapse border border-black text-xs font-serif">
                <thead>
                  <tr className="bg-gray-100 text-black font-bold">
                    <th className="border border-black p-2.5 w-12 text-center">編號</th>
                    <th className="border border-black p-2.5 w-1/5 text-left">所涉爭點</th>
                    <th className="border border-black p-2.5 w-1/6 text-left">調查事項</th>
                    <th className="border border-black p-2.5 w-1/6 text-left">調查對象</th>
                    <th className="border border-black p-2.5 w-1/5 text-left">對象地址及聯絡方式</th>
                    <th className="border border-black p-2.5 w-1/4 text-left">待證事實(限50字)</th>
                  </tr>
                </thead>
                <tbody>
                  {evidences.map((e, idx) => (
                    <tr key={e.id || idx} className="hover:bg-gray-50">
                      <td className="border border-black p-2 text-center font-bold font-mono text-sm">{e.code || idx + 1}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap leading-relaxed">{e.relatedIssue || e.relatedIssueTitle || '-'}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap leading-relaxed font-medium">{e.investigationItem || e.method || '-'}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap leading-relaxed font-bold">{e.investigationTarget || e.target || '-'}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap leading-relaxed text-gray-800">{e.targetAddress || e.holder || '-'}</td>
                      <td className="border border-black p-2 whitespace-pre-wrap leading-relaxed">{e.provenFact || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-karoshi-border">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 border rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              ⯇ 返回修改判解
            </button>
          </div>
        </div>
      )}

            {/* 裁判書檢索與載入對話框 (Taiwan Legal RAG + 司法院官方 API) */}
      {showJudicialModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>裁判書全文庫檢索與匯入</span>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                    匯入至【{targetJudicialField === 'second' ? '裁判書 二' : '裁判書 一'}】
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  支援案號精準調卷（如 112台上2409、115侵訴33）與自然語言語義檢索，一鍵載入裁判全文。
                </p>
              </div>
              <button
                onClick={() => setShowJudicialModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 gap-2">
              <button
                type="button"
                onClick={() => setJudicialModalTab('tlr')}
                className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
                  judicialModalTab === 'tlr'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ⚡ Taiwan Legal RAG 全文庫 (2,250萬筆・24H免帳密)
              </button>
              <button
                type="button"
                onClick={() => setJudicialModalTab('official')}
                className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
                  judicialModalTab === 'official'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🏛️ 司法院官方 API (JDoc / JList・限 08:00 後)
              </button>
            </div>

            {/* TAB 1: Taiwan Legal RAG */}
            {judicialModalTab === 'tlr' && (
              <div className="space-y-4">
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 relative flex items-center">
                      <input
                        type="text"
                        value={tlrQuery}
                        onChange={(e) => setTlrQuery(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => e.key === 'Enter' && handleTlrSearch()}
                        placeholder="輸入字號、司法院網址或案由 (例如：115年度侵訴字第33號、112台上2409)..."
                        className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                      {tlrQuery && (
                        <button
                          type="button"
                          onClick={() => setTlrQuery('')}
                          className="absolute right-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold p-0.5 rounded-full"
                          title="清除輸入"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <select
                      value={tlrSearchType}
                      onChange={(e: any) => setTlrSearchType(e.target.value)}
                      className="bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="hybrid">混合搜尋 (Hybrid)</option>
                      <option value="keyword">精準詞彙 (Keyword)</option>
                      <option value="phrase">片語檢索 (Phrase)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleTlrSearch()}
                      disabled={tlrLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1 shadow-xs cursor-pointer flex-none"
                    >
                      {tlrLoading ? '🔍 檢索中...' : '🔍 立即檢索'}
                    </button>
                  </div>

                  {/* 常用快速測試 Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap text-2xs text-gray-600">
                    <span className="font-bold text-gray-500">快速試搜：</span>
                    {[
                      { label: '最高法院 112台上2409', query: '112 台上 2409' },
                      { label: '115 侵訴 33', query: '115 侵訴 33' },
                      { label: '臺中高分院 105交訴51', query: '臺中高分院 105交訴51' },
                      { label: '112 審金訴 26', query: '112 審金訴 26' },
                      { label: '侵占 駁回', query: '侵占 駁回' }
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTlrQuery(chip.query);
                          handleTlrSearch(chip.query);
                        }}
                        className="bg-white border border-blue-200 text-blue-700 hover:bg-blue-100/70 hover:border-blue-300 px-2 py-0.5 rounded-full transition shadow-2xs font-medium cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 搜尋結果列表 */}
                {tlrResults.length > 0 && (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-700 px-1">
                      <span>檢索結果列表 ({tlrResults.length} 筆)</span>
                      {tlrNote && <span className="text-2xs text-blue-600 font-normal">{tlrNote}</span>}
                    </div>
                    {tlrResults.map((hit, hIdx) => (
                      <div
                        key={hit.doc_id || hIdx}
                        className="border border-gray-200 hover:border-blue-400 bg-gray-50/70 hover:bg-blue-50/30 rounded-xl p-3.5 transition space-y-2"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5 flex-wrap">
                              <span className="bg-blue-100 text-blue-800 text-2xs px-1.5 py-0.5 rounded font-bold">
                                #{hit.rank || hIdx + 1}
                              </span>
                              <span>{hit.citation_text || hit.doc_id}</span>
                              {hit.case_category && (
                                <span className="bg-gray-200 text-gray-700 text-2xs px-1.5 py-0.2 rounded">
                                  {hit.case_category}
                                </span>
                              )}
                            </div>
                            <div className="text-2xs text-gray-500 mt-0.5 flex gap-3">
                              <span>🏛️ {hit.court_name}</span>
                              <span>📅 裁判日期：{hit.jdate}</span>
                            </div>
                          </div>
                          <div className="flex gap-1.5 flex-none">
                            <button
                              type="button"
                              onClick={() => handleTlrFetchFulltext(hit, 'first')}
                              disabled={tlrFetchingDocId === hit.doc_id}
                              className="bg-white hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-300 px-2.5 py-1 rounded-lg text-2xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              {tlrFetchingDocId === hit.doc_id ? '載入中...' : '📥 載入至裁判一'}
                            </button>
                            {isDualMode && (
                              <button
                                type="button"
                                onClick={() => handleTlrFetchFulltext(hit, 'second')}
                                disabled={tlrFetchingDocId === hit.doc_id}
                                className="bg-white hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 px-2.5 py-1 rounded-lg text-2xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                📥 載入至裁判二
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 命中文字片段預覽 */}
                        {hit.hit_excerpt && (
                          <div className="bg-white/90 border border-gray-200 rounded p-2 text-2xs text-gray-700 font-mono leading-relaxed line-clamp-3">
                            <span className="text-blue-600 font-bold">〔命中片段〕</span> {hit.hit_excerpt}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: 司法院官方開放 API (JDoc / JList) */}
            {judicialModalTab === 'official' && (
              <div className="space-y-4">
                {/* 帳號驗證區塊 */}
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 space-y-2 text-xs">
                  <div className="font-bold text-gray-800 flex justify-between items-center">
                    <span>🔐 司法院開放平臺 Member Authentication</span>
                    {judicialToken && <span className="text-2xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">已連線</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="帳號 (預設使用系統環境變數)"
                      value={judicialAccount}
                      onChange={(e) => setJudicialAccount(e.target.value)}
                      className="border border-gray-300 rounded px-2.5 py-1 text-xs bg-white"
                    />
                    <input
                      type="password"
                      placeholder="密碼 (預設使用系統環境變數)"
                      value={judicialPassword}
                      onChange={(e) => setJudicialPassword(e.target.value)}
                      className="border border-gray-300 rounded px-2.5 py-1 text-xs bg-white"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-2xs text-gray-500">若伺服器已有設定環境變數，留空亦可自動驗證（每日 08:00~24:00 開放）。</span>
                    <button
                      type="button"
                      onClick={handleJudicialAuth}
                      disabled={judicialAuthLoading}
                      className="bg-gray-800 hover:bg-black text-white px-3 py-1 rounded text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      {judicialAuthLoading ? '驗證中...' : '進行身份驗證'}
                    </button>
                  </div>
                </div>

                {/* 裁判書 JID 代碼輸入與載入 */}
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold text-gray-800">
                    裁判書 JID 代碼 (例如：CHDM,105,交訴,51,20161216,1)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={judicialJid}
                      onChange={(e) => setJudicialJid(e.target.value)}
                      placeholder="請輸入 JID 代碼"
                      className="flex-grow border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleFetchJDocToField()}
                      disabled={judicialFetchLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition disabled:opacity-50 flex-none cursor-pointer"
                    >
                      {judicialFetchLoading ? '下載中...' : '📥 立即帶入裁判書'}
                    </button>
                  </div>
                </div>

                {/* 近 7 日異動清單查詢 */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700">🗓️ 司法院 JList 近 7 日裁判異動清單</span>
                    <button
                      type="button"
                      onClick={handleFetchJListInModal}
                      disabled={jlistLoading}
                      className="text-2xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2.5 py-1 rounded font-semibold border cursor-pointer"
                    >
                      {jlistLoading ? '查詢中...' : '抓取近 7 日裁判清單'}
                    </button>
                  </div>
                  {jlistData.length > 0 && (
                    <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2 bg-gray-50 text-2xs">
                      {jlistData.map((dayItem, dIdx) => (
                        <div key={dIdx} className="space-y-1">
                          <div className="font-bold text-gray-700 bg-gray-200/60 px-1.5 py-0.5 rounded">
                            📅 {dayItem.date} (含 {dayItem.list?.length || 0} 件)
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {dayItem.list?.slice(0, 10).map((itemJid, jIdx) => (
                              <button
                                key={jIdx}
                                type="button"
                                onClick={() => {
                                  setJudicialJid(itemJid);
                                  handleFetchJDocToField(itemJid);
                                }}
                                className="bg-white border hover:bg-blue-50 hover:border-blue-300 text-gray-800 px-1.5 py-0.5 rounded font-mono"
                              >
                                {itemJid}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 訊息狀態提示 */}
            {judicialMsg && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-lg font-medium">
                {judicialMsg}
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <div className="text-2xs text-gray-400">
                資料來源：司法院裁判書開放資料庫 ＆ Taiwan Legal RAG (2,250 萬筆)
              </div>
              <button
                type="button"
                onClick={() => setShowJudicialModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-bold cursor-pointer"
              >
                關閉視窗
              </button>
            </div>
          </div>
        </div>
      )}
    
    </>
  );
}
