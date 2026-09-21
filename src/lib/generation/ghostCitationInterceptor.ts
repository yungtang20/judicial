import type { McpCitation, McpCitationRegistry } from '../mcp/mcpCitationRegistry';
import type { CitationVerificationResult } from '../../types';

export type GhostCitationErrorCode = 'GHOST_CITATION_BLOCKED' | 'INVALID_LAW_CITATION_BLOCKED';

export class GhostCitationError extends Error {
  constructor(public readonly code: GhostCitationErrorCode, citationId: string) {
    super(`法律文件引用檢核未通過，拒絕回傳未確認引用文件（${code}）: ${citationId}`);
    this.name = 'GhostCitationError';
  }
}

export function interceptVerifiedCitationResults(results: CitationVerificationResult[]): void {
  const blocked = results.find(result => !result.verified || result.isGhostOrFake);
  if (blocked) throw new GhostCitationError('GHOST_CITATION_BLOCKED', blocked.citationText);
}

export function interceptGhostCitations(
  citationIds: string[],
  registry: McpCitationRegistry
): McpCitation[] {
  return citationIds.map(id => {
    const citation = registry.get(id);
    if (!citation) throw new GhostCitationError('GHOST_CITATION_BLOCKED', id);
    if (citation.kind === 'LAW' && citation.currentStatus !== 'EFFECTIVE') {
      throw new GhostCitationError('INVALID_LAW_CITATION_BLOCKED', id);
    }
    return citation;
  });
}
