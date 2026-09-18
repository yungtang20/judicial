/**
 * Official Templates route tests — auth, fail-closed verification, and category listing
 */
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import officialTemplatesRouter from './officialTemplates.js';

process.env.NODE_ENV = 'test';
process.env.REQUIRE_AUTH = 'false';

describe('Official Templates API routes', () => {
  const app = express();
  app.use(express.json());
  app.use(officialTemplatesRouter);

  it('returns manifest metadata with null verifiedOn', async () => {
    const res = await request(app).get('/api/official-templates');
    expect(res.status).toBe(200);
    expect(res.body.verifiedOn).toBeNull();
    expect(res.body.totalTemplates).toBeGreaterThanOrEqual(600);
    expect(Array.isArray(res.body.categories)).toBe(true);
  });

  it('exposes render as authenticated route', async () => {
    const res = await request(app).post('/api/official-templates/judicial-0202-1/render').send({ fields: {} });
    expect([401, 403]).toContain(res.status);
  });

  it('returns 404 for unknown template id on detail', async () => {
    const res = await request(app).get('/api/official-templates/forged-id');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('TEMPLATE_NOT_FOUND');
  });

  it('rejects render when body has no fields object', async () => {
    const res = await request(app)
      .post('/api/official-templates/judicial-0202-1/render')
      .set('X-API-Key', process.env.API_KEY || 'test-key')
      .send({});
    expect([401, 403, 422]).toContain(res.status);
  });
});
