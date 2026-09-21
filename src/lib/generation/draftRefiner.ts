import { verifyGeneratedDocument, type GeneratedDocumentVerification } from '../generatedDocumentPipeline';
import { interceptVerifiedCitationResults } from './ghostCitationInterceptor';

export type DraftRefinementGenerator = (prompt: string) => Promise<string>;

function isAllowedCitation(citationText: string, allowedCitations: string[]) {
  return allowedCitations.some(allowed => allowed === citationText || allowed.includes(citationText) || citationText.includes(allowed));
}

export async function refineVerifiedDraft(
  draftText: string,
  instruction: string,
  allowedCitations: string[],
  generate: DraftRefinementGenerator
): Promise<GeneratedDocumentVerification> {
  const refinedText = await generate([
    '請只微調以下法律草稿的語氣、結構或事實細節。',
    '禁止新增、改寫或推測任何不在允許引用白名單內的法條或裁判。',
    `允許引用：${allowedCitations.join('、') || '無'}`,
    `原草稿：${draftText}`,
    `修改要求：${instruction}`
  ].join('\n'));
  const verified = verifyGeneratedDocument(refinedText, { allowedCitations, strictAllowedOnly: true });
  interceptVerifiedCitationResults(verified.antiGhostVerification.verifiedCitations);
  const unauthorized = verified.antiGhostVerification.verifiedCitations.find(citation => !isAllowedCitation(citation.citationText, allowedCitations));
  if (unauthorized) throw new Error(`GHOST_CITATION_BLOCKED: ${unauthorized.citationText}`);
  return verified;
}
