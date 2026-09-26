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

  it('verifies indexed added articles without generic-scan duplicates', () => {
    const result = verifyLegalCitations([
      '民法第1030條之1',
      '民法第1113條之2',
      '民法第15條之1'
    ].join('、'));
    expect(result.totalChecked).toBe(3);
    expect(result.ghostCount).toBe(0);
    expect(result.results).toHaveLength(3);
    expect(result.results.every(item => item.verified && item.hallucinationRisk === 'SAFE_VERIFIED')).toBe(true);
  });

  it('fails closed for constitutional interpretation, judgment, and detention citations', () => {
    const result = verifyLegalCitations([
      '釋字第9999號',
      '憲判字第123號',
      '憲訴字第45號'
    ].join('、'));
    expect(result.totalChecked).toBe(3);
    expect(result.results.every(item =>
      item.verified === false &&
      item.type === 'PRECEDENT' &&
      item.hallucinationRisk === 'UNVERIFIED'
    )).toBe(true);
  });

  it('recognizes spaced 台上大 court citations as unverified when not indexed', () => {
    const citation = '最高法院 112 年 台上大 字 第 9 號 判決';
    const result = verifyLegalCitations(`參照${citation}。`);
    expect(result.totalChecked).toBe(1);
    expect(result.results[0]).toMatchObject({
      citationText: citation,
      verified: false,
      type: 'PRECEDENT',
      hallucinationRisk: 'UNVERIFIED'
    });
  });

  it('fails closed for a suffixless case citation', () => {
    const result = verifyLegalCitations('參照最高法院112年度台上字第9號。');
    expect(result.totalChecked).toBe(1);
    expect(result.results[0].verified).toBe(false);
  });

  it('does not let a partial allowlist authorize a different court citation', () => {
    const result = verifyLegalCitations('最高法院112年度台上字第9號判決', {
      allowedCitations: ['台上字第9號'],
      strictAllowedOnly: true
    });
    expect(result.results.every(item => item.verified === false)).toBe(true);
  });

  it('rejects an indexed statute outside a strict retrieval allowlist', () => {
    const result = verifyLegalCitations('民法第184條第1項', {
      allowedCitations: ['最高法院112年度台上字第9號'],
      strictAllowedOnly: true
    });
    expect(result.results.every(item => item.verified === false)).toBe(true);
  });

  it('fails closed for a case citation without a court name', () => {
    const result = verifyLegalCitations('判決理由：112年度台上字第9號判決');
    expect(result.totalChecked).toBe(1);
    expect(result.results[0]).toMatchObject({ verified: false, type: 'PRECEDENT' });
  });

  it('does not verify a known case number under the wrong court', () => {
    const result = verifyLegalCitations('高等法院98年度台上字第1045號判決');
    expect(result.results.every(item => item.verified === false)).toBe(true);
  });

  it('flags impossible paragraph numbering as a ghost citation', () => {
    const result = verifyLegalCitations('民法第184條第99項');
    expect(result.ghostCount).toBe(1);
    expect(result.results[0]).toMatchObject({ verified: false, isGhostOrFake: true, hallucinationRisk: 'SUSPICIOUS_NUMBERING' });
  });

  it('does not authorize a different district court under strict allowlist', () => {
    const result = verifyLegalCitations('臺灣高雄地方法院112年訴字第9號判決', {
      allowedCitations: ['臺灣新北地方法院112年訴字第9號'],
      strictAllowedOnly: true
    });
    expect(result.results.every(item => item.verified === false)).toBe(true);
  });

  it('keeps unknown citations unverified without claiming official truth', () => {
    const result = verifyLegalCitations('民法第999條與最高法院111年度台上字第1234號判決');
    expect(result.results).toHaveLength(2);
    expect(result.results.every(item => item.verified === false)).toBe(true);
    expect(result.results.some(item => item.hallucinationRisk === 'UNVERIFIED')).toBe(true);
    expect(result.sanitizedText).toContain('最高法院111年度台上字第1234號判決');
  });

  it('flags a statute outside the local law-name allowlist as unverified', () => {
    const result = verifyLegalCitations('依行政訴訟法第999條主張。');
    expect(result.totalChecked).toBe(1);
    expect(result.results[0]).toMatchObject({
      verified: false,
      type: 'STATUTE',
      hallucinationRisk: 'UNVERIFIED'
    });
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

  it('verifies precedents matching allowedCitations from RAG retrieval', () => {
    const result = verifyLegalCitations('參照最高法院112年度台上字第9號判決之意旨。', {
      allowedCitations: ['最高法院112年度台上字第9號']
    });
    expect(result.totalChecked).toBe(1);
    expect(result.ghostCount).toBe(0);
    expect(result.results[0]).toMatchObject({
      verified: true,
      type: 'PRECEDENT',
      hallucinationRisk: 'SAFE_VERIFIED'
    });
    expect(result.sanitizedText).toContain('最高法院112年度台上字第9號判決');
  });

  it('rejects unapproved precedents as ghost citations when allowedCitations are strictly enforced', () => {
    const result = verifyLegalCitations('參照最高法院111年度台上字第1234號判決。', {
      allowedCitations: ['最高法院112年度台上字第9號']
    });
    expect(result.totalChecked).toBe(1);
    expect(result.ghostCount).toBe(1);
    expect(result.results[0]).toMatchObject({
      verified: false,
      isGhostOrFake: true,
      hallucinationRisk: 'FAKE_GHOST_CITATION'
    });
    expect(result.sanitizedText).not.toContain('第1234號判決');
  });
});
