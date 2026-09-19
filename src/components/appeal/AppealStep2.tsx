import React from 'react';
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { AntiGhostBadge } from "../AntiGhostBadge";
import { LegalSourcesDisplay } from "../LegalSourcesDisplay";

export function AppealStep2({ ctx }: { ctx: any }) {
  const {
    currentStep,
    setCurrentStep,
    caseType,
    setCaseType,
    courtName,
    setCourtName,
    appealCourtName,
    setAppealCourtName,
    caseNo,
    setCaseNo,
    sectionCode,
    setSectionCode,
    claimAmount,
    setClaimAmount,
    appellantRole,
    setAppellantRole,
    appellantName,
    setAppellantName,
    appellantId,
    setAppellantId,
    appellantAddress,
    setAppellantAddress,
    appellantPhone,
    setAppellantPhone,
    appellantLegalRep,
    setAppellantLegalRep,
    appelleeRole,
    setAppelleeRole,
    appelleeName,
    setAppelleeName,
    appelleeId,
    setAppelleeId,
    appelleeAddress,
    setAppelleeAddress,
    deliveryAgent,
    setDeliveryAgent,
    deliveryAddress,
    setDeliveryAddress,
    claims,
    setClaims,
    issues,
    setIssues,
    keywords,
    setKeywords,
    isSearchingPrecedents,
    precedents,
    setPrecedents,
    appealEligibility,
    eligibilityStatusTitle,
    eligibilityReason,
    proceduralRequirements,
    judgmentSummary,
    showSummaryInStep2,
    setShowSummaryInStep2,
    handleSearchPrecedents
  } = ctx;

  return (
    <>
      {/* 步驟 2: 分析爭點與權威實務見解 */}
      {currentStep === 2 && (
        <div className="bg-[var(--color-surface-overlay)] p-6 rounded-xl shadow-xs border border-[var(--color-border-subtle)] space-y-6">
          <div className="border-b border-[var(--color-border-subtle)] pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">第二步：分析爭點與權威實務見解（廣含憲法法庭、最高法院、大法庭、高等法院座談會與主管機關函釋）</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">核對案件基本資料與爭點對照表，並連網檢索與挑選可直接引用做為上訴理由背書之憲法法庭判決、最高法院/最高行政法院裁判、大法庭裁定、高等法院法律座談會與中央主管機關函釋。</p>
            </div>
            <div className="flex gap-2">
              <select value={caseType} onChange={e => setCaseType(e.target.value as any)} className="border rounded px-3 py-1 text-xs font-bold bg-[var(--color-surface-raised)]">
                <option value="civil">民事訴訟上訴</option>
                <option value="criminal">刑事訴訟上訴</option>
                <option value="administrative">行政訴訟上訴</option>
                <option value="criminal_compensation">刑事補償覆審 (刑事補償法)</option>
              </select>
            </div>
          </div>

          {/* 📋 案件事實故事與裁判結果對照 (Step 2 頂部) */}
          {judgmentSummary && (
            <div className="bg-[var(--color-status-info-bg)] border border-[var(--color-status-info)]/30 rounded-xl p-4 text-xs space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--color-status-info)] text-sm flex items-center gap-2">
                  📋 案件事實故事與裁判結果（速讀對照）
                </span>
                <button
                  onClick={() => setShowSummaryInStep2(!showSummaryInStep2)}
                  className="text-2xs bg-blue-100 hover:bg-blue-200 text-[var(--color-status-info)] px-3 py-1 rounded-md font-bold transition-colors shadow-2xs"
                >
                  {showSummaryInStep2 ? '▲ 收折摘要' : '▼ 展開對照摘要'}
                </button>
              </div>
              {showSummaryInStep2 && (
                <div className="space-y-3 pt-3 border-t border-[var(--color-status-info)]/80">
                  {/* 1. 案情說故事 */}
                  <div className="bg-[var(--color-surface-overlay)] p-3.5 rounded-lg border border-[var(--color-status-info)]/30 shadow-2xs space-y-1.5">
                    <div className="font-bold text-xs text-[var(--color-status-info)] flex items-center justify-between border-b border-[var(--color-status-info)]/30 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-3xs font-bold">1</span>
                        <span>案件事實用說故事的方式（綜合被害人、涉嫌人與證人觀點）</span>
                      </span>
                      {(judgmentSummary.storyNarrative || judgmentSummary.overview) && (
                        <span className="text-3xs text-[var(--color-text-muted)] font-mono">
                          字數：{(judgmentSummary.storyNarrative || judgmentSummary.overview || '').length} 字
                        </span>
                      )}
                    </div>
                    <p className="text-[var(--color-text-primary)] font-medium leading-relaxed whitespace-pre-line text-xs">
                      {judgmentSummary.storyNarrative || judgmentSummary.overview}
                    </p>
                  </div>

                  {/* 2. 裁判結果 */}
                  <div className="bg-[var(--color-surface-overlay)] p-3.5 rounded-lg border border-[var(--color-status-danger)]/30 shadow-2xs space-y-1.5">
                    <div className="font-bold text-xs text-[var(--color-status-danger)] flex items-center gap-1.5 border-b border-[var(--color-status-danger)]/30 pb-1.5">
                      <span className="bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-3xs font-bold">2</span>
                      <span>裁判結果（刑期或裁判結果要旨）</span>
                    </div>
                    <div className="p-2.5 bg-[var(--color-status-danger-bg)]/70 rounded-md border border-[var(--color-status-danger)]/30 text-xs font-bold text-red-950 whitespace-pre-line leading-relaxed">
                      {judgmentSummary.mainHolding || '（尚未載入裁判主文）'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ⚖️ 訴訟法上訴資格與法定限制門檻審查卡片 */}
          <div className={`p-4 rounded-lg border text-xs space-y-2 ${
            appealEligibility === 'FORBIDDEN'
              ? 'bg-[var(--color-status-danger-bg)] border-red-300 text-[var(--color-status-danger)]'
              : appealEligibility === 'RESTRICTED'
              ? 'bg-[var(--color-status-warning-bg)] border-amber-300 text-[var(--color-status-warning)]'
              : 'bg-[var(--color-status-success-bg)] border-emerald-300 text-[var(--color-status-success)]'
          }`}>
            <div className="flex items-center justify-between font-bold text-sm">
              <span className="flex items-center gap-1.5">
                🏛️ 【訴訟法上訴/覆審合法性檢核】{eligibilityStatusTitle}
              </span>
              <span className="text-2xs px-2 py-0.5 rounded font-mono bg-[var(--color-surface-overlay)] border shadow-2xs">
                {caseType === 'civil' ? '民事訴訟法' : caseType === 'criminal' ? '刑事訴訟法' : caseType === 'administrative' ? '行政訴訟法' : '刑事補償法'}規範
              </span>
            </div>
            <p className="leading-relaxed font-medium">{eligibilityReason}</p>
            {proceduralRequirements && (
              <div className="pt-2 border-t border-dashed border-[var(--color-border-strong)]/80 text-2xs space-y-1">
                <div className="font-bold">⚠️ 訴訟程序要件與攻防指引：</div>
                <div>{proceduralRequirements}</div>
              </div>
            )}
            {appealEligibility === 'FORBIDDEN' && (
              <div className="bg-red-100 p-2 rounded text-[var(--color-status-danger)] text-2xs font-bold mt-2">
                🛑 法律救濟提示：本案依法可能不可提起普通上訴！如判決有重大違法瑕疵，建議研議改提「再審之訴」（民訴§496/刑訴§420）或向司法院憲法法庭聲請「憲法法庭裁判憲法審查」。
              </div>
            )}
            {appealEligibility === 'RESTRICTED' && (
              <div className="bg-amber-100 p-2 rounded text-[var(--color-status-warning)] text-2xs font-bold mt-2">
                💡 上訴理由關鍵：因本案受法律特別限制，上訴理由書務必聚焦於指摘原判決「違背法令」（如民訴§468適用法規不當、§469判決不備理由/理由矛盾等）。
              </div>
            )}
          </div>

          {/* 案件基本與司法院書狀必填欄位 */}
          <div className="space-y-4 bg-[var(--color-surface-raised)] p-4 rounded-lg border border-[var(--color-border-subtle)] text-xs">
            <div className="font-bold text-sm text-[var(--color-text-primary)] border-b pb-1">⚖️ 司法院書狀必要資訊設定</div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-[var(--color-text-secondary)] block mb-1">訴訟類別</label>
                <select value={caseType} onChange={e => setCaseType(e.target.value as any)} className="w-full border rounded p-1.5 bg-[var(--color-surface-overlay)] font-bold">
                  <option value="civil">民事訴訟上訴</option>
                  <option value="criminal">刑事訴訟上訴</option>
                  <option value="administrative">行政訴訟上訴</option>
                  <option value="criminal_compensation">刑事補償覆審 (刑事補償法)</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-[var(--color-text-secondary)] block mb-1">原審法院（遞狀處）</label>
                <input type="text" value={courtName} onChange={e => setCourtName(e.target.value)} className="w-full border rounded p-1.5 bg-[var(--color-surface-overlay)]" placeholder="例：臺灣臺北地方法院" />
              </div>
              <div>
                <label className="font-bold text-[var(--color-text-secondary)] block mb-1">轉呈上訴審法院</label>
                <input type="text" value={appealCourtName} onChange={e => setAppealCourtName(e.target.value)} className="w-full border rounded p-1.5 bg-[var(--color-surface-overlay)]" placeholder="例：臺灣高等法院" />
              </div>
              <div>
                <label className="font-bold text-[var(--color-text-secondary)] block mb-1">原審案號與股別</label>
                <div className="flex gap-1">
                  <input type="text" value={caseNo} onChange={e => setCaseNo(e.target.value)} className="w-2/3 border rounded p-1.5 bg-[var(--color-surface-overlay)]" placeholder="113年度訴字第1234號" />
                  <input type="text" value={sectionCode} onChange={e => setSectionCode(e.target.value)} className="w-1/3 border rounded p-1.5 bg-[var(--color-surface-overlay)] text-center" placeholder="股別" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {caseType !== 'criminal' && (
                <div>
                  <label className="font-bold text-[var(--color-text-secondary)] block mb-1">訴訟標的金額 / 價額（核算二審裁判費）</label>
                  <input type="text" value={claimAmount} onChange={e => setClaimAmount(e.target.value)} className="w-full border rounded p-1.5 bg-[var(--color-surface-overlay)]" placeholder="例：新臺幣 500,000 元" />
                </div>
              )}
              <div>
                <label className="font-bold text-[var(--color-text-secondary)] block mb-1">上訴之聲明（訴之廢棄或變更聲明）</label>
                <input type="text" value={claims} onChange={e => setClaims(e.target.value)} className="w-full border rounded p-1.5 bg-[var(--color-surface-overlay)] font-medium" />
              </div>
            </div>

            {/* 當事人明細區 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[var(--color-border-strong)] pt-3">
              <div className="space-y-2 bg-[var(--color-status-info-bg)] p-3 rounded border border-[var(--color-status-info)]/30">
                <div className="font-bold text-[var(--color-text-primary)] flex justify-between">
                  <span>上訴人（我方）資訊</span>
                  <input type="text" value={appellantRole} onChange={e => setAppellantRole(e.target.value)} className="border rounded px-1 text-center w-20 bg-[var(--color-surface-overlay)]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={appellantName} onChange={e => setAppellantName(e.target.value)} placeholder="姓名/名稱" className="border rounded p-1 bg-[var(--color-surface-overlay)]" />
                  <input type="text" value={appellantId} onChange={e => setAppellantId(e.target.value)} placeholder="身分證/統編" className="border rounded p-1 bg-[var(--color-surface-overlay)]" />
                </div>
                <input type="text" value={appellantAddress} onChange={e => setAppellantAddress(e.target.value)} placeholder="住居所/送達地址" className="w-full border rounded p-1 bg-[var(--color-surface-overlay)]" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={appellantPhone} onChange={e => setAppellantPhone(e.target.value)} placeholder="電話" className="border rounded p-1 bg-[var(--color-surface-overlay)]" />
                  <input type="text" value={appellantLegalRep} onChange={e => setAppellantLegalRep(e.target.value)} placeholder="法定代理人（無則免填）" className="border rounded p-1 bg-[var(--color-surface-overlay)]" />
                </div>
              </div>

              <div className="space-y-2 bg-[var(--color-surface-overlay)]/70 p-3 rounded border border-[var(--color-border-subtle)]">
                <div className="font-bold text-[var(--color-text-secondary)] flex justify-between">
                  <span>被上訴人/相對人 資訊</span>
                  <input type="text" value={appelleeRole} onChange={e => setAppelleeRole(e.target.value)} className="border rounded px-1 text-center w-20 bg-[var(--color-surface-overlay)]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={appelleeName} onChange={e => setAppelleeName(e.target.value)} placeholder="姓名/名稱" className="border rounded p-1 bg-[var(--color-surface-overlay)]" />
                  <input type="text" value={appelleeId} onChange={e => setAppelleeId(e.target.value)} placeholder="身分證/統編(詳卷)" className="border rounded p-1 bg-[var(--color-surface-overlay)]" />
                </div>
                <input type="text" value={appelleeAddress} onChange={e => setAppelleeAddress(e.target.value)} placeholder="住居所地址" className="w-full border rounded p-1 bg-[var(--color-surface-overlay)]" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={deliveryAgent} onChange={e => setDeliveryAgent(e.target.value)} placeholder="送達代收人" className="border rounded p-1 bg-[var(--color-surface-overlay)]" />
                  <input type="text" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="送達處所" className="border rounded p-1 bg-[var(--color-surface-overlay)]" />
                </div>
              </div>
            </div>
          </div>

          {/* 爭點整理對照表 (司法院與 Karoshibox 標準格式) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2 border-[var(--color-status-warning)]/30">
              <div>
                <h3 className="font-bold text-base text-[var(--color-text-primary)] flex items-center gap-2">
                  <span>📊 【司法院標準 爭點整理對照表】</span>
                  <span className="text-3xs bg-amber-100 text-[var(--color-status-warning)] border border-amber-300 px-2 py-0.5 rounded font-mono">
                    已建立 {issues.length} 項爭點
                  </span>
                </h3>
                <p className="text-3xs text-[var(--color-text-muted)] mt-0.5">包含爭點類別、原審認定、我方指摘不服理由、對應證物編號與引用實務法條。</p>
              </div>

              <button
                onClick={() => setIssues([...issues, {
                  id: Date.now().toString(),
                  issueType: '事實認定瑕疵',
                  title: `爭點${issues.length + 1}`,
                  originalHolding: '',
                  appealArgument: '',
                  relatedEvidenceCodes: `聲調${issues.length + 1}`,
                  legalBasis: '',
                  legalStrength: 'HIGH'
                }])}
                className="bg-[var(--color-brand-primary)] text-white px-3 py-1.5 rounded text-xs font-bold hover:opacity-90 flex items-center gap-1 shadow-2xs"
              >
                ＋ 新增爭點欄位
              </button>
            </div>

            <div className="space-y-4">
              {issues.map((issue, idx) => (
                <div key={issue.id} className="p-4 border border-[var(--color-border-strong)] rounded-xl bg-[var(--color-surface-overlay)] relative space-y-3 shadow-2xs">
                  <div className="flex justify-between items-center bg-[var(--color-surface-raised)] p-2 rounded-lg border border-[var(--color-border-subtle)]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold bg-amber-600 text-white px-2 py-0.5 rounded font-mono">
                        爭點 No. {idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            const newVal = issue.legalStrength === 'NEED_SUPPLEMENT' ? 'HIGH' : 'NEED_SUPPLEMENT';
                            setIssues(issues.map(i => i.id === issue.id ? { ...i, legalStrength: newVal } : i));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-2xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                            issue.legalStrength === 'NEED_SUPPLEMENT'
                              ? 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning)] border-amber-300 hover:bg-amber-100'
                              : 'bg-[var(--color-status-success-bg)] text-[var(--color-status-success)] border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          {issue.legalStrength === 'NEED_SUPPLEMENT' ? '⚠️ 需補充補強證據' : '🎯 重點攻擊爭點'}
                          <span className="text-3xs font-normal opacity-75">（點擊切換）</span>
                        </button>
                      </div>

                      <button
                        onClick={() => setIssues(issues.filter(i => i.id !== issue.id))}
                        className="text-red-500 hover:text-red-700 text-xs font-bold border border-[var(--color-status-danger)]/30 px-2 py-1 rounded bg-[var(--color-status-danger-bg)]"
                      >
                        ✖ 刪除
                      </button>
                    </div>
                  </div>

                  {/* 爭點標題與對應證據/法條 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-[var(--color-text-secondary)] font-bold">爭點主題與名稱：</label>
                      <input
                        type="text"
                        value={issue.title}
                        onChange={e => setIssues(issues.map(i => i.id === issue.id ? { ...i, title: e.target.value } : i))}
                        className="w-full border font-bold rounded p-2 text-xs bg-[var(--color-surface-overlay)]"
                        placeholder="例如：原決定補償金額每日折算標準過低，未審酌違法失職情節"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[var(--color-text-secondary)] font-bold">對應證據編號 & 引用法條：</label>
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="text"
                          value={issue.relatedEvidenceCodes || ''}
                          onChange={e => setIssues(issues.map(i => i.id === issue.id ? { ...i, relatedEvidenceCodes: e.target.value } : i))}
                          className="border rounded p-1.5 text-xs"
                          placeholder="證物編號(聲調一)"
                        />
                        <input
                          type="text"
                          value={issue.legalBasis || ''}
                          onChange={e => setIssues(issues.map(i => i.id === issue.id ? { ...i, legalBasis: e.target.value } : i))}
                          className="border rounded p-1.5 text-xs"
                          placeholder="法條/判解依據"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 原審認定 vs 我方攻防理由 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="block text-[var(--color-text-secondary)] font-bold flex items-center gap-1">
                        <span>🏛️ 原審判決/原決定認定內容與理由：</span>
                      </label>
                      <textarea
                        value={issue.originalHolding}
                        onChange={e => setIssues(issues.map(i => i.id === issue.id ? { ...i, originalHolding: e.target.value } : i))}
                        rows={5}
                        className="w-full border rounded-lg p-2 text-xs bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]"
                        placeholder="填寫原審認定理由摘要..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[var(--color-status-info)] font-bold flex items-center gap-1">
                        <span>⚔️ 我方上訴/覆審指摘不服理由（事實不憑證據、違背經驗法則）：</span>
                      </label>
                      <textarea
                        value={issue.appealArgument}
                        onChange={e => setIssues(issues.map(i => i.id === issue.id ? { ...i, appealArgument: e.target.value } : i))}
                        rows={5}
                        className="w-full border border-[var(--color-status-info)]/30 rounded-lg p-2 text-xs bg-[var(--color-status-info-bg)]/60 text-[var(--color-status-info)] font-medium"
                        placeholder="詳細填寫指摘原審瑕疵之攻擊攻防主張..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ⚖️ 權威實務見解檢索與挑選 (第二步) */}
          <div className="space-y-4 pt-4 border-t border-[var(--color-border-subtle)]">
            <div className="flex justify-between items-start border-b border-[var(--color-border-subtle)] pb-2">
              <div>
                <h3 className="font-bold text-base text-[var(--color-text-primary)] flex items-center gap-2">
                  <span>⚖️ 權威實務見解檢索與挑選（憲法法庭/最高法院/大法庭/高等法院座談會/主管機關函釋）</span>
                  <span className="text-2xs bg-blue-600 text-white font-normal px-2.5 py-0.5 rounded shadow-2xs">
                    ✨ 已啟用 Google Search 智慧實戰連網
                  </span>
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">廣泛涵蓋憲法法庭判決、最高法院/最高行政法院裁判、大法庭裁定、高等法院座談會決議及主管機關權威函釋，打破僅鎖定最高法院的單一限制。</p>
              </div>
            </div>

            <div className="bg-[var(--color-status-warning-bg)]/80 border border-[var(--color-status-warning)]/30 rounded-lg p-3.5 text-xs text-[var(--color-status-warning)] space-y-2">
              <div className="font-bold flex items-center justify-between text-[var(--color-status-warning)]">
                <span className="flex items-center gap-1.5">
                  🏛️ 訴訟攻防靈魂：「爭點瑕疵 × 客觀證據 × 權威實務見解」三位一體扣合矩陣
                </span>
                <span className="text-2xs bg-amber-200 text-[var(--color-status-warning)] px-2 py-0.5 rounded font-mono font-bold">極大化勝訴機率黃金公式</span>
              </div>
              <p className="leading-relaxed text-[var(--color-text-secondary)]">
                <b>上訴理由的強大說服力</b>來自於將<b>【原審判決爭點瑕疵】</b>+<b>【我方提出之客觀證據】</b>+<b>【權威實務見解（含憲法法庭/最高法院/大法庭/高等法院座談會/主管機關函釋）】</b>三者密不可分地扣合在一起！光有爭點是主張，有了權威見解作為法律背書與證據作為事實支撐，才能構成法院無法忽視的上訴理由。
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                className="flex-grow border border-[var(--color-border-subtle)] rounded-lg p-2.5 text-xs font-bold bg-[var(--color-surface-overlay)]"
                placeholder="輸入搜尋關鍵字 (例如：舉證責任 經驗法則 事實認定不憑證據)"
              />
              <button
                onClick={handleSearchPrecedents}
                disabled={isSearchingPrecedents}
                className="bg-[var(--color-brand-primary)] text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSearchingPrecedents ? '🔍 聯網檢索中...' : '🔍 聯網檢索實務見解'}
              </button>
            </div>

            {/* 判解函釋清單 */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-sm text-[var(--color-text-primary)] flex items-center gap-2">
                  <span>請勾選與編修欲引用至上訴書狀之權威見解：</span>
                  <span className="text-2xs bg-blue-100 text-[var(--color-status-info)] border border-[var(--color-status-info)]/30 px-2 py-0.5 rounded font-mono font-bold">
                    已選 {precedents.filter(p => p.selected).length} / {precedents.length} 筆
                  </span>
                </h3>

                <button
                  onClick={() => setPrecedents([
                    ...precedents,
                    {
                      id: `p_manual_${Date.now()}`,
                      type: '最高法院裁判',
                      citation: '最高法院 110 年度台上字第  號民事判決',
                      summary: '填寫該裁判或函釋之核心要旨...',
                      applicationReason: '填寫本案如何據以論駁原審判決...',
                      selected: true
                    }
                  ])}
                  className="bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold hover:opacity-90 flex items-center gap-1 shadow-2xs"
                >
                  ＋ 手動新增實務見解
                </button>
              </div>

              {precedents.map((item, idx) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${item.selected ? 'border-[var(--color-brand-primary)] bg-[var(--color-status-info-bg)]/30 shadow-2xs' : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]/50 opacity-75'}`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-subtle)]/80 pb-2">
                    <div className="flex items-center gap-2 flex-grow">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => setPrecedents(precedents.map(p => p.id === item.id ? { ...p, selected: !p.selected } : p))}
                          className="w-4 h-4 accent-[var(--color-brand-primary)]"
                        />
                        <span className="font-bold text-xs text-[var(--color-text-secondary)]">【引用第 {idx + 1} 筆】</span>
                      </label>

                      <input
                        type="text"
                        value={item.citation}
                        onChange={e => setPrecedents(precedents.map(p => p.id === item.id ? { ...p, citation: e.target.value } : p))}
                        className="font-extrabold text-sm text-[var(--color-text-primary)] border border-[var(--color-border-strong)] rounded px-2 py-1 flex-grow bg-[var(--color-surface-overlay)]"
                        placeholder="裁判或函釋字號（例如：最高法院 108 年度台上大字第 1884 號民事裁定）"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.type}
                        onChange={e => setPrecedents(precedents.map(p => p.id === item.id ? { ...p, type: e.target.value } : p))}
                        className="text-2xs font-bold bg-amber-100 text-[var(--color-status-warning)] border border-amber-300 rounded px-2 py-1 w-28 text-center"
                        placeholder="類型"
                      />

                      <button
                        onClick={() => setPrecedents(precedents.filter(p => p.id !== item.id))}
                        className="text-red-500 hover:text-red-700 text-2xs font-bold border border-[var(--color-status-danger)]/30 px-2 py-1 rounded bg-[var(--color-status-danger-bg)]"
                      >
                        ✖ 刪除
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-[var(--color-text-secondary)] font-bold mb-1">【要旨/核心見解】：</label>
                      <textarea
                        value={item.summary}
                        onChange={e => setPrecedents(precedents.map(p => p.id === item.id ? { ...p, summary: e.target.value } : p))}
                        rows={5}
                        className="w-full p-2 bg-[var(--color-surface-overlay)] rounded border border-[var(--color-border-strong)] text-[var(--color-text-primary)] leading-relaxed font-serif text-xs"
                        placeholder="請填寫或編輯裁判要旨..."
                      />
                    </div>

                    <div>
                      <label className="block text-[var(--color-brand-primary)] font-bold mb-1">💡 本案上訴運用理由：</label>
                      <textarea
                        value={item.applicationReason}
                        onChange={e => setPrecedents(precedents.map(p => p.id === item.id ? { ...p, applicationReason: e.target.value } : p))}
                        rows={5}
                        className="w-full p-2 bg-[var(--color-surface-overlay)] rounded border border-[var(--color-status-info)]/30 text-[var(--color-status-info)] font-medium text-xs"
                        placeholder="說明如何據以補強上訴理由..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-[var(--color-border-subtle)]">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 border rounded-lg text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)]"
            >
              ⯇ 上一步
            </button>

            <button
              onClick={() => setCurrentStep(3)}
              className="bg-[var(--color-brand-primary)] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 flex items-center gap-1.5 shadow-xs"
            >
              <span>下一步：提供與整理調查證據</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      )}

      
    </>
  );
}
