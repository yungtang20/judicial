import type { CaseFacts, CaseParty, LegalClaim, StandingFinding } from './types';

export function analyzeStanding(
  facts: CaseFacts,
  parties: CaseParty[],
  claims: LegalClaim[]
): StandingFinding[] {
  const claimant = parties.find(party => party.id === facts.claimantPartyId);
  return claims.map(claim => {
    const eligiblePartyRoles = claim.standingRequirement
      .split(/[、,，/]/)
      .map(role => role.trim())
      .filter(Boolean);
    const eligible = Boolean(claimant && eligiblePartyRoles.some(role => claimant.role.includes(role) || role.includes(claimant.role)));
    return {
      claimId: claim.id,
      claimantPartyId: facts.claimantPartyId,
      eligiblePartyRoles,
      status: eligible ? 'ESTABLISHED' : 'SUBJECT_MISMATCH',
      reason: eligible
        ? `目前主張人角色「${claimant?.role}」落在適格主體範圍。`
        : `此請求權適格主體為：${eligiblePartyRoles.join('、') || '未提供'}；目前主張人不是已確認的適格主體。`
    };
  });
}
