import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../index.js';
import { createSignedToken } from '../middleware/auth.js';

describe('法院書狀交付閘門（未核准結構）', () => {
  const app = createExpressApp();
  const auth = `Bearer ${createSignedToken({ sub: 'gate-test', tenantId: 'gate-tenant', role: 'client' })}`;

  beforeAll(() => {
    // 測試不得依賴外部法源
    delete process.env.TLR_ENABLED;
  });

  const endpoints = [
    { path: '/api/generate-appeal-petition', label: '上訴理由狀' },
    { path: '/api/defense/generate-pleading', label: '答辯狀' }
  ];

  for (const { path, label } of endpoints) {
    it(`${label} 必須 fail-closed，且回應要說明原因與替代做法`, async () => {
      const response = await request(app)
        .post(path)
        .set('Authorization', auth)
        .send({ clientInput: '被告於 112 年 1 月 1 日向原告借款 50 萬元，約定 112 年 6 月 1 日償還。', caseType: 'CIVIL', issues: [] });

      expect(response.status).toBe(409);
      // 契約代碼維持不變，仍是共用的交付閘門詞彙
      expect(response.body.code).toBe('P9_FINAL_GATE_REQUIRED');
      // 訊息不得只丟內部術語，必須讓使用者知道為什麼以及下一步
      expect(response.body.error).toContain('尚未開放');
      expect(response.body.error).not.toMatch(/hasPendingClaimSupport|generationPath|canonical/i);
      expect(response.body.detail?.reason).toBe('CANONICAL_STRUCTURE_NOT_APPROVED');
      expect(response.body.detail?.guidance).toBeTruthy();
      // 絕對不得回傳任何書狀本文
      expect(response.body.documentText).toBeUndefined();
      expect(response.body.petitionText).toBeUndefined();
    });
  }

  it('驗證閘門必須與環境設定一致，不得出現未驗證即可觸達交付路徑的狀態', async () => {
    const authRequired = process.env.NODE_ENV === 'production' || process.env.REQUIRE_AUTH === 'true';
    const response = await request(app)
      .post('/api/generate-appeal-petition')
      .send({ clientInput: '測試', caseType: 'CIVIL' });

    if (authRequired) {
      expect(response.status).toBe(401);
    } else {
      // 開發／測試環境未強制驗證，但仍必須擋在交付閘門之外
      expect(response.status).toBe(409);
      expect(response.body.code).toBe('P9_FINAL_GATE_REQUIRED');
    }
  });
});
