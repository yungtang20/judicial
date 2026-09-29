import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { noStoreForApi } from './security';

/**
 * API 回應必須禁止中介層快取。
 *
 * 實測缺陷：Cache-Control 原本由各路由手動設定。
 * /api/toolbox/generate 與 /api/official-templates 有設定，
 * 但 /api/agent-chat 與 /api/health 沒有。
 *
 * agent-chat 的回應包含使用者輸入的身分證字號、手機號碼與整份法律分析。
 * 未禁止快取時，CDN 或中介代理可能把含有個資的內容留存並回應給他人——
 * 這在訪客模式（無帳號隔離）下尤其危險。
 *
 * 改為在中介軟體層統一設定，新路由不會因為忘記而洩漏。
 */
function 建App(): Express {
  const app = express();
  // 與 server/index.ts 相同：中介軟體在路由之前掛載。
  // 掛在路由之後的話，回應在中介軟體執行前就送出了，標頭不會生效。
  app.use(noStoreForApi);
  app.get('/api/health', (_req, res) => { res.json({ ok: true }); });
  app.post('/api/agent-chat', (_req, res) => { res.json({ reply: '含個資的法律分析' }); });
  app.get('/api/toolbox/generate', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=600'); // 個別路由刻意覆寫
    res.json({ ok: true });
  });
  app.get('/assets/app.js', (_req, res) => { res.type('js').send('x'); });
  return app;
}

describe('API 回應的快取與權限標頭', () => {
  it('未個別設定的 API 端點一律 no-store', async () => {
    const res = await request(建App()).post('/api/agent-chat');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('健康檢查同樣不得被快取', async () => {
    const res = await request(建App()).get('/api/health');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('個別路由仍可覆寫（靜態資源或公開資料需要自己的策略）', async () => {
    const res = await request(建App()).get('/api/toolbox/generate');
    expect(res.headers['cache-control']).toBe('public, max-age=600');
  });

  it('非 API 路徑不強制 no-store（靜態資源應可快取）', async () => {
    const res = await request(建App()).get('/assets/app.js');
    expect(res.headers['cache-control']).toBeUndefined();
  });

  it('回應帶有 Permissions-Policy，明確關閉不需要的瀏覽器能力', async () => {
    // helmet 不預設提供此標頭。法律工具不需要攝影機、
    // 麥克風或定位，開著只增加暴露面。
    const res = await request(建App()).get('/api/health');
    const v = res.headers['permissions-policy'];
    expect(v).toBeTruthy();
    expect(v).toContain('camera=()');
    expect(v).toContain('microphone=()');
    expect(v).toContain('geolocation=()');
  });
});
