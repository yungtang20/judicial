import { describe, it, expect } from 'vitest';
import { buildFallbackToolboxResult } from './toolboxFallbacks';
import { verifyGeneratedDocument } from '../lib/generatedDocumentPipeline';
import { LEGAL_TOOLS } from '../lib/legalToolRegistry';

describe('Toolbox Fallbacks Verification', () => {
  it('provides a specific, non-empty fallback contract for every registered tool', () => {
    const genericFallbacks: string[] = [];
    const invalidContracts: string[] = [];

    for (const tool of LEGAL_TOOLS) {
      const fallback = buildFallbackToolboxResult(tool.id, {});
      if (fallback.title === '標準法律文書') genericFallbacks.push(tool.id);
      if (
        fallback.toolCategory !== tool.id ||
        !fallback.title.trim() ||
        !fallback.documentText.trim() ||
        fallback.complianceChecklist.length === 0
      ) {
        invalidContracts.push(tool.id);
      }
    }

    expect(genericFallbacks).toEqual([]);
    expect(invalidContracts).toEqual([]);
  });

  it('checks which fallback tools pass or fail verification', () => {
    const failedTools: Array<{ id: string; unverified: string[]; ghosts: string[] }> = [];

    for (const tool of LEGAL_TOOLS) {
      try {
        const fallback = buildFallbackToolboxResult(tool.id, {});
        const verified = verifyGeneratedDocument(fallback.documentText);
        if (!verified.antiGhostVerification.verificationPassed) {
          failedTools.push({
            id: tool.id,
            ghosts: verified.antiGhostVerification.verifiedCitations.filter(c => c.isGhostOrFake).map(c => c.citationText),
            unverified: verified.antiGhostVerification.verifiedCitations.filter(c => !c.verified).map(c => c.citationText)
          });
        }
      } catch (err: any) {
        failedTools.push({
          id: tool.id,
          ghosts: [err.message],
          unverified: []
        });
      }
    }

    expect(failedTools).toEqual([]);
  });
});
