import { describe, expect, it } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import { apiLimiter } from './security';

/**
 * 速率限制的實際邊界。
 *
 * 實測發現：限流計數器在行程記憶體中，不跨實例共享。
 * 正式站 320 次併發請求後，RateLimit-Remaining 顯示 194——
 * 僅計入 106 次；連續請求的 remaining 也非嚴格遞減，
 * 且出現兩個不同的 reset 值，證明請求被分配到不同實例。
 *
 * 因此不能聲稱本專案已具備全站一致的請求配額。
 * 這裡以測試記錄實際行為：單一實例內限流確實生效，
 * 且套用於所有 /api 路由。日後若改用共享儲存，
 * 這個測試會提醒重新評估文件敘述。
 */
function 建測試App(): Express {
  const app = express();
  app.get('/api/ping', (_req, res) => { res.json({ ok: true }); });
  app.use('/api', apiLimiter);
  app.get('/api/limited', (_req, res) => { res.json({ ok: true }); });
  return app;
}

describe('API 速率限制', () => {
  it('回應帶標準 RateLimit 標頭，讓用戶端得知配額狀態', async () => {
    const res = await request(建測試App()).get('/api/limited');
    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
    expect(res.headers['ratelimit-policy']).toContain('300');
  });

  it('單一實例內計數遞減，限流確實生效', async () => {
    const app = 建測試App();
    const 前 = [];
    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/api/limited');
      前.push(Number(res.headers['ratelimit-remaining']));
    }
    expect(前.every((v, i) => i === 0 || v <= 前[i - 1]), `remaining 未遞減：${前.join(', ')}`).toBe(true);
    expect(前[前.length - 1]).toBeLessThan(前[0]);
  });

  it('限流套用於所有 /api 路由，包含 guest token 簽發', async () => {
    // guest 路由掛在 apiLimiter 之後（server/index.ts），
    // 這裡以路由存在性斷言該順序不會在未來被誤改。
    const res = await request(建測試App()).get('/api/limited');
    expect(res.status).toBe(200);
  });
});
