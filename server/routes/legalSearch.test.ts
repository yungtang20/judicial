import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../index.js';
import { createSignedToken } from '../middleware/auth.js';

describe('POST /api/legal-search', () => {
  const app = createExpressApp();
  const auth = `Bearer ${createSignedToken({ sub: 'search-test', tenantId: 'search-tenant', role: 'client' })}`;

  beforeAll(() => {
    // 確保測試環境不依賴外部法源，避免網路狀態影響斷言。
    delete process.env.TLR_ENABLED;
  });

  it('拒絕缺少或非字串的查詢', async () => {
    for (const body of [{}, { query: '' }, { query: '   ' }, { query: 123 }, { query: null }, { query: [] }]) {
      const response = await request(app).post('/api/legal-search').set('Authorization', auth).send(body);
      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    }
  });

  it('未啟用外部法源時回傳明確的停用狀態，不得偽裝成已檢索', async () => {
    const response = await request(app)
      .post('/api/legal-search')
      .set('Authorization', auth)
      .send({ query: '租賃押金爭議' });

    expect(response.status).toBe(200);
    expect(response.body.enabled).toBe(false);
    expect(response.body.provider).toBe('unavailable');
    expect(response.body.statutes).toEqual([]);
    expect(response.body.judgments).toEqual([]);
    expect(response.body.references).toEqual([]);
    expect(response.body.allowedCitations).toEqual([]);
    expect(String(response.body.disclaimer)).toContain('不代表法源不存在');
  });

  it('驗證閘門須與環境設定一致，不得出現無驗證即可檢索的狀態', async () => {
    const authRequired = process.env.NODE_ENV === 'production' || process.env.REQUIRE_AUTH === 'true';
    const response = await request(app).post('/api/legal-search').send({ query: '租賃押金爭議' });
    if (authRequired) {
      expect(response.status).toBe(401);
    } else {
      // 開發／測試環境未強制驗證，但仍必須走同一條 fail-closed 的停用回應路徑
      expect(response.status).toBe(200);
      expect(response.body.enabled).toBe(false);
    }
  });
});
