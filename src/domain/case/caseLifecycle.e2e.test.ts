import { describe, expect, it } from 'vitest';
import { generateVerifiedDocument } from '../../lib/generatedDocumentPipeline';
import { canTransitionCase } from './workflow';
import { createServer } from 'node:http';
import { createExpressApp } from '../../../server/index';

describe('case lifecycle flow', () => {
  it('runs ingest through verified document generation and human gate prerequisites', async () => {
    const stages = ['INGEST', 'DEIDENTIFIED', 'TRIAGED', 'ANALYZED', 'RETRIEVED', 'DRAFTED', 'VERIFIED', 'HUMAN_APPROVED'] as const;
    stages.slice(0, -1).forEach((stage, index) => expect(canTransitionCase(stage, stages[index + 1])).toBe(true));
    const result = await generateVerifiedDocument(() => '依民法第184條第1項前段規定，請求損害賠償。');
    expect(result.antiGhostVerification.verificationPassed).toBe(true);
    expect(result.documentText).toContain('民法第184條');
  });

  it('rejects an unread TLR citation at the real appeal and toolbox routes', async () => {
    const server = createServer(createExpressApp());
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const unread = { id: 'j1', type: '裁判', citation: '最高法院112年度台上字第9號', summary: '', applicationReason: '', selected: true, sourceProvider: 'tw-legal-rag', sourceStatus: 'RETRIEVED_UNREAD', sourceId: 'j1' };
    const post = (path: string, body: unknown) => fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    try {
      const appeal = await post('/api/generate-appeal-petition', { selectedPrecedents: [unread] });
      const toolbox = await post('/api/toolbox/generate', { toolId: 'CIVIL_TORT_GENERAL', params: { selectedPrecedents: [unread] } });
      expect(appeal.status).toBe(422);
      expect((await appeal.json()).code).toBe('CITATION_FULLTEXT_REQUIRED');
      expect(toolbox.status).toBe(422);
      expect((await toolbox.json()).code).toBe('CITATION_FULLTEXT_REQUIRED');
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
