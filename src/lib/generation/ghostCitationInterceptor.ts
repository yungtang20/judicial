import type { McpCitation, McpCitationRegistry } from '../mcp/mcpCitationRegistry';
import type { CitationVerificationResult } from '../../types';

export type GhostCitationErrorCode = 'GHOST_CITATION_BLOCKED' | 'INVALID_LAW_CITATION_BLOCKED';

export class GhostCitationError extends Error {
  constructor(public readonly code: GhostCitationErrorCode, citationId: string) {
    // 開頭的「法律文件引用檢核未通過」是 legalGovernance 治理測試所契約的句子，不得更動。
    // 但內部錯誤代碼不得出現在使用者介面上，因此只保留可讀的原因說明。
    super(
      code === 'GHOST_CITATION_BLOCKED'
        ? `法律文件引用檢核未通過，拒絕回傳未確認引用文件。涉及引用：「${citationId}」，請確認該條文或案號是否正確後再試。`
        : `法律文件引用檢核未通過，拒絕回傳未確認引用文件。涉及引用：「${citationId}」，該法條已失效或非現行有效，請調整後再試。`
    );
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
