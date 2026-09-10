import React from 'react';
import { AlertTriangle, Check, Copy, ExternalLink, FileCheck2, Printer } from 'lucide-react';
import type { LegalWorkflowState } from '../../lib/workflow/unifiedStateGraph';
import { formatLegalChapter } from '../../lib/legalChapterLabels';

interface UnifiedResultProps {
  workflowState: LegalWorkflowState;
  isCopied: boolean;
  handleCopyAnalysis: () => void;
  exportAsHtml: (state: LegalWorkflowState) => void;
  exportAsText: (state: LegalWorkflowState) => void;
  printReport: (state: LegalWorkflowState) => void;
}

export function canUseWorkflowResult(state: LegalWorkflowState): boolean {
  return !state.error && state.router?.is_complete === true &&
    state.verification?.passGate === true && state.verification.verificationStatus === 'PASS';
}

export const UnifiedResult: React.FC<UnifiedResultProps> = ({
  workflowState, isCopied, handleCopyAnalysis, exportAsHtml, exportAsText, printReport,
}) => {
  const { router, rag, syllogism, verification } = workflowState;
  if (!syllogism) return null;

  const canUseResult = canUseWorkflowResult(workflowState);
  const status = workflowState.error ? 'FAIL' : verification?.verificationStatus || 'NEEDS_REVIEW';
  const useLabel = canUseResult
    ? '可以使用｜已完成來源查驗'
    : status === 'FAIL'
      ? '不可使用｜引用內容或來源有疑義'
      : '僅供參考｜尚未確認適用於您的案件';
  const title = workflowState.error ? '分析失敗' : canUseResult ? '分析結論' : status === 'FAIL' ? '分析草稿（檢核未通過）' : '初步分析（待查驗）';
  const problemResults = verification?.results?.filter(item => !item.verified || item.isGhostOrFake) || [];
  const warningNotice = verification?.warningNotice?.includes('fail-closed')
    ? '部分引用尚未經官方資料庫確認，因此目前只能參考，不能直接用於書狀或法律主張。'
    : verification?.warningNotice;
  const officialEvidence = verification?.officialEvidence || [];
  const verifiedKeys = new Set(officialEvidence.map(item => `${item.type}:${item.citation.replace(/\s/g, '')}`));
  const references = [
    ...(rag?.statuteCitations || []).map(citation => ({ key: `STATUTE:${citation.replace(/\s/g, '')}`, citation, label: '法規' })),
    ...(rag?.precedents || []).map(item => ({ key: `PRECEDENT:${item.caseNumber.replace(/\s/g, '')}`, citation: item.caseNumber, label: item.courtName, sourceUrl: item.sourceUrl })),
  ].filter(item => !verifiedKeys.has(item.key));

  const actionClass = 'px-3 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <section aria-labelledby="analysis-result-title" className="rounded-xl border border-slate-800 bg-[#0e1424] overflow-hidden">
      <div className={`px-5 py-3 flex items-center gap-2 text-xs font-semibold ${canUseResult ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-200'}`} role="status">
        {canUseResult ? <FileCheck2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        <span>{useLabel}</span>
      </div>

      <div className="p-5 md:p-6 space-y-6">
        {problemResults.length > 0 && (
          <div className="space-y-2" aria-label="異常引用">
            <h2 className="text-sm font-bold text-rose-300">需先修正的引用</h2>
            {problemResults.map((item, index) => (
              <div key={`${item.citationText}-${index}`} className="text-xs text-rose-200">
                {item.citationText}：{item.correctionSuggestion || '此引用尚未通過查驗'}
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs text-violet-300">{router?.domain || '未分類'}</span>
            <span className="text-[var(--color-text-muted)]">·</span>
            <span className="text-xs text-[var(--color-text-secondary)]">{router?.cause || formatLegalChapter(router?.chapter)}</span>
          </div>
          <h1 id="analysis-result-title" className="text-base font-bold text-white mb-2">{title}</h1>
          <p className="text-sm md:text-base leading-7 text-slate-200 whitespace-pre-wrap">{syllogism.conclusion}</p>
          {warningNotice && !canUseResult && (
            <p className="mt-3 text-xs leading-5 text-amber-200/90">{warningNotice}</p>
          )}
          {!canUseResult && !workflowState.error && (
            <p className="mt-2 text-xs leading-5 text-slate-300">目前不能直接拿來主張權利或製作文書；請先核對適用要件，或交由專業人士確認。</p>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white">這些資料目前能怎麼用</h2>
          {officialEvidence.length > 0 ? officialEvidence.map((item, index) => {
            const supportsClaim = item.status === 'VALID' && item.claimSupportStatus === 'SUPPORTED';
            const isValidSource = ['VALID', 'VERIFIED', 'AUTHORITATIVE'].includes(item.status);
            return (
              <div key={`${item.type}-${item.citation}-${index}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-t border-slate-800 text-xs">
                <div>
                  <span className="font-semibold text-slate-200">{item.citation}</span>
                  <span className={`ml-2 ${supportsClaim ? 'text-emerald-400' : isValidSource ? 'text-amber-300' : 'text-rose-300'}`}>
                    {supportsClaim ? '可以使用｜已確認支持目前結論' : isValidSource ? '僅供參考｜尚未確認適用於您的案件' : '不可使用｜來源或引用有疑義'}
                  </span>
                </div>
                {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-400 hover:underline">{item.source}<ExternalLink className="w-3 h-3" /></a>}
              </div>
            );
          }) : <p className="text-xs text-amber-200">目前沒有可直接支持本結論的官方證據，請從下方延伸參考繼續查找。</p>}
        </div>

        {references.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-white">延伸參考與查找方向</h2>
            {references.map((item, index) => (
              <div key={`${item.key}-${index}`} className="flex items-center justify-between gap-3 text-xs text-slate-300">
                <span>{item.citation} <span className="text-[var(--color-text-muted)]">· {item.label} · 尚未列為結論證據</span></span>
                {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">官方來源</a>}
              </div>
            ))}
          </div>
        )}

        <details className="border-t border-slate-800 pt-4 group">
          <summary className="cursor-pointer text-sm font-semibold text-slate-300 hover:text-white">深入了解分析依據</summary>
          <div className="pt-4 space-y-4 text-xs leading-6 text-[var(--color-text-secondary)]">
            <div><span className="block font-semibold text-slate-200">法律規則</span>{syllogism.majorPremise}</div>
            <div><span className="block font-semibold text-slate-200">案件事實</span>{syllogism.minorPremise}</div>
            <div><span className="block font-semibold text-slate-200">要件比對</span>{syllogism.subsumption}</div>
            <div><span className="block font-semibold text-slate-200">完整分析</span><span className="whitespace-pre-wrap">{syllogism.fullAnalysis}</span></div>
            <div><span className="block font-semibold text-slate-200">查驗摘要</span>檢核 {verification?.totalChecked || 0} 處，異常 {verification?.ghostCount || 0} 處。</div>
          </div>
        </details>

        <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4" aria-label="分析結果操作">
          <button type="button" onClick={handleCopyAnalysis} disabled={!canUseResult} className={actionClass}>{isCopied ? <Check className="inline w-3.5 h-3.5 mr-1" /> : <Copy className="inline w-3.5 h-3.5 mr-1" />}{isCopied ? '已複製' : '複製'}</button>
          <button type="button" onClick={() => exportAsHtml(workflowState)} disabled={!canUseResult} className={actionClass}>HTML</button>
          <button type="button" onClick={() => exportAsText(workflowState)} disabled={!canUseResult} className={actionClass}>TXT</button>
          <button type="button" onClick={() => printReport(workflowState)} disabled={!canUseResult} className={actionClass}><Printer className="inline w-3.5 h-3.5 mr-1" />列印</button>
        </div>
      </div>
    </section>
  );
};
