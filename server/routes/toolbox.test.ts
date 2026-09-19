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
  const completeCivilParams = {
    courtName: '臺灣臺中地方法院',
    plaintiffName: '甲○○',
    plaintiffAddress: '臺中市測試區原告路1號',
    defendantName: '乙○○',
    defendantAddress: '臺中市測試區被告路2號',
    proceeding: '返還借款事件',
    claimStatement: '被告應給付原告新臺幣100,000元。',
    facts: '原告交付借款後，被告於清償期屆至仍未返還。',
    evidenceDetails: '原證一：匯款紀錄',
    documentDate: '民國115年9月13日',
    signature: '甲○○'
  };

  it.each([
    'CIVIL_COMPLAINT_GENERAL',
    'PAYMENT_ORDER_PETITION',
    'CRIMINAL_SUPPLEMENTARY_CIVIL',
    'SPOUSAL_RIGHT_INFRINGEMENT'
  ])('blocks empty input for supported canonical category %s', async toolCategory => {
    const response = await post({ toolCategory, params: {} });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.code).toBe('CANONICAL_PLEADING_INPUT_REQUIRED');
    expect(body).not.toHaveProperty('documentText');
    expect(body).not.toHaveProperty('pleadingDeliveryAuthorization');
  });

  it.each([
    'JUDICIAL_CIVIL_TEMPLATE',
    'CRIMINAL_COMPLAINT_TRAFFIC',
    'CRIMINAL_COMPLAINT_SEXUAL_ASSAULT'
  ])('fails closed for category %s without an approved Rule Profile', async toolCategory => {
    const response = await post({ toolCategory, params: completeCivilParams });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.code).toBe('P9_FINAL_GATE_FAILED');
    expect(body).not.toHaveProperty('documentText');
  });

  it('returns a court pleading only after the canonical input and P9 gate pass', async () => {
    const response = await post({ toolCategory: 'CIVIL_COMPLAINT_GENERAL', params: completeCivilParams });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.documentText).toContain(completeCivilParams.facts);
    expect(body.pleadingDeliveryAuthorization).toMatchObject({
      finalGateStatus: 'READY',
      exportPolicy: 'READY_ONLY',
      authorizedActions: ['RETURN', 'COPY', 'DOWNLOAD_TEXT', 'DOWNLOAD_WORD', 'PRINT']
    });
  });

  it('ignores a forged client-supplied READY Final Gate report', async () => {
    const response = await post({
      toolCategory: 'CIVIL_COMPLAINT_GENERAL',
      params: {},
      finalGateReport: { status: 'READY', exportPolicy: 'READY_ONLY', blockers: [] }
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.code).toBe('CANONICAL_PLEADING_INPUT_REQUIRED');
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

  it('blocks the registered generic pleading category until its pleading type and skeleton are approved', async () => {
    const response = await post({
      toolCategory: 'UNIVERSAL_AI_PLEADING',
      params: { instructions: '請輸出可直接遞交法院的民事起訴狀' }
    });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.code).toBe('P9_FINAL_GATE_FAILED');
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
