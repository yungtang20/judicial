import { CitationVerificationResult } from '../types';
import { StatuteExistenceCheck, verifyLegalCitations } from './citationVerifier';


export type LegalInputMode = 'generation' | 'analysis';
type LegalInputPrecheckStatus = 'pass' | 'needs_review' | 'reject';

interface LegalInputPrecheckIssue {
  code: 'INVALID_REQUEST' | 'MALFORMED_CITATION' | 'UNVERIFIED_CITATION';
  message: string;
  citation?: string;
}

export interface LegalInputPrecheckResult {
  status: LegalInputPrecheckStatus;
  /**
   * 實際使用的查證方式。對外揭露這點很重要：
   * 使用者看到「官方資料」才知道條號是向法務部查證的，
   * 看到「本機索引」則應知道覆蓋有限。
   */
  checkerKind: 'heuristic' | 'official';
  explicitCitations: CitationVerificationResult[];
  issues: LegalInputPrecheckIssue[];
}

export interface LegalInputPrecheckOptions {
  /**
   * 官方法規即時查詢。提供時以官方資料為準。
   * 不提供（單元測試、離線環境）則退回本機靜態索引，行為與原本相同。
   */
  statuteExistence?: StatuteExistenceCheck;
  /** 官方資料的更新日，寫入說明訊息讓使用者知道基準。 */
  officialUpdateDate?: string;
}

/**
 * Validate request text and explicitly supplied citations before generation.
 * This is a local heuristic pre-check, not an official government verification.
 *
 * 傳入 options.statuteExistence 時，條號存在性改由官方法規資料庫判定：
 * 官方確認存在的條文視為已查證，官方確認不存在的視為捏造。
 * 這取代了會過期的本機靜態索引——實測該索引只涵蓋民法 3.3%，
 * 且硬編的條號上限已落後（民訴法實際 640 條，索引仍寫 607）。
 *
 * 查不到（UNKNOWN）時維持原本的 fail-closed 行為，不得因無法查證就放行。
 */
export function precheckLegalInput(
  input: unknown,
  mode: LegalInputMode = 'analysis',
  options?: LegalInputPrecheckOptions
): LegalInputPrecheckResult {
  if (typeof input !== 'string' || input.trim().length === 0) {
    return {
      status: 'reject',
      checkerKind: options?.statuteExistence ? 'official' : 'heuristic',
      explicitCitations: [],
      issues: [{ code: 'INVALID_REQUEST', message: '法律輸入內容不得為空。' }]
    };
  }

  const verification = verifyLegalCitations(input, { statuteExistence: options?.statuteExistence });
  const 有官方 = Boolean(options?.statuteExistence);
  const issues: LegalInputPrecheckIssue[] = verification.results
    .filter(citation => !citation.verified)
    .map(citation => ({
      code: citation.isGhostOrFake ? 'MALFORMED_CITATION' : 'UNVERIFIED_CITATION',
      message: citation.isGhostOrFake
        ? '引用格式或案號被本機規則判定為高度可疑。'
        : 有官方
          ? `引用無法由官方法規資料庫（更新日期 ${options?.officialUpdateDate || '未知'}）確認。`
          : '引用未收錄於本機索引，無法由 heuristic 確認。',
      citation: citation.citationText
    }));

  const hasMalformed = verification.results.some(citation => citation.isGhostOrFake);
  const hasUnverified = verification.results.some(citation => !citation.verified);
  const status: LegalInputPrecheckStatus = hasMalformed || (mode === 'generation' && hasUnverified)
    ? 'reject'
    : hasUnverified
      ? 'needs_review'
      : 'pass';

  return {
    status,
    checkerKind: 有官方 ? 'official' : 'heuristic',
    explicitCitations: verification.results,
    issues
  };
}
