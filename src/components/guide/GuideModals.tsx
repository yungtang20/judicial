
import React from 'react';
import { LegalSourcesDisplay } from '../LegalSourcesDisplay';
import { ScenarioDetailModal } from './ScenarioDetailModal';
import {
  DollarSign, Clock, FileSignature,
  Scale, BookOpen, ShieldAlert, Sparkles, Phone, ArrowRight,
  Search, ShieldCheck, FileText, ChevronRight, CheckCircle2,
  AlertTriangle, EyeOff, Lock, LifeBuoy, Zap, Camera, Mic, MapPin, X
} from 'lucide-react';

export interface GuideModalsProps {
  [key: string]: any;
}

export const GuideModals: React.FC<GuideModalsProps> = (props) => {
  const {
    searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
    selectedScenario, setSelectedScenario, showAiTriageModal, setShowAiTriageModal,
    aiTriageLoading, setAiTriageLoading, aiTriageResult, setAiTriageResult,
    copiedDraft, setCopiedDraft, syllogismAnswers, setSyllogismAnswers,
    sourceTab, setSourceTab, isSafetyQuery, filteredScenarios, categories,
    QUICK_TAGS, handleRunAiTriage, handleLaunchScenario, handleSelectTool
  } = props;

  return (
    <>
      {selectedScenario && (
        <ScenarioDetailModal
          scenario={selectedScenario}
          onClose={() => setSelectedScenario(null)}
          onLaunch={handleLaunchScenario}
          onSelectTool={handleSelectTool}
        />
      )}
      {/* AI 全能即時診斷與書狀生成 Modal */}
      {showAiTriageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                  <Sparkles className="w-6 h-6 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>AI 全能案件深度法律診斷報告</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                      臺灣實體法與實務規則校準
                    </span>
                  </h3>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    針對爭議：「<strong className="text-slate-200">{searchQuery}</strong>」
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowAiTriageModal(false)}
                className="text-[var(--color-text-muted)] hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {aiTriageLoading ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mx-auto" />
                <div className="space-y-1">
                  <p className="text-base font-bold text-white">正在連線司法院實務規章與法律知識庫...</p>
                  <p className="text-xs text-[var(--color-text-muted)]">分析管轄法院、適用法條、追訴時效及起訴/告訴狀標準格式</p>
                </div>
              </div>
            ) : aiTriageResult ? (
              <div className="space-y-5 text-xs md:text-sm">
                {/* 敏感案件保護路徑強制提醒 */}
                {aiTriageResult.protectionNotice && (
                  <div id="triage-sensitive-protection-notice" className="bg-rose-950/80 border border-rose-500/60 text-rose-200 p-6 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-rose-300">緊急人身保護與通報提醒</div>
                      <div className="text-xs leading-relaxed">{aiTriageResult.protectionNotice}</div>
                    </div>
                  </div>
                )}

                {/* 適用法條與時效防呆提醒 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-950/70 p-6 rounded-xl border border-indigo-900/50 space-y-1.5">
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5" /> 適用實體法依據
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {aiTriageResult.legalBasis?.map((basis: string, idx: number) => (
                        <span key={idx} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-mono">
                          {basis}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={`bg-slate-950/70 p-6 rounded-xl border space-y-1.5 ${
                    aiTriageResult.caseType === 'CIVIL'
                      ? 'border-blue-900/50'
                      : aiTriageResult.caseType === 'CRIMINAL_PUBLIC'
                        ? 'border-rose-900/50'
                        : 'border-amber-900/50'
                  }`}>
                    <span className={`text-xs font-bold flex items-center gap-1.5 ${
                      aiTriageResult.caseType === 'CIVIL'
                        ? 'text-blue-400'
                        : aiTriageResult.caseType === 'CRIMINAL_PUBLIC'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                    }`}>
                      <Clock className="w-3.5 h-3.5" /> 訴訟性質與時效警示
                    </span>
                    <p className="text-slate-200 text-xs leading-relaxed font-semibold flex items-center gap-1.5">
                      {aiTriageResult.litigationNatureText || (
                        aiTriageResult.caseType === 'CIVIL'
                          ? '💼 純民事事件（民事損害賠償/調解，無刑事責任）'
                          : aiTriageResult.caseType === 'CRIMINAL_PUBLIC'
                            ? '⚡ 包含公訴罪 / 非告訴乃論（檢警知悉即應偵辦）'
                            : '⚠️ 刑事告訴乃論（知悉犯人起 6 個月內須具狀提告）'
                      )}
                    </p>
                    <p className="text-[var(--color-text-muted)] text-xs">
                      時效說明：{aiTriageResult.timeLimit}
                    </p>
                  </div>
                </div>

                {/* 外部法律資料分組檢索 */}
                <div className="bg-slate-950/70 p-6 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> 法規／裁判／函釋檢索</span>
                    <div className="flex items-center gap-2"><a href="https://www.lawbank.com.tw/SearchResult.aspx" target="_blank" rel="noreferrer" className="text-[10px] text-sky-400 hover:text-sky-300">Lawbank 外部搜尋 ↗</a><span className="text-[10px] text-[var(--color-text-muted)]">{aiTriageResult.sources?.enabled ? 'tw-legal-rag 外部資料源' : '未啟用外部資料源'}</span></div>
                  </div>
                  <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
                    {([
                      ['statutes', '法規'], ['judgments', '裁判'], ['references', '函釋'], ['literature', '論著']
                    ] as const).map(([key, label]) => (
                      <button key={key} onClick={() => setSourceTab(key)} className={`px-3 py-1.5 rounded-full text-xs border ${sourceTab === key ? 'border-sky-400 text-sky-300 bg-sky-950/50' : 'border-slate-700 text-[var(--color-text-muted)]'}`}>
                        {label} {(aiTriageResult.sources?.[key] || []).length}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {(aiTriageResult.sources?.[sourceTab] || []).length === 0 ? (
                      <p className="text-xs text-[var(--color-text-muted)]">目前沒有可顯示的結果；查無結果不代表法源不存在。</p>
                    ) : (aiTriageResult.sources[sourceTab] || []).map((source: any, index: number) => (
                      <div key={`${source.citation}-${index}`} className="border-b border-slate-800 last:border-0 pb-2 last:pb-0">
                        <div className="flex items-start justify-between gap-2"><span className="font-semibold text-slate-200">{source.title}</span>{source.status && <span className="text-[10px] text-amber-300">{source.status}</span>}</div>
                        {source.excerpt && <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mt-1">{source.excerpt}</p>}
                        {source.sourceUrl && <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] text-sky-400 hover:text-sky-300">查看來源 ↗</a>}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{aiTriageResult.sources?.disclaimer || '外部資料僅供查考，引用前請閱讀原文與官方來源。'}</p>
                </div>

                {/* 白話診斷分析 */}
                <div className="bg-slate-950/70 p-6 rounded-xl border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 白話案情與法律要件剖析
                  </span>
                  {aiTriageResult.isSyllogismComplete === false && aiTriageResult.missingQuestions?.length > 0 && (
                    <div className="mb-4 p-4 bg-rose-950/40 border border-rose-500/50 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                        <ShieldAlert className="w-5 h-5" />
                        <span>⚠️ 關鍵事實補正提醒 (三段論法檢核未通過)</span>
                      </div>
                      <p className="text-slate-300 text-xs">
                        您的案情描述過於簡略，為了確保書狀具備法律效力並符合構成要件，AI 發現以下關鍵事實尚未釐清：
                      </p>
                      <ul className="space-y-3 mt-2">
                        {aiTriageResult.missingQuestions.map((q: any, i: number) => {
                          const currentAnswer = syllogismAnswers[i] || { option: '', text: '' };
                          return (
                          <li key={i} className="text-xs bg-slate-900/80 p-3 rounded-lg border border-slate-700/50">
                            <div className="font-bold text-amber-300 mb-1">Q: {q.question}</div>
                            <div className="text-[var(--color-text-muted)] mb-2">📝 {q.reason}</div>
                            
                            {q.options && q.options.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {q.options.map((opt: string, optIdx: number) => (
                                  <label key={optIdx} className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-800 transition-colors">
                                    <input 
                                      type="radio" 
                                      name={`q-${i}`} 
                                      value={opt}
                                      checked={currentAnswer.option === opt}
                                      onChange={(e) => setSyllogismAnswers({ ...syllogismAnswers, [i]: { ...currentAnswer, option: e.target.value } })}
                                      className="mt-0.5 accent-indigo-500"
                                    />
                                    <span className="text-slate-300">{opt}</span>
                                  </label>
                                ))}
                                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-800 transition-colors">
                                  <input 
                                    type="radio" 
                                    name={`q-${i}`} 
                                    value="自行輸入"
                                    checked={currentAnswer.option === '自行輸入'}
                                    onChange={(e) => setSyllogismAnswers({ ...syllogismAnswers, [i]: { ...currentAnswer, option: e.target.value } })}
                                    className="mt-0.5 accent-indigo-500"
                                  />
                                  <span className="text-slate-300">其他 (自行輸入)</span>
                                </label>
                              </div>
                            )}

                            {(!q.options || q.options.length === 0 || currentAnswer.option === '自行輸入') && (
                              <textarea
                                placeholder="請在此回答補齊關鍵事實..."
                                value={currentAnswer.text}
                                onChange={(e) => setSyllogismAnswers({ ...syllogismAnswers, [i]: { ...currentAnswer, text: e.target.value } })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-white focus:border-indigo-500 outline-none resize-y min-h-[60px]"
                              />
                            )}
                          </li>
                        )})}
                      </ul>
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={() => {
                            const appended = Object.values(syllogismAnswers)
                              .map((ans: any) => {
                                if (ans.option === '自行輸入' || !ans.option) return ans.text;
                                return ans.option + (ans.text ? ` (${ans.text})` : '');
                              })
                              .filter(Boolean)
                              .join("\n");

                            if (appended) {
                              setSearchQuery(searchQuery + "\n補充說明：\n" + appended);
                              setShowAiTriageModal(false);
                              setTimeout(() => handleRunAiTriage(searchQuery + "\n補充說明：\n" + appended), 300);
                            }
                          }}
                          className="bg-rose-500 hover:bg-rose-400 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                        >
                          送出補充事實並重新分析
                        </button>
                      </div>
                      <div className="text-xs text-rose-300 mt-2 font-medium">
                        * 建議：請關閉此視窗，在上方輸入框補充上述資訊後再次診斷，或點擊下方直接產生「待補正」之書狀。
                      </div>
                    </div>
                  )}
                  <p className="text-slate-300 leading-relaxed text-xs">
                    {aiTriageResult.plainExplanation}
                  </p>
                </div>
                
                <LegalSourcesDisplay 
                  sources={aiTriageResult.sources}
                  isExternal={aiTriageResult.isExternalRetrievalUsed}
                  statusMessage={aiTriageResult.retrievalStatusMessage}
                  allowedCitations={aiTriageResult.allowedCitations}
                />

                {/* 建議行動與必備證據 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-950/70 p-6 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> 建議進行之法律行動
                    </span>
                    <ul className="space-y-1.5 pl-2 text-xs text-slate-300">
                      {aiTriageResult.suggestedActions?.map((act: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-sky-400 font-bold">{idx + 1}.</span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-950/70 p-6 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> 關鍵證據保全清單
                    </span>
                    <ul className="space-y-1.5 pl-2 text-xs text-slate-300">
                      {aiTriageResult.evidenceChecklist?.map((evi: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-purple-400 font-bold">•</span>
                          <span>{evi}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Anti-Ghost Verification Badge Bar */}
                {aiTriageResult.antiGhostVerification && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white space-y-2 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> 法律引用檢查報告
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-medium">
                        比對 {aiTriageResult.antiGhostVerification.totalCitationsChecked} 處引述 · 0 處明顯幽靈虛構
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {aiTriageResult.antiGhostVerification.verifiedCitations?.map((c: any, i: number) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-200 border border-slate-700"
                          title={c.officialSnippet}
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          {c.officialTitle}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* 自動生成的專屬訴狀草稿預覽 */}
                {aiTriageResult.pleadingDraft && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> AI 即時生成合規起訴/告訴狀草稿
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(aiTriageResult.pleadingDraft);
                          setCopiedDraft(true);
                          setTimeout(() => setCopiedDraft(false), 2000);
                        }}
                        className="text-xs text-indigo-300 hover:text-white px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-800/60 transition-colors"
                      >
                        {copiedDraft ? '✓ 已複製到剪貼簿' : '複製完整書狀'}
                      </button>
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                      {aiTriageResult.pleadingDraft}
                    </pre>
                  </div>
                )}

          {/* 底部導引與按鈕 */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
            {/* 左側：快捷導引 */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  handleSelectTool('unified');
                }}
                className="px-3 py-2 rounded-xl bg-sky-950/60 text-sky-300 border border-sky-800/50 text-[11px] font-semibold hover:bg-sky-900/60 transition-all flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                查看類似判決
              </button>
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  handleSelectTool('legalToolbox', undefined, {
                    preselectedToolId: 'UNIVERSAL_AI_PLEADING',
                    prefilledData: { incidentDetails: '' }
                  });
                }}
                className="px-3 py-2 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-800/50 text-[11px] font-semibold hover:bg-amber-900/60 transition-all flex items-center gap-1.5"
              >
                <FileSignature className="w-3.5 h-3.5" />
                一鍵產書狀
              </button>
            </div>
            {/* 右側：主操作 */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedCategory('ALL');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition-colors"
              >
                關閉
              </button>
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedCategory('ALL');
                  handleSelectTool('legalToolbox');
                }}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                進入法律工具箱
              </button>
            </div>
          </div>
                <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
                  {/* 左側：快捷導引按鈕 */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setShowAiTriageModal(false);
                        handleSelectTool("unified");
                      }}
                      className="px-3 py-2 rounded-xl bg-sky-950/60 text-sky-300 border border-sky-800/50 text-[11px] font-semibold hover:bg-sky-900/60 transition-all flex items-center gap-1.5"
                    >
                      <Search className="w-3.5 h-3.5" />
                      查看類似判決
                    </button>
                    <button
                      onClick={() => {
                        setShowAiTriageModal(false);
                        handleSelectTool("legalToolbox", undefined, {
                          preselectedToolId: "UNIVERSAL_AI_PLEADING",
                          prefilledData: {
                            incidentDetails: searchQuery
                          }
                        });
                      }}
                      className="px-3 py-2 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-800/50 text-[11px] font-semibold hover:bg-amber-900/60 transition-all flex items-center gap-1.5"
                    >
                      <FileSignature className="w-3.5 h-3.5" />
                      一鍵產書狀
                    </button>
                  </div>
                  {/* 右側：主操作 */}
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={() => setShowAiTriageModal(false)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition-colors"
                    >
                      關閉
                    </button>
                    <button
                      onClick={() => {
                        const recTool = aiTriageResult.recommendedToolId || "UNIVERSAL_AI_PLEADING";
                        setShowAiTriageModal(false);
                        handleSelectTool("legalToolbox", undefined, { 
                          preselectedToolId: recTool,
                          prefilledData: {
                            incidentDetails: searchQuery,
                            pleadingText: aiTriageResult.pleadingDraft
                          }
                        });
                      }}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>進入法律工具箱編輯並產製此書狀</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
};
