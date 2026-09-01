import { verifyLegalCitations } from './citationVerifier.js';

export interface GeneratedDocumentVerification {
  documentText: string;
  antiGhostVerification: {
    totalCitationsChecked: number;
    ghostCitationsFound: number;
    verifiedCitations: ReturnType<typeof verifyLegalCitations>['results'];
  };
}

type Verifier = typeof verifyLegalCitations;

/** Shared generate → verify → return pipeline for legal documents. */
export async function generateVerifiedDocument(
  generate: () => Promise<string> | string,
  verify: Verifier = verifyLegalCitations
): Promise<GeneratedDocumentVerification> {
  const generated = await generate();
  if (typeof generated !== 'string' || !generated.trim()) {
    throw new Error('法律文件生成結果為空，拒絕回傳未檢核文件');
  }

  const result = verify(generated);
  return {
    documentText: result.sanitizedText,
    antiGhostVerification: {
      totalCitationsChecked: result.totalChecked,
      ghostCitationsFound: result.ghostCount,
      verifiedCitations: result.results
    }
  };
}
