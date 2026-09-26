import {
  verifyGeneratedDocument,
  verifyGeneratedDocumentWithOfficialSources,
  type GeneratedDocumentVerification,
  type OfficialCitationVerifier
} from '../generatedDocumentPipeline';
import { interceptVerifiedCitationResults } from './ghostCitationInterceptor';

export type DraftRefinementGenerator = (prompt: string) => Promise<string>;

function isAllowedCitation(citationText: string, allowedCitations: string[]) {
  return allowedCitations.some(allowed => allowed === citationText || allowed.includes(citationText) || citationText.includes(allowed));
}

export async function refineVerifiedDraft(
  draftText: string,
  instruction: string,
  allowedCitations: string[],
  generate: DraftRefinementGenerator,
  /**
   * 官方法源查核。本機法規種子僅收錄 24 條，未收錄者一律判為未驗證而擋下；
   * 實測導致微調稿只要引用民法第179條這類真實條文就必定失敗。
   * 未提供時維持原本的純本機驗證行為（fail-closed）。
   */
  officialVerify?: OfficialCitationVerifier
): Promise<GeneratedDocumentVerification> {
  const refinedText = await generate([
    '請只微調以下法律草稿的語氣、結構或事實細節。',
    '禁止新增、改寫或推測任何不在允許引用白名單內的法條或裁判。',
    `允許引用：${allowedCitations.join('、') || '無'}`,
    `原草稿：${draftText}`,
    `修改要求：${instruction}`
  ].join('\n'));
  const options = { allowedCitations, strictAllowedOnly: true };
  const verified = officialVerify
    ? await verifyGeneratedDocumentWithOfficialSources(refinedText, options, officialVerify)
    : verifyGeneratedDocument(refinedText, options);
  interceptVerifiedCitationResults(verified.antiGhostVerification.verifiedCitations);
  const unauthorized = verified.antiGhostVerification.verifiedCitations.find(citation => !isAllowedCitation(citation.citationText, allowedCitations));
  if (unauthorized) {
    // 使用者看到的是 AI 擅自加入了未經核准的法條，必須以白話說明，
    // 不得直接丟出 GHOST_CITATION_BLOCKED 這類內部代碼。
    throw new Error(
      `微調後的文件擅自加入了未經核准的法條「${unauthorized.citationText}」。` +
      '系統不會交付含有非授權引用的文件，請調整修改要求後再試。'
    );
  }
  return verified;
}
