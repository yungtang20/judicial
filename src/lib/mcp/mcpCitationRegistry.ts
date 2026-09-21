export type LawCitationStatus = 'EFFECTIVE' | 'AMENDED' | 'REPEALED';

export interface LawCitation {
  id: string;
  kind: 'LAW';
  lawName: string;
  articleNumber: string;
  currentStatus: LawCitationStatus;
  effectiveDate?: string;
  sourceUrl: string;
}

export interface JudgmentCitation {
  id: string;
  kind: 'JUDGMENT';
  caseNumber: string;
  court: string;
  judgmentDate: string;
  sourceUrl: string;
  sourceHash: string;
}

export type McpCitation = LawCitation | JudgmentCitation;

function assertNonEmpty(value: string, field: string): void {
  if (!value.trim()) throw new Error(`${field} 不得為空`);
}

function validateCitation(citation: McpCitation): void {
  assertNonEmpty(citation.id, 'citation.id');
  assertNonEmpty(citation.sourceUrl, 'citation.sourceUrl');
  if (citation.kind === 'LAW') {
    assertNonEmpty(citation.lawName, 'citation.lawName');
    assertNonEmpty(citation.articleNumber, 'citation.articleNumber');
    assertNonEmpty(citation.currentStatus, 'citation.currentStatus');
  } else {
    assertNonEmpty(citation.caseNumber, 'citation.caseNumber');
    assertNonEmpty(citation.court, 'citation.court');
    assertNonEmpty(citation.judgmentDate, 'citation.judgmentDate');
    assertNonEmpty(citation.sourceHash, 'citation.sourceHash');
  }
}

/** In-memory boundary for validated MCP results; no citation is trusted by omission. */
export class McpCitationRegistry {
  private readonly citations = new Map<string, McpCitation>();

  constructor(citations: McpCitation[] = []) {
    citations.forEach(citation => this.register(citation));
  }

  register(citation: McpCitation): void {
    validateCitation(citation);
    this.citations.set(citation.id, Object.freeze({ ...citation }));
  }

  get(id: string): McpCitation | undefined {
    return this.citations.get(id);
  }

  has(id: string): boolean {
    return this.citations.has(id);
  }

  list(): McpCitation[] {
    return [...this.citations.values()].map(citation => ({ ...citation }));
  }
}

export function createMcpCitationRegistry(citations: McpCitation[] = []): McpCitationRegistry {
  return new McpCitationRegistry(citations);
}
