import React, { useState } from 'react';
import { AlertTriangle, Calculator, Check, Copy, ExternalLink, FileCheck2, Printer } from 'lucide-react';
import type { LegalWorkflowState } from '../../lib/workflow/unifiedStateGraph';
import { formatLegalChapter } from '../../lib/legalChapterLabels';
import { VERIFIED_REAL_STATUTES } from '../../lib/citationVerifier';
import { assessInterpretationRelevance, normalizeStatuteCitation } from '../../lib/citationRelevance';
import { extractIncidentDate, toCalendarDate } from '../../lib/forensicGuidance';

interface UnifiedResultProps {
  workflowState: LegalWorkflowState;
  isCopied: boolean;
  handleCopyAnalysis: () => void;
  exportAsHtml: (state: LegalWorkflowState) => void;
  exportAsText: (state: LegalWorkflowState) => void;
  printReport: (state: LegalWorkflowState) => void;
  handleSelectTool?: (toolId: string, subTab?: string) => void;
}

/** 工作流中的官方法條證據條目。 */
type WorkflowStatuteEvidence = {
  citation: string;
  type: string;
  status: string;
  source: string;
  sourceUrl: string;
  checkedAt: string;
  snippet?: string;
  contentHash?: string;
  claimSupportStatus?: string;
  error?: string;
};

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

const findStatuteRecord = (citation: string) => Object.entries(VERIFIED_REAL_STATUTES)
  .filter(([key]) => citationsMatch(key, citation))
  .sort(([left], [right]) => normalizeCitation(right).length - normalizeCitation(left).length)[0]?.[1];

/**
 * 取出法條的精確識別鍵（含「之N」與項次）。
 * 過往用字串包含比對，會把「刑法第315條」誤配上「刑法第315條之1（妨害秘密罪）」的罪名，
 * 造成畫面上出現與實際查核條號不符的標示。
 */
export function statuteArticleKey(citation: string): string | null {
  const match = citation.replace(/[（(][^）)]*[）)]/g, '').match(/^(.+?法)第(\d+(?:之\d+)?)條(?:第(\d+)項)?/);
  if (!match) return null;
  return `${match[1]}第${match[2]}條${match[3] ? `第${match[3]}項` : ''}`;
}

export function formatStatuteCitation(citation: string, preferred: string[] = []): string {
  if (/[（(].+[）)]/.test(citation)) return citation;
  const key = statuteArticleKey(citation);
  const namedCitation = key
    ? preferred.find(candidate => statuteArticleKey(candidate) === key)
    : undefined;
  if (namedCitation) return namedCitation;
  const statute = findStatuteRecord(citation);
  return statute?.keywords[0] ? `${citation}（${statute.keywords[0]}）` : citation;
}

export function buildProcedureSteps(domain?: string): string[] {
  if (domain === '刑事') return ['報案或提出告訴，取得受理證明並持續補充證據', '警察詢問後移送地檢署，由檢察官偵查、訊問及調查證據', '檢察官決定起訴或不起訴；起訴後由刑事法院審理', '刑事起訴後可評估附帶民事求償；收到裁判後立即確認救濟期間'];
  if (domain === '行政') return ['先確認是否須經異議、復查或訴願程序', '於法定期間內提出行政救濟並保存送達證明', '進入行政訴訟後依通知提出書狀及證據', '收到裁判後確認上訴期間及後續執行方式'];
  if (domain === '家事') return ['向法院提出聲請或先進行家事調解', '依通知到庭，提出關係證明、事實及證據', '法院調查後成立調解或作成裁判', '取得執行名義後，視履行情形聲請履行勸告或強制執行'];
  return ['先行催告或評估調解；依法須強制調解者先完成調解程序', '向管轄法院提出起訴狀、證據並繳納裁判費', '法院送達後進行書狀交換、爭點整理、調查證據及言詞辯論', '收到判決後確認上訴期間；判決確定且對方不履行時可聲請強制執行'];
}

export function calculateLegalPeriodEstimates(basis: string, startDate: string): Array<{ period: string; deadline: string }> {
  const parts = startDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return [];
  const matches = Array.from(basis.matchAll(/(\d+)\s*(個月|月|年|日|天)/g));
  const periods = matches.filter(match => !/(?:無|不受)\s*$/.test(basis.slice(Math.max(0, match.index! - 3), match.index)));

  return periods.filter((match, index) => periods.findIndex(item => item[1] === match[1] && item[2] === match[2]) === index).map(match => {
    const amount = Number(match[1]);
    const unit = match[2];
    const start = new Date(parts[0], parts[1] - 1, parts[2], 12);
    const deadline = new Date(start);
    if (unit === '年' || unit === '月' || unit === '個月') {
      const targetMonth = start.getMonth() + (unit === '年' ? amount * 12 : amount);
      deadline.setDate(1);
      deadline.setMonth(targetMonth);
      const lastDay = new Date(deadline.getFullYear(), deadline.getMonth() + 1, 0).getDate();
      deadline.setDate(Math.min(start.getDate(), lastDay));
    } else {
      deadline.setDate(deadline.getDate() + amount);
    }
    return { period: `${amount}${unit}`, deadline: `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(deadline.getDate()).padStart(2, '0')}` };
  });
}

export function countMatchingPrecedents(state: LegalWorkflowState, citation: string): number {
  const target = normalizeCitation(citation);
  const externallyVerified = new Set(
    (state.verification?.externalCitations || [])
      .filter(item => item.status === 'verified' && item.exactMatch)
      .map(item => item.citation)
  );
  const officiallyVerified = new Set(
    (state.verification?.officialEvidence || [])
      .filter(item => item.type === 'PRECEDENT' && item.status === 'VERIFIED' && item.contentHash)
      .map(item => item.citation)
  );
  return state.rag?.precedents?.filter(precedent =>
    externallyVerified.has(precedent.caseNumber) && officiallyVerified.has(precedent.caseNumber) && (
      (precedent.citedStatutes || []).some(item => normalizeCitation(item) === target) ||
      normalizeCitation(precedent.summary).includes(target)
    )
  ).length || 0;
}

export const UnifiedResult: React.FC<UnifiedResultProps> = ({
  workflowState, isCopied, handleCopyAnalysis, exportAsHtml, exportAsText, printReport, handleSelectTool,
}) => {
  const { router, rag, syllogism, verification } = workflowState;
  // 法定期間起算日自動帶入事發日期，使用者可手動覆寫。
  /** 保護面板已呈現熱線，行動指引不得重複出現 113／110／1925。 */
  const HOTLINE_PATTERN = /(113|110|1925)|(婦幼保護專線|警察報案|安心專線)/;
  const DEFAULT_ACTION_TIPS = [
    '先保存上述證據原始檔，不要只留截圖。',
    '依官方法條及裁判內容核對適用要件。',
    '涉及期限或重大權益時，儘速向律師或法律扶助確認。'
  ];
  const [periodStartDate, setPeriodStartDate] = useState(() => {
    const extracted = extractIncidentDate(workflowState.userNarrative).date;
    return workflowState.safety?.incidentDate || (extracted ? toCalendarDate(extracted) : '');
  });
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
  // 主要法條清單只顯示已通過官方即時查驗者；未通過者一律只出現在「不可引用」區塊。
  // 官方證據對同一條文可能有兩筆紀錄（RAG 節點與查核閘門各查一次），
  // 且同一條文可能以「刑法第315條之1」或「刑法第315條之1（妨害秘密罪）」兩種形式出現；
  // 必須以正規化條號為鍵、並以「任一筆通過即視為通過」收斂，否則同一條文會兩邊都出現。
  const AUTHORITATIVE_STATUSES = ['VALID', 'VERIFIED', 'AUTHORITATIVE'];
  const statuteEvidenceByCitation = new Map<string, WorkflowStatuteEvidence>();
  for (const item of officialEvidence) {
    if (item.type !== 'STATUTE') continue;
    const key = normalizeStatuteCitation(item.citation);
    const existing = statuteEvidenceByCitation.get(key);
    if (!existing || (!AUTHORITATIVE_STATUSES.includes(existing.status) && AUTHORITATIVE_STATUSES.includes(item.status))) {
      statuteEvidenceByCitation.set(key, item);
    }
  }
  const allStatuteEvidence = Array.from(statuteEvidenceByCitation.values());
  const statuteEvidence = allStatuteEvidence.filter(item => AUTHORITATIVE_STATUSES.includes(item.status));
  const unverifiedStatutes = allStatuteEvidence.filter(item => !AUTHORITATIVE_STATUSES.includes(item.status));
  const problemResults = verification?.results?.filter(item => !item.verified || item.isGhostOrFake) || [];
  const warningNotice = verification?.warningNotice?.includes('fail-closed')
    ? '部分引用尚未經官方資料庫確認，因此目前只能參考，不能直接用於書狀或法律主張。'
    : verification?.warningNotice;
  // 保護面板已逐一列出 113／110／1925，行動指引此處不得重複出現同一支專線。
  const isHotlineLine = (line: string) => HOTLINE_PATTERN.test(line);
  const actionTips = workflowState.safety
    ? [
        ...workflowState.safety.immediateSteps.filter(line => !isHotlineLine(line)).slice(0, 3),
        ...(router?.suggestedActions || []).filter(line => !isHotlineLine(line)).slice(0, 3)
      ]
    : (router?.suggestedActions || DEFAULT_ACTION_TIPS).slice(0, 5);
  // 不可引用清單以「整份官方證據（去重後）」為唯一判準：
  // 只要任一筆官方紀錄通過查驗，該條文就不得再出現在此區塊，
  // 否則同一條引用會同時出現在主要清單與不可引用區塊而自相矛盾。
  const authoritativeStatuteKeys = new Set(
    statuteEvidence.map(item => normalizeStatuteCitation(item.citation))
  );
  const unverifiedCitations = allStatuteEvidence
    .filter(item => !AUTHORITATIVE_STATUSES.includes(item.status))
    .map(item => item.citation)
    .concat(
      (rag?.statuteCitations || []).filter(
        citation => !authoritativeStatuteKeys.has(normalizeStatuteCitation(citation))
      )
    )
    .filter((citation, index, all) => all.indexOf(citation) === index);
  // 函釋需與案情有實質主題交集；僅條號相同者（例如民法第184條對應到物之毀損折舊函釋）不顯示。
  const relevantInterpretations = (rag?.interpretations || []).filter(item =>
    assessInterpretationRelevance({
      text: `${item.title || ''} ${item.excerpt || ''}`,
      narrative: workflowState.userNarrative
    }).relevant
  );
  const excludedInterpretationCount = (rag?.interpretations || []).length - relevantInterpretations.length;
  const verifiedPrecedents = (rag?.precedents || []).filter(precedent =>
    verification?.externalCitations?.some(item => item.citation === precedent.caseNumber && item.status === 'verified' && item.exactMatch) &&
    officialEvidence.some(item => item.citation === precedent.caseNumber && item.type === 'PRECEDENT' && item.status === 'VERIFIED' && item.contentHash)
  );
  const evidenceTips = workflowState.safety?.preservationTips?.slice(0, 4) || [
    '保留可證明事件時間、地點及關係人的原始資料。',
    '備份通訊、錄音、照片、影片或監視器原始檔。',
    '整理契約、金流、醫療、報案或其他第三方紀錄。',
  ];
  const procedureSteps = buildProcedureSteps(router?.domain);
  const periodEstimates = router?.statuteOfLimitations ? calculateLegalPeriodEstimates(router.statuteOfLimitations, periodStartDate) : [];
  const title = workflowState.error ? '分析失敗' : canUseResult ? '分析結論' : status === 'FAIL' ? '分析草稿（檢核未通過）' : '初步分析（待查驗）';
  const actionClass = 'px-3 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <section aria-labelledby="analysis-result-title" className="rounded-xl border border-slate-800 bg-[var(--color-surface-raised)] overflow-hidden">
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
          }) : (
            <p className="py-2 border-t border-slate-800 text-xs leading-6 text-slate-400">
              引用清單中的法條均未通過全國法規資料庫即時查驗，請改由下方「不可引用」區塊檢視。
            </p>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-bold text-white">相關函釋</h2>
          {relevantInterpretations.length ? relevantInterpretations.map(item => (
            <div key={item.citation} className="py-2 border-t border-slate-800 text-xs text-slate-300">
              <div className="font-semibold text-slate-200">{item.title || item.citation}</div>
              {item.excerpt && <p className="mt-1 leading-6 text-[var(--color-text-secondary)]">{item.excerpt}</p>}
              {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sky-400 hover:underline">開啟來源核對原文<ExternalLink className="w-3 h-3" /></a>}
            </div>
          )) : <p className="text-xs leading-6 text-slate-400">目前沒有與本案爭點具備實質相關性的函釋。</p>}
          {excludedInterpretationCount > 0 && (
            <p className="text-[11px] leading-5 text-slate-500">已排除 {excludedInterpretationCount} 則僅條號相同但內容與本案爭點無關的函釋。</p>
          )}
        </div>

        {unverifiedCitations.length > 0 && (
          <div className="space-y-2 rounded-lg border border-rose-800/60 bg-rose-950/20 p-3">
            <h2 className="text-sm font-bold text-rose-200">不可引用｜未通過官方查驗的法條</h2>
            <p className="text-xs leading-6 text-rose-200/80">
              下列引用未能於全國法規資料庫完成即時查驗，可能為已廢止、過時或誤植的條號，<strong>不得用於書狀或法律主張</strong>。
            </p>
            <ul className="space-y-1 text-xs text-rose-200/90">
              {unverifiedCitations.map(citation => (
                <li key={citation}>• {formatStatuteCitation(citation, router?.legalBasis || [])}</li>
              ))}
            </ul>
          </div>
        )}

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
          {router?.statuteOfLimitations && (
            <div className="space-y-2 rounded-lg bg-amber-500/10 px-3 py-3 text-xs leading-5 text-amber-100">
              <p>期限／試算基準：{router.statuteOfLimitations}</p>
              <label className="flex flex-wrap items-center gap-2 font-semibold">
                法定期間起算日
                <input type="date" value={periodStartDate} onChange={event => setPeriodStartDate(event.target.value)} className="rounded border border-amber-400/30 bg-slate-950 px-2 py-1 text-slate-100" />
              </label>
              {periodStartDate && (periodEstimates.length > 0
                ? <ul>{periodEstimates.map(item => <li key={item.period}>• {item.period}初估截止日：{item.deadline}</li>)}</ul>
                : (/(非告訴乃論|公訴罪)/.test(router?.statuteOfLimitations || '') && periodStartDate
                  ? <p>本案屬公訴罪，原則上無告訴期限；起算日 {periodStartDate} 僅供記錄，實際送件時程仍請與承辦單位確認。</p>
                  : <p>目前無法從文字基準辨識可試算期間，請改用完整法定期間工具。</p>))}
              <p className="text-amber-200/80">起算事件、假日順延及在途期間可能改變結果，送件前仍須核對送達證明與適用法條。</p>
              {handleSelectTool && <button type="button" onClick={() => handleSelectTool('appeal', 'deadline')} className="inline-flex items-center gap-1 font-semibold text-sky-300 hover:underline"><Calculator className="h-3.5 w-3.5" />開啟上訴與救濟法定期間工具</button>}
            </div>
          )}
          <ol className="space-y-2 border-t border-slate-800 pt-3 text-xs leading-5 text-slate-300">
            {procedureSteps.map((step, index) => <li key={step}><span className="mr-2 font-bold text-violet-300">{index + 1}</span>{step}</li>)}
          </ol>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-bold text-white">引用相同法條的官方裁判</h2>
          <p className="text-xs leading-6 text-[var(--color-text-muted)]">
            下列裁判僅因<strong className="text-slate-300">引用了與您案件相同的法條</strong>而被列出，系統並未比對其犯罪事實與您案情是否類同。
            請自行開啟官方來源確認事實是否相近後再行參考，不得直接援引。
          </p>
          {verifiedPrecedents.length > 0 ? verifiedPrecedents.map((precedent, index) => {
              const citedStatutes = precedent.citedStatutes?.length
                ? precedent.citedStatutes
                : (rag.statuteCitations || []).filter(citation => normalizeCitation(precedent.summary).includes(normalizeCitation(citation)));
              return (
                <div key={`${precedent.caseNumber}-${index}`} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 py-2 border-t border-slate-800 text-xs text-slate-300">
                  <div>
                    <div className="font-semibold text-slate-200">{precedent.caseNumber}</div>
                    <div className="mt-1 text-[var(--color-text-muted)]">{precedent.courtName}{citedStatutes.length ? ` · 引用法條：${citedStatutes.join('、')}（僅代表法條相同，不代表事實類同）` : ' · 尚未比對出相同法條'} · 已通過司法院全文查核</div>
                  </div>
                  {precedent.sourceUrl && <a href={precedent.sourceUrl} target="_blank" rel="noreferrer" className="shrink-0 text-sky-400 hover:underline">官方來源</a>}
                </div>
              );
            }) : <p className="text-xs leading-6 text-slate-400">目前沒有通過司法院全文與 AI 防幽靈檢核的相關裁判。</p>}
        </div>

        <details className="border-t border-slate-800 pt-4 group">
          <summary className="cursor-pointer text-sm font-semibold text-slate-300 hover:text-white">深入了解分析依據</summary>
          <div className="pt-4 space-y-4 text-xs leading-6 text-[var(--color-text-secondary)]">
            <div><span className="block font-semibold text-slate-200">法律規則</span>{syllogism.majorPremise}</div>
            <div><span className="block font-semibold text-slate-200">案件事實</span>{syllogism.minorPremise}</div>
            <div><span className="block font-semibold text-slate-200">要件比對</span>{syllogism.subsumption}</div>
            <div>
              <span className="block font-semibold text-slate-200">完整分析</span>
              {syllogism.analysisBlocked ? (
                <div className="mt-1 space-y-2" role="alert">
                  <p className="rounded-md border border-rose-800/60 bg-rose-950/20 px-3 py-2 leading-6 text-rose-200">
                    本段 AI 分析與本機法律規則矛盾，已依 fail-closed 原則停止回傳，改以本機規則產生的結構化欄位（法律規則、案件事實、要件比對）為準。
                    請勿採用下列已被判定為錯誤的敘述：
                  </p>
                  <ul className="space-y-1.5">
                    {(syllogism.analysisViolations || []).map((violation, index) => (
                      <li key={`${violation.code}-${index}`} className="rounded-md border border-rose-900/60 px-3 py-2 leading-5 text-rose-200/90">
                        <div>{violation.message}</div>
                        <div className="mt-0.5 text-rose-300/70">原文片段：{violation.evidence}</div>
                        <div className="mt-0.5 text-rose-300/70">權威依據：{violation.authority}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{syllogism.fullAnalysis}</span>
              )}
            </div>
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
