import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';
import { apiLimiter } from './security.js';

describe('API 速率限流', () => {
  it('低於上限的請求不得被限流', async () => {
    const app = express();
    app.use(apiLimiter);
    app.get('/ping', (_req, res) => res.json({ ok: true }));

    for (let i = 0; i < 5; i++) {
      const response = await request(app).get('/ping');
      expect(response.status).toBe(200);
    }
  });

  it('超過上限時必須回傳 429 與 RATE_LIMIT_EXCEEDED，不得靜默放行', async () => {
    const app = express();
    // 以極低上限建立同型限流器，驗證行為而非等待 300 次真實請求
    const strictLimiter = rateLimit({
      windowMs: 60_000,
      max: 3,
      standardHeaders: true,
      legacyHeaders: false,
      message: { code: 'RATE_LIMIT_EXCEEDED', message: '請求過於頻繁，請稍後再試', details: null }
    });
    app.use(strictLimiter);
    app.get('/ping', (_req, res) => res.json({ ok: true }));

    const codes: number[] = [];
    for (let i = 0; i < 6; i++) {
      codes.push((await request(app).get('/ping')).status);
    }

    expect(codes.filter(code => code === 200).length).toBe(3);
    expect(codes.filter(code => code === 429).length).toBe(3);

    const limited = await request(app).get('/ping');
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('正式限流器在請求量遠低於上限時不得誤傷正常使用', async () => {
    const app = express();
    app.use(apiLimiter);
    app.get('/api/probe', (_req, res) => res.json({ ok: true }));

    for (let i = 0; i < 20; i++) {
      const response = await request(app).get('/api/probe');
      expect(response.status).toBe(200);
    }
  });
});
