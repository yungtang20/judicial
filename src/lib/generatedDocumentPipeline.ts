import { verifyLegalCitations, VerifyCitationsOptions } from './citationVerifier.js';
import { interceptVerifiedCitationResults } from './generation/ghostCitationInterceptor.js';
import { containsSimplifiedChinese, describeSimplifiedChinese } from './traditionalChineseGuard.js';

export interface GeneratedDocumentVerification {
  documentText: string;
  antiGhostVerification: {
    totalCitationsChecked: number;
    ghostCitationsFound: number;
    verifiedCitations: ReturnType<typeof verifyLegalCitations>['results'];
    verificationPassed: boolean;
  };
}

/** Fail closed so callers cannot accidentally return a document with unresolved citations. */
export function assertGeneratedDocumentVerified(result: GeneratedDocumentVerification): GeneratedDocumentVerification {
  interceptVerifiedCitationResults(result.antiGhostVerification.verifiedCitations);
  if (!result.antiGhostVerification.verificationPassed) {
    throw new Error('法律文件引用檢核未通過，拒絕回傳未確認引用文件');
  }
  return result;
}

type Verifier = (text: string, options?: VerifyCitationsOptions) => ReturnType<typeof verifyLegalCitations>;

export interface VerifyDocumentOptions extends VerifyCitationsOptions {
  verify?: Verifier;
}

export function verifyGeneratedDocument(
  documentText: string,
  optionsOrVerifier: Verifier | VerifyDocumentOptions = verifyLegalCitations
): GeneratedDocumentVerification {
  if (!documentText.trim()) {
    throw new Error('法律文件生成結果為空，拒絕回傳未檢核文件');
  }

  // 繁體中文是台灣法律文件的硬性要求。簡體字進入交付等同交付錯誤文件，
  // 與幽靈法條同級，採 fail-closed 阻擋。
  if (containsSimplifiedChinese(documentText)) {
    throw new Error(describeSimplifiedChinese('產製文件', documentText));
  }

  let verifyFn: Verifier = verifyLegalCitations;
  let options: VerifyCitationsOptions | undefined;

  if (typeof optionsOrVerifier === 'function') {
    verifyFn = optionsOrVerifier;
  } else if (optionsOrVerifier && typeof optionsOrVerifier === 'object') {
    if (optionsOrVerifier.verify) {
      verifyFn = optionsOrVerifier.verify;
    }
    options = {
      allowedCitations: optionsOrVerifier.allowedCitations,
      strictAllowedOnly: optionsOrVerifier.strictAllowedOnly
    };
  }

  const result = verifyFn(documentText, options);
  return {
    documentText: result.sanitizedText,
    antiGhostVerification: {
      totalCitationsChecked: result.totalChecked,
      ghostCitationsFound: result.ghostCount,
      verifiedCitations: result.results,
      verificationPassed: result.ghostCount === 0 && (result.results.length === 0 || result.results.every(citation => citation.verified))
    }
  };
}

export interface OfficialCitationEvidence {
  citation: string;
  type: string;
  status: string;
  source: string;
  sourceUrl: string;
  checkedAt: string;
  snippet?: string;
  contentHash?: string;
}

export interface OfficialCitationVerifier {
  (inputs: Array<{ citation: string; type: 'STATUTE' | 'PRECEDENT' }>): Promise<{ evidence: OfficialCitationEvidence[] }>;
}

/**
 * 在本機驗證之後，對「本機未收錄但未被判定為幽靈」的引用補做官方即時查核。
 *
 * 背景：本機法規種子僅收錄 24 條，未收錄者一律 `verified: false`，
 * 會被 fail-closed 直接擋下。實測導致「存證信函」模板引用的
 * 民事訴訟法第249條第2項（真實且現行有效）永遠產製失敗（422 GHOST_CITATION_BLOCKED）。
 *
 * 規則（維持 fail-closed）：
 * - 只升級「本機查不到、且未被判定為幽靈／明顯虛構」的引用。
 * - 官方來源同樣查不到的，維持未驗證，仍然擋下交付。
 * - 官方來源不可用時不得降級放行。
 */
export async function verifyGeneratedDocumentWithOfficialSources(
  documentText: string,
  options: VerifyDocumentOptions,
  officialVerify: OfficialCitationVerifier
): Promise<GeneratedDocumentVerification> {
  const local = verifyGeneratedDocument(documentText, options);
  const results = local.antiGhostVerification.verifiedCitations;
  const needsOfficialCheck = results.filter(citation => !citation.verified && !citation.isGhostOrFake);
  if (needsOfficialCheck.length === 0) {
    return local;
  }

  const official = await officialVerify(
    needsOfficialCheck.map(citation => ({
      citation: citation.citationText,
      type: 'STATUTE' as const
    }))
  );

  const authoritative = new Set(
    official.evidence
      .filter(item => ['VALID', 'VERIFIED', 'AUTHORITATIVE'].includes(item.status))
      .map(item => item.citation)
      .map(citation => citation.replace(/[（(][^）)]*[）)]/g, '').replace(/[\s　]/g, ''))
  );

  const upgraded = results.map(citation => {
    if (citation.verified || citation.isGhostOrFake) return citation;
    const key = citation.citationText.replace(/[（(][^）)]*[）)]/g, '').replace(/[\s　]/g, '');
    if (!authoritative.has(key)) return citation;
    const evidence = official.evidence.find(
      item => item.citation.replace(/[（(][^）)]*[）)]/g, '').replace(/[\s　]/g, '') === key
    );
    return {
      ...citation,
      verified: true,
      officialTitle: evidence?.snippet ? `${citation.officialTitle}（已於${evidence.source}確認）` : citation.officialTitle,
      officialSourceUrl: evidence?.sourceUrl || citation.officialSourceUrl,
      officialSnippet: evidence?.snippet || citation.officialSnippet,
      claimSupportStatus: citation.claimSupportStatus
    };
  });

  return {
    documentText: local.documentText,
    antiGhostVerification: {
      totalCitationsChecked: local.antiGhostVerification.totalCitationsChecked,
      ghostCitationsFound: local.antiGhostVerification.ghostCitationsFound,
      verifiedCitations: upgraded,
      verificationPassed: local.antiGhostVerification.ghostCitationsFound === 0 && upgraded.every(citation => citation.verified)
    }
  };
}

/** Shared generate → verify → return pipeline for legal documents. */
export async function generateVerifiedDocument(
  generate: () => Promise<string> | string,
  verify: Verifier = verifyLegalCitations
): Promise<GeneratedDocumentVerification> {
  const generated = await generate();
  if (typeof generated !== 'string' || !generated.trim()) {
    throw new Error('法律文件生成結果為空，拒絕回傳未檢核文件');
  }

  return assertGeneratedDocumentVerified(verifyGeneratedDocument(generated, verify));
}
