import { verifyLegalCitations, VerifyCitationsOptions } from './citationVerifier.js';

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
