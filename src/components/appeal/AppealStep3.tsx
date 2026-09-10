import React from 'react';
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { AntiGhostBadge } from "../AntiGhostBadge";
import { LegalSourcesDisplay } from "../LegalSourcesDisplay";

export function AppealStep3({ ctx }: { ctx: any }) {
  const {
    currentStep,
    setCurrentStep,
    attachmentText,
    setAttachmentText,
    tableCourtName,
    setTableCourtName,
    tableYear,
    setTableYear,
    tableWord,
    setTableWord,
    tableNo,
    setTableNo,
    tableSubmitter,
    setTableSubmitter,
    tableSubmitDate,
    setTableSubmitDate,
    evidences,
    setEvidences,
    isGeneratingPetition,
    handleGeneratePetition
  } = ctx;

  return (
    <>
      {/* 步驟 3: 提供與整理調查證據 */}
      {currentStep === 3 && (
        <div className="bg-[var(--color-surface-overlay)] p-6 rounded-xl shadow-xs border border-[var(--color-border-subtle)] space-y-6">
          <div className="border-b border-[var(--color-border-subtle)] pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">第三步：提供與整理調查證據 (調查證據聲請表)</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">編修欲向法院聲請調查之證據標的、調查事項、調查對象與待證事實（控制在50字內），並連結對應之案件爭點，作為上訴狀之附表。</p>
            </div>
          </div>

          {/* 案件基本資料 (附表與附件專用標頭設定) */}
          <div className="bg-[var(--color-status-success-bg)]/80 border border-emerald-300 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center border-b border-[var(--color-status-success)]/30 pb-2">
              <h3 className="font-bold text-sm text-[var(--color-status-success)] flex items-center gap-2">
                <span>📌 案件基本資料（司法院標準附表標頭）</span>
              </h3>
              <span className="text-3xs text-emerald-700 font-mono">連動下方附件表格與匯出 PDF 標頭</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-[var(--color-text-secondary)] mb-1">附件文字</label>
                <input
                  type="text"
                  value={attachmentText}
                  onChange={e => setAttachmentText(e.target.value)}
                  className="w-full border rounded p-1.5 bg-[var(--color-surface-overlay)] font-bold text-[var(--color-status-success)] border-emerald-300"
                  placeholder="附件 或 附表二"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--color-text-secondary)] mb-1">法院名稱</label>
                <input
                  type="text"
                  value={tableCourtName}
                  onChange={e => setTableCourtName(e.target.value)}
                  className="w-full border rounded p-1.5 bg-[var(--color-surface-overlay)]"
                  placeholder="臺灣高等法院"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--color-text-secondary)] mb-1">年度與字別</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={tableYear}
                    onChange={e => setTableYear(e.target.value)}
                    className="w-1/2 border rounded p-1.5 bg-[var(--color-surface-overlay)] text-center font-mono"
                    placeholder="112"
                  />
                  <input
                    type="text"
                    value={tableWord}
                    onChange={e => setTableWord(e.target.value)}
                    className="w-1/2 border rounded p-1.5 bg-[var(--color-surface-overlay)] text-center"
                    placeholder="重上"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[var(--color-text-secondary)] mb-1">案號</label>
                <input
                  type="text"
                  value={tableNo}
                  onChange={e => setTableNo(e.target.value)}
                  className="w-full border rounded p-1.5 bg-[var(--color-surface-overlay)] font-mono"
                  placeholder="123"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="block font-bold text-[var(--color-text-secondary)] mb-1">提出人（簽章）</label>
                <input
                  type="text"
                  value={tableSubmitter}
                  onChange={e => setTableSubmitter(e.target.value)}
                  className="w-full border rounded p-1.5 bg-[var(--color-surface-overlay)]"
                  placeholder="例：上訴人 王小明"
                />
              </div>

              <div>
                <label className="block font-bold text-[var(--color-text-secondary)] mb-1">提出日期</label>
                <input
                  type="text"
                  value={tableSubmitDate}
                  onChange={e => setTableSubmitDate(e.target.value)}
                  className="w-full border rounded p-1.5 bg-[var(--color-surface-overlay)]"
                  placeholder="例：112年12月25日"
                />
              </div>
            </div>
          </div>

          {/* 調查證據聲請表 (司法院 6 欄位標準格式) */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center border-b pb-2 border-emerald-300">
              <div>
                <h3 className="font-bold text-base text-[var(--color-text-primary)] flex items-center gap-2">
                  <span>🛠️ 調查證據列表（司法院標準格式）</span>
                  <span className="text-3xs bg-emerald-100 text-[var(--color-status-success)] border border-emerald-300 px-2 py-0.5 rounded font-mono">
                    共 {evidences.length} 列
                  </span>
                </h3>
                <p className="text-3xs text-[var(--color-text-muted)] mt-0.5">每列精準包含：編號、所涉爭點、調查事項、調查對象、對象地址及聯絡方式、待證事實 (限50字)。</p>
              </div>

              <button
                onClick={() => setEvidences([...evidences, {
                  id: Date.now().toString(),
                  code: String(evidences.length + 1),
                  relatedIssue: `爭點${evidences.length + 1}：`,
                  investigationItem: '訊問證人',
                  investigationTarget: '',
                  targetAddress: '',
                  provenFact: ''
                }])}
                className="bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-bold hover:opacity-90 flex items-center gap-1 shadow-2xs"
              >
                ＋ 增加一列
              </button>
            </div>

            <div className="space-y-4">
              {evidences.map((item, idx) => (
                <div key={item.id} className="p-4 border border-emerald-300 rounded-xl bg-[var(--color-status-success-bg)]/20 relative space-y-3 shadow-2xs">
                  <div className="flex justify-between items-center bg-[var(--color-surface-overlay)] p-2 rounded-lg border border-[var(--color-status-success)]/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-status-success)]">編號 {idx + 1}：</span>
                      <input
                        type="text"
                        value={item.code || String(idx + 1)}
                        onChange={e => setEvidences(evidences.map(ev => ev.id === item.id ? { ...ev, code: e.target.value } : ev))}
                        className="w-20 border font-bold text-center rounded py-1 text-xs bg-[var(--color-status-success-bg)] text-[var(--color-status-success)] border-emerald-300"
                        placeholder="編號"
                      />
                    </div>

                    <button
                      onClick={() => setEvidences(evidences.filter(ev => ev.id !== item.id))}
                      className="text-red-500 hover:text-red-700 text-xs font-bold border border-[var(--color-status-danger)]/30 px-2 py-0.5 rounded bg-[var(--color-status-danger-bg)]"
                    >
                      ✖ 刪除此列
                    </button>
                  </div>

                  {/* 所涉爭點 */}
                  <div className="space-y-1 text-xs">
                    <label className="block text-[var(--color-text-secondary)] font-bold">所涉爭點：</label>
                    <textarea
                      value={item.relatedIssue || item.relatedIssueTitle || ''}
                      onChange={e => setEvidences(evidences.map(ev => ev.id === item.id ? { ...ev, relatedIssue: e.target.value } : ev))}
                      rows={5}
                      className="w-full border rounded p-1.5 text-xs bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] font-medium"
                      placeholder="填寫本項證據所涉之案件爭點..."
                    />
                  </div>

                  {/* 調查事項與調查對象 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <label className="block text-[var(--color-text-secondary)] font-bold">調查事項：</label>
                      <input
                        type="text"
                        value={item.investigationItem || item.method || ''}
                        onChange={e => setEvidences(evidences.map(ev => ev.id === item.id ? { ...ev, investigationItem: e.target.value } : ev))}
                        className="w-full border rounded p-1.5 text-xs bg-[var(--color-surface-overlay)] font-bold"
                        placeholder="例：訊問證人 / 現場履勘 / 函調資料"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[var(--color-text-secondary)] font-bold">調查對象：</label>
                      <input
                        type="text"
                        value={item.investigationTarget || item.target || ''}
                        onChange={e => setEvidences(evidences.map(ev => ev.id === item.id ? { ...ev, investigationTarget: e.target.value } : ev))}
                        className="w-full border rounded p-1.5 text-xs bg-[var(--color-surface-overlay)] font-bold text-[var(--color-text-primary)]"
                        placeholder="姓名或單位（例：證人 王小明 / 警察局）"
                      />
                    </div>
                  </div>

                  {/* 對象地址及聯絡方式 */}
                  <div className="space-y-1 text-xs">
                    <label className="block text-[var(--color-text-secondary)] font-bold">對象地址及聯絡方式：</label>
                    <textarea
                      value={item.targetAddress || item.holder || ''}
                      onChange={e => setEvidences(evidences.map(ev => ev.id === item.id ? { ...ev, targetAddress: e.target.value } : ev))}
                      rows={5}
                      className="w-full border rounded p-1.5 text-xs bg-[var(--color-surface-overlay)]"
                      placeholder="填寫對象住址、聯絡電話或卷內頁碼..."
                    />
                  </div>

                  {/* 待證事實(限50字) */}
                  <div className="space-y-1 text-xs relative">
                    <div className="flex justify-between items-center">
                      <label className="block text-[var(--color-text-secondary)] font-bold">待證事實（限50字）：</label>
                      <span className={`text-3xs font-mono font-bold ${(item.provenFact || '').length > 50 ? 'text-red-600' : 'text-[var(--color-text-muted)]'}`}>
                        限制 {(item.provenFact || '').length}/50字
                      </span>
                    </div>
                    <textarea
                      value={item.provenFact || ''}
                      onChange={e => setEvidences(evidences.map(ev => ev.id === item.id ? { ...ev, provenFact: e.target.value } : ev))}
                      rows={5}
                      maxLength={100}
                      className={`w-full border rounded p-1.5 text-xs bg-[var(--color-surface-overlay)] ${(item.provenFact || '').length > 50 ? 'border-red-400 bg-[var(--color-status-danger-bg)]/30' : ''}`}
                      placeholder="說明待證事實，建請控制在 50 字內..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-[var(--color-border-subtle)]">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 border rounded-lg text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)]"
            >
              ⯇ 上一步
            </button>

            <button
              onClick={handleGeneratePetition}
              disabled={isGeneratingPetition}
              className="bg-[var(--color-brand-primary)] text-white px-6 py-3 rounded-lg font-bold text-sm hover:opacity-90 flex items-center gap-2 shadow-xs"
            >
              {isGeneratingPetition ? '✍️ 正在結合爭點、判例與證據生成上訴書...' : '✍️ 結合爭點、判例與證據產生上訴書 ➔'}
            </button>
          </div>
        </div>
      )}

      
    </>
  );
}
