import { describe, it, expect, vi } from 'vitest';
import { verifyGeneratedDocumentWithOfficialSources } from './generatedDocumentPipeline';

const localOnlyText = '本件依民事訴訟法第249條第2項規定，於辯論終結後為聲明。';

describe('verifyGeneratedDocumentWithOfficialSources', () => {
  it('本機查不到但官方確認有效者升級為已驗證', async () => {
    const officialVerify = vi.fn(async () => ({
      evidence: [{
        citation: '民事訴訟法第249條第2項',
        type: 'STATUTE',
        status: 'VERIFIED',
        source: '全國法規資料庫',
        sourceUrl: 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=B0010001',
        checkedAt: '2026-09-26T00:00:00.000Z',
        snippet: '訴之變更…'
      }]
    }));

    const result = await verifyGeneratedDocumentWithOfficialSources(
      localOnlyText,
      { allowedCitations: [], strictAllowedOnly: true },
      officialVerify
    );

    expect(officialVerify).toHaveBeenCalledTimes(1);
    const upgraded = result.antiGhostVerification.verifiedCitations.find(c => c.citationText.includes('249'));
    expect(upgraded?.verified).toBe(true);
    expect(result.antiGhostVerification.verificationPassed).toBe(true);
  });

  it('官方同樣查不到者維持未驗證並不得通過（fail-closed）', async () => {
    const officialVerify = vi.fn(async () => ({
      evidence: [{
        citation: '民事訴訟法第249條第2項',
        type: 'STATUTE',
        status: 'UNAVAILABLE',
        source: '全國法規資料庫',
        sourceUrl: 'https://law.moj.gov.tw/',
        checkedAt: '2026-09-26T00:00:00.000Z',
        error: 'OFFICIAL_ROUTE_UNRESOLVED'
      }]
    }));

    const result = await verifyGeneratedDocumentWithOfficialSources(
      localOnlyText,
      { allowedCitations: [], strictAllowedOnly: true },
      officialVerify
    );

    const stillUnknown = result.antiGhostVerification.verifiedCitations.find(c => c.citationText.includes('249'));
    expect(stillUnknown?.verified).toBe(false);
    expect(result.antiGhostVerification.verificationPassed).toBe(false);
  });

  it('官方來源不可用（回傳空證據）時不得降級放行', async () => {
    const officialVerify = vi.fn(async () => ({ evidence: [] }));

    const result = await verifyGeneratedDocumentWithOfficialSources(
      localOnlyText,
      { allowedCitations: [], strictAllowedOnly: true },
      officialVerify
    );

    expect(result.antiGhostVerification.verificationPassed).toBe(false);
    expect(result.antiGhostVerification.verifiedCitations.every(c => !c.verified)).toBe(true);
  });

  it('本機已驗證者不會再打擾官方來源', async () => {
    const officialVerify = vi.fn(async () => ({ evidence: [] }));

    const result = await verifyGeneratedDocumentWithOfficialSources(
      '依民法第184條請求損害賠償。',
      { allowedCitations: ['民法第184條'], strictAllowedOnly: true },
      officialVerify
    );

    expect(officialVerify).not.toHaveBeenCalled();
    expect(result.antiGhostVerification.verificationPassed).toBe(true);
  });

  it('引用帶罪名括號時會剝除括號後比對條號', async () => {
    const officialVerify = vi.fn(async () => ({
      evidence: [{
        citation: '民事訴訟法第249條',
        type: 'STATUTE',
        status: 'VERIFIED',
        source: '全國法規資料庫',
        sourceUrl: 'https://law.moj.gov.tw/',
        checkedAt: '2026-09-26T00:00:00.000Z'
      }]
    }));

    const result = await verifyGeneratedDocumentWithOfficialSources(
      '依民事訴訟法第249條（訴之變更）規定。',
      { allowedCitations: [], strictAllowedOnly: true },
      officialVerify
    );

    // 括號內是罪名說明而非條號，剝除後應與官方條號相符
    const item = result.antiGhostVerification.verifiedCitations.find(c => c.citationText.includes('249'));
    expect(item?.verified).toBe(true);
  });

  it('項次不同不得視為同一條文', async () => {
    const officialVerify = vi.fn(async () => ({
      evidence: [{
        citation: '民事訴訟法第249條',
        type: 'STATUTE',
        status: 'VERIFIED',
        source: '全國法規資料庫',
        sourceUrl: 'https://law.moj.gov.tw/',
        checkedAt: '2026-09-26T00:00:00.000Z'
      }]
    }));

    const result = await verifyGeneratedDocumentWithOfficialSources(
      localOnlyText,
      { allowedCitations: [], strictAllowedOnly: true },
      officialVerify
    );

    // 官方只確認第249條本項，文件引用第249條第2項仍不得升級
    const item = result.antiGhostVerification.verifiedCitations.find(c => c.citationText.includes('249'));
    expect(item?.verified).toBe(false);
  });
});
