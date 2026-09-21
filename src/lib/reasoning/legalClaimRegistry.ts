import type { LegalClaim } from './types';

export class LegalClaimRegistry {
  private readonly claims = new Map<string, LegalClaim>();

  constructor(claims: LegalClaim[] = []) {
    claims.forEach(claim => this.register(claim));
  }

  register(claim: LegalClaim): void {
    if (!claim.id.trim() || !claim.legalBasis.trim() || claim.positiveElements.length === 0) {
      throw new Error('LegalClaim 必須包含 id、legalBasis 與 positiveElements');
    }
    this.claims.set(claim.id, { ...claim, positiveElements: [...claim.positiveElements], evidenceRequirements: [...claim.evidenceRequirements] });
  }

  get(id: string): LegalClaim | undefined {
    const claim = this.claims.get(id);
    return claim && { ...claim, positiveElements: [...claim.positiveElements], evidenceRequirements: [...claim.evidenceRequirements] };
  }

  list(): LegalClaim[] {
    return [...this.claims.keys()].map(id => this.get(id)!).filter(Boolean);
  }
}
