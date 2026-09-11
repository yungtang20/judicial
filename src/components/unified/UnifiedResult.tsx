import React from 'react';
import { AlertTriangle, Check, Copy, ExternalLink, FileCheck2, Printer } from 'lucide-react';
import type { LegalWorkflowState } from '../../lib/workflow/unifiedStateGraph';
import { formatLegalChapter } from '../../lib/legalChapterLabels';
import { VERIFIED_REAL_STATUTES } from '../../lib/citationVerifier';

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

const normalizeCitation = (value: string) => value.replace(/[\s　、，。,.;；：:（）()]/g, '').replace(/臺/g, '台');
const citationsMatch = (left: string, right: string) => {
  const normalizedLeft = normalizeCitation(left);
  const normalizedRight = normalizeCitation(right);
  return normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
};

export function formatStatuteCitation(citation: string, preferred: string[] = []): string {
  if (/[（(].+[）)]/.test(citation)) return citation;
  const namedCitation = preferred.find(candidate => /[（(].+[）)]/.test(candidate) && citationsMatch(candidate, citation));
  if (namedCitation) return namedCitation;
  const statute = Object.entries(VERIFIED_REAL_STATUTES)
    .filter(([key]) => citationsMatch(key, citation))
    .sort(([left], [right]) => normalizeCitation(right).length - normalizeCitation(left).length)[0]?.[1];
  return statute?.keywords[0] ? `${citation}（${statute.keywords[0]}）` : citation;
}

export function countMatchingPrecedents(state: LegalWorkflowState, citation: string): number {
  const target = normalizeCitation(citation);
  const externallyVerified = new Set(
    (state.verification?.externalCitations || [])
      .filter(item => item.status === 'verified' && item.exactMatch)
      .map(item => item.citation)
  );
  return state.rag?.precedents?.filter(precedent =>
    externallyVerified.has(precedent.caseNumber) &&
    (precedent.citedStatutes || []).some(item => normalizeCitation(item) === target) ||
    externallyVerified.has(precedent.caseNumber) && normalizeCitation(precedent.summary).includes(target)
  ).length || 0;
}

export const UnifiedResult: React.FC<UnifiedResultProps> = ({
  workflowState, isCopied, handleCopyAnalysis, exportAsHtml, exportAsText, printReport,
}) => {
  const { router, rag, syllogism, verification } = workflowState;
  if (!syllogism) return null;

  const canUseResult = canUseWorkflowResult(workflowState);
  const status = workflowState.error ? 'FAIL' : verification?.verificationStatus || 'NEEDS_REVIEW';
  const officialEvidence = verification?.officialEvidence || [];
  const hasJudicialSupport = officialEvidence.some(item => item.type === 'STATUTE' && countMatchingPrecedents(workflowState, item.citation) > 0);
  const useLabel = canUseResult
    ? '可以使用｜已完成來源查驗'
    : status === 'FAIL'
      ? '不可使用｜引用內容或來源有疑義'
      : hasJudicialSupport
        ? '已有部分司法依據｜法條與官方裁判已交叉比對'
        : '僅供參考｜尚未確認適用於您的案件';
  const title = workflowState.error ? '分析失敗' : canUseResult ? '分析結論' : status === 'FAIL' ? '分析草稿（檢核未通過）' : '初步分析（待查驗）';
  const problemResults = verification?.results?.filter(item => !item.verified || item.isGhostOrFake) || [];
  const warningNotice = verification?.warningNotice?.includes('fail-closed')
    ? '部分引用尚未經官方資料庫確認，因此目前只能參考，不能直接用於書狀或法律主張。'
    : verification?.warningNotice;
  const statuteEvidence = officialEvidence.filter(item => item.type === 'STATUTE');
  const verifiedPrecedents = (rag?.precedents || []).filter(precedent =>
    verification?.externalCitations?.some(item => item.citation === precedent.caseNumber && item.status === 'verified' && item.exactMatch)
  );
  const evidenceTips = workflowState.safety?.preservationTips?.slice(0, 4) || [
    '保留可證明事件時間、地點及關係人的原始資料。',
    '備份通訊、錄音、照片、影片或監視器原始檔。',
    '整理契約、金流、醫療、報案或其他第三方紀錄。',
  ];
  const actionTips = workflowState.safety
    ? [
        ...workflowState.safety.immediateSteps.slice(0, 3),
        ...workflowState.safety.emergencyHotlines.slice(0, 3).map(item => `${item.label}：${item.number}（${item.desc}）`),
      ]
    : [
        '先保存上述證據原始檔，不要只留截圖。',
        '依官方法條及裁判內容核對適用要件。',
        '涉及期限或重大權益時，儘速向律師或法律扶助確認。',
      ];

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
          {hasJudicialSupport && !canUseResult ? (
            <p className="mt-3 text-xs leading-5 text-amber-200/90">已找到引用相同法條的官方裁判，參考可信度較高；是否能直接使用，仍須比對裁判事實與您的案情。</p>
          ) : warningNotice && !canUseResult && (
            <p className="mt-3 text-xs leading-5 text-amber-200/90">{warningNotice}</p>
          )}
          {!canUseResult && !workflowState.error && (
            <p className="mt-2 text-xs leading-5 text-slate-300">目前不能直接拿來主張權利或製作文書；請先核對適用要件，或交由專業人士確認。</p>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-bold text-white">對應案件事實</h2>
          <p className="text-xs leading-6 text-slate-300">{syllogism.minorPremise}</p>
          <p className="text-xs leading-6 text-[var(--color-text-secondary)]">判斷方向：{syllogism.subsumption}</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white">可能涉及的法條與名稱</h2>
          {statuteEvidence.length > 0 ? statuteEvidence.map((item, index) => {
            const isValidSource = ['VALID', 'VERIFIED', 'AUTHORITATIVE'].includes(item.status);
            const supportsClaim = isValidSource && item.claimSupportStatus === 'SUPPORTED';
            const matchingPrecedents = item.type === 'STATUTE' ? countMatchingPrecedents(workflowState, item.citation) : 0;
            const displayCitation = formatStatuteCitation(item.citation, [...(router?.legalBasis || []), ...(rag?.statuteCitations || [])]);
            return (
              <div key={`${item.type}-${item.citation}-${index}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-t border-slate-800 text-xs">
                <div>
                  <span className="font-semibold text-slate-200">{displayCitation}</span>
                  <span className={`ml-2 ${supportsClaim ? 'text-emerald-400' : isValidSource ? 'text-amber-300' : 'text-rose-300'}`}>
                    {supportsClaim
                      ? '可以使用｜已確認支持目前結論'
                      : isValidSource && matchingPrecedents > 0
                        ? `參考可信度較高｜${matchingPrecedents} 件官方裁判引用同一法條`
                        : isValidSource
                          ? '僅供參考｜尚未找到同法條的相關裁判'
                          : '不可使用｜來源或引用有疑義'}
                  </span>
                </div>
                {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-400 hover:underline">{item.source}<ExternalLink className="w-3 h-3" /></a>}
              </div>
            );
          }) : (rag?.statuteCitations || []).map(citation => (
            <div key={citation} className="py-2 border-t border-slate-800 text-xs text-slate-300">{citation}<span className="ml-2 text-amber-300">尚待官方來源查驗</span></div>
          ))}
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-bold text-white">需備證據</h2>
          <ul className="space-y-1 text-xs leading-6 text-slate-300">
            {evidenceTips.map(tip => <li key={tip}>• {tip}</li>)}
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-bold text-white">行動指引</h2>
          <ul className="space-y-1 text-xs leading-6 text-slate-300">
            {actionTips.map(tip => <li key={tip}>• {tip}</li>)}
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-bold text-white">相關判例</h2>
          {verifiedPrecedents.length > 0 ? verifiedPrecedents.map((precedent, index) => {
              const citedStatutes = precedent.citedStatutes?.length
                ? precedent.citedStatutes
                : (rag.statuteCitations || []).filter(citation => normalizeCitation(precedent.summary).includes(normalizeCitation(citation)));
              return (
                <div key={`${precedent.caseNumber}-${index}`} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 py-2 border-t border-slate-800 text-xs text-slate-300">
                  <div>
                    <div className="font-semibold text-slate-200">{precedent.caseNumber}</div>
                    <div className="mt-1 text-[var(--color-text-muted)]">{precedent.courtName}{citedStatutes.length ? ` · 同案引用：${citedStatutes.join('、')}` : ' · 尚未比對出相同法條'} · 外部文件檢核通過</div>
                  </div>
                  {precedent.sourceUrl && <a href={precedent.sourceUrl} target="_blank" rel="noreferrer" className="shrink-0 text-sky-400 hover:underline">官方來源</a>}
                </div>
              );
            }) : <p className="text-xs leading-6 text-slate-400">目前沒有通過外部法律文件檢核的相關判例。</p>}
        </div>

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
