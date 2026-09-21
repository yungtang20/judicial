import { buildSyllogismResult } from './reasoning/syllogismEngine';
import { analyzeStanding } from './reasoning/standingAnalyzer';
import { evaluateElementFit } from './reasoning/elementFitFilter';
import { getDomainAdapter } from './reasoning/domainAdapters';
import type { CaseFacts, CaseParty, DocumentBundle, LegalClaim } from './reasoning/types';

export interface CaseScenarioInput {
  domainId: string;
  facts: CaseFacts;
  parties: CaseParty[];
  claims?: LegalClaim[];
}

export function analyzeCaseScenario(input: CaseScenarioInput): DocumentBundle {
  const adapter = getDomainAdapter(input.domainId);
  if (!adapter) {
    return { domainId: input.domainId, summary: '尚未建立此領域適配器，無法安全推薦文件。', recommendedDocumentIds: [], legalClaims: input.claims || [], standing: [], fit: [], warnings: ['DOMAIN_NOT_SUPPORTED'] };
  }
  const claims = input.claims || adapter.claims || [];
  const standing = analyzeStanding(input.facts, input.parties, claims);
  const fit = claims.map(claim => evaluateElementFit(claim, claim.positiveElements.map(element => ({ element, status: '證據不足' as const })), standing.find(item => item.claimId === claim.id)?.status === 'SUBJECT_MISMATCH'));
  const syllogism = buildSyllogismResult({ majorPremise: adapter.generateAdvisory(input.facts), minorPremise: input.facts.narrative, conclusion: '目前僅產出待驗證分析，不代表法律結論。', mcpCitationIds: claims.flatMap(claim => claim.citationId ? [claim.citationId] : []) });
  return {
    domainId: adapter.domainId,
    summary: syllogism.valid ? adapter.generateAdvisory(input.facts) : `${adapter.generateAdvisory(input.facts)} 尚缺有效法源 citation，維持待查狀態。`,
    recommendedDocumentIds: adapter.recommendBundles(input.facts),
    legalClaims: claims,
    standing,
    fit,
    warnings: syllogism.valid ? [] : ['CITATION_REVIEW_REQUIRED']
  };
}
