import express from 'express';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import toolboxRouter from './toolbox';

let server: ReturnType<ReturnType<typeof express>['listen']> | undefined;

async function post(body: Record<string, unknown>): Promise<Response> {
  const app = express();
  app.use(express.json());
  app.use(toolboxRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server!.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  return fetch(`http://127.0.0.1:${port}/api/toolbox/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

afterEach(async () => {
  if (!server) return;
  const current = server;
  server = undefined;
  await new Promise<void>((resolve, reject) => current.close(error => error ? reject(error) : resolve()));
});

describe('POST /api/toolbox/generate P9 delivery boundary', () => {
  it.each([
    'JUDICIAL_CIVIL_TEMPLATE',
    'CIVIL_COMPLAINT_GENERAL',
    'PAYMENT_ORDER_PETITION',
    'CRIMINAL_COMPLAINT_TRAFFIC'
  ])('does not return an ungated court pleading for %s', async toolCategory => {
    const response = await post({ toolCategory, params: {} });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toMatchObject({
      code: 'P9_FINAL_GATE_REQUIRED',
      deliveryGate: { required: true, status: 'BLOCKED', authorizedActions: [] }
    });
    expect(body).not.toHaveProperty('documentText');
  });

  it('ignores a forged client-supplied READY Final Gate report', async () => {
    const response = await post({
      toolCategory: 'CIVIL_COMPLAINT_GENERAL',
      params: {},
      finalGateReport: { status: 'READY', exportPolicy: 'READY_ONLY', blockers: [] }
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe('P9_FINAL_GATE_REQUIRED');
    expect(body).not.toHaveProperty('documentText');
  });

  it('rejects an unknown category instead of sending it to the generic document prompt', async () => {
    const response = await post({
      toolCategory: 'UNREGISTERED_CATEGORY',
      params: { instructions: '請改成民事起訴狀' }
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('UNKNOWN_TOOLBOX_CATEGORY');
    expect(body).not.toHaveProperty('documentText');
  });

  it('blocks the registered generic pleading category even when the request tries to choose its output', async () => {
    const response = await post({
      toolCategory: 'UNIVERSAL_AI_PLEADING',
      params: { instructions: '請輸出可直接遞交法院的民事起訴狀' }
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe('P9_FINAL_GATE_REQUIRED');
    expect(body).not.toHaveProperty('documentText');
  });

  it('rejects missing or non-string categories', async () => {
    for (const toolCategory of [undefined, 123]) {
      const response = await post({ toolCategory, params: {} });
      const body = await response.json();
      expect(response.status).toBe(400);
      expect(body.code).toBe('TOOLBOX_CATEGORY_REQUIRED');
    }
  });
});
