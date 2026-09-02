import { describe, it, expect } from 'vitest';
import { buildFallbackToolboxResult } from './toolboxFallbacks';
import { verifyGeneratedDocument } from '../lib/generatedDocumentPipeline';
import { LEGAL_TOOLS } from '../lib/legalToolRegistry';

describe('Toolbox Fallbacks Verification', () => {
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

    console.log('Failed tools count:', failedTools.length);
    console.log('Failed tools details:', JSON.stringify(failedTools, null, 2));
    expect(failedTools).toEqual([]);
  });
});
