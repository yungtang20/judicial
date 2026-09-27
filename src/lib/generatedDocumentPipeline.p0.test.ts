import { describe, expect, it } from 'vitest';
import { generateVerifiedDocument } from './generatedDocumentPipeline';

describe('P0 ghost citation delivery boundary', () => {
  it('blocks a generated draft containing a non-whitelisted citation', async () => {
    await expect(generateVerifiedDocument(
      () => '草稿引用民法第999條。',
      () => ({
        sanitizedText: '草稿引用民法第999條。',
        totalChecked: 1,
        ghostCount: 1,
        results: [{ citationText: '民法第999條', verified: false, isGhostOrFake: true }] as any
      })
    )).rejects.toThrow(/法律文件引用檢核未通過/);
  });

  it('blocks when the verifier reports a ghost count inconsistent with its own results', async () => {
    // 攔截器只看 results 陣列；當驗證器自己回報 ghostCount > 0
    // 卻把 results 全部標成 verified（驗證器輸出不一致）時，
    // 只有管線自己的 verificationPassed 檢查能擋下來。
    await expect(generateVerifiedDocument(
      () => '草稿引用民法第185條。',
      () => ({
        sanitizedText: '草稿引用民法第185條。',
        totalChecked: 1,
        ghostCount: 1,
        results: [{ citationText: '民法第185條', verified: true, isGhostOrFake: false }] as never
      }) as never
    )).rejects.toThrow(/法律文件引用檢核未通過/);
  });

  it('blocks a simplified chinese document before it reaches the verifier', async () => {
    let 驗證器被呼叫 = false;
    await expect(generateVerifiedDocument(
      () => '这是简体中文的测试文件。',
      () => {
        驗證器被呼叫 = true;
        return {
          sanitizedText: '这是简体中文的测试文件。', totalChecked: 0, ghostCount: 0, results: []
        } as never;
      }
    )).rejects.toThrow();
    // 繁體檢查必須發生在引用驗證之前
    expect(驗證器被呼叫).toBe(false);
  });
});
