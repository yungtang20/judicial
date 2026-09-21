import type { CaseFacts, DocumentBundle, LegalClaim } from '../types';

export interface LegalDomainAdapter {
  readonly domainId: string;
  scanFeatures(facts: CaseFacts): string[];
  generateAdvisory(facts: CaseFacts): string;
  recommendBundles(facts: CaseFacts): string[];
  claims?: LegalClaim[];
}

export function keywordFeatures(facts: CaseFacts, keywords: string[]): string[] {
  return keywords.filter(keyword => facts.narrative.includes(keyword));
}

export function createAdapter(
  domainId: string,
  keywords: string[],
  documentIds: string[],
  advisory: string,
  claims: LegalClaim[] = []
): LegalDomainAdapter {
  return {
    domainId,
    claims,
    scanFeatures: facts => keywordFeatures(facts, keywords),
    generateAdvisory: () => advisory,
    recommendBundles: () => [...documentIds]
  };
}
