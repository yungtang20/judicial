import { describe, expect, it } from 'vitest';
import { verifyLegalCitations } from './citationVerifier';

describe('citation verifier boundaries', () => {
  it('recognizes indexed statutes and preserves their text', () => {
    const result = verifyLegalCitations('依民法第184條第1項請求損害賠償。');
    expect(result.totalChecked).toBe(1);
    expect(result.ghostCount).toBe(0);
    expect(result.results[0]).toMatchObject({ verified: true, type: 'STATUTE', hallucinationRisk: 'SAFE_VERIFIED' });
    expect(result.sanitizedText).toContain('民法第184條第1項');
  });

  it('flags impossible paragraph numbering as a ghost citation', () => {
    const result = verifyLegalCitations('民法第184條第99項');
    expect(result.ghostCount).toBe(1);
    expect(result.results[0]).toMatchObject({ verified: false, isGhostOrFake: true, hallucinationRisk: 'SUSPICIOUS_NUMBERING' });
  });

  it('keeps unknown citations unverified without claiming official truth', () => {
    const result = verifyLegalCitations('民法第999條與最高法院111年度台上字第1234號判決');
    expect(result.results).toHaveLength(2);
    expect(result.results.every(item => item.verified === false)).toBe(true);
    expect(result.results.some(item => item.hallucinationRisk === 'UNVERIFIED')).toBe(true);
    expect(result.sanitizedText).toContain('最高法院111年度台上字第1234號判決');
  });

  it('sanitizes highly suspicious precedent numbers while retaining a warning', () => {
    const result = verifyLegalCitations('最高法院116年度台上字第99999號判決');
    expect(result.ghostCount).toBe(1);
    expect(result.results[0]).toMatchObject({ verified: false, isGhostOrFake: true, hallucinationRisk: 'FAKE_GHOST_CITATION' });
    expect(result.sanitizedText).not.toContain('第99999號判決');
  });

  it('recognizes an indexed precedent as verified', () => {
    const result = verifyLegalCitations('參照最高法院98年度台上字第1045號判決。');
    expect(result.results[0]).toMatchObject({ verified: true, type: 'PRECEDENT', hallucinationRisk: 'SAFE_VERIFIED' });
    expect(result.ghostCount).toBe(0);
  });
});
