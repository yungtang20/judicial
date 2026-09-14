import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createServer } from 'node:http';
import { createExpressApp } from '../index.js';
import { defaultAIProvider } from '../../src/ai/providers/providerRegistry.js';
import { verifyGeneratedDocument } from '../../src/lib/generatedDocumentPipeline.js';

async function post(path: string, body: unknown) {
  const server = createServer(createExpressApp());
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not bind');
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() as Record<string, any> };
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

describe('AUDIT-P0-001: Fallback PASS Bypass & Empty Document Hard Enforcement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Direct Unit Verification: verifyGeneratedDocument Fail-Closed Rules', () => {
    it('Case C: rejects empty string (documentText = "") and throws Fail-Closed error', () => {
      expect(() => verifyGeneratedDocument('')).toThrow('法律文件生成結果為空，拒絕回傳未檢核文件');
    });

    it('Case F: rejects whitespace only document ("   \\n\\t  ")', () => {
      expect(() => verifyGeneratedDocument('   \n\t  ')).toThrow('法律文件生成結果為空，拒絕回傳未檢核文件');
    });

    it('Case G: rejects null / undefined / missing documentText', () => {
      expect(() => verifyGeneratedDocument(undefined as any)).toThrow();
      expect(() => verifyGeneratedDocument(null as any)).toThrow();
    });

    it('Case D & E: verifiedCitations cannot be falsified when citations are invalid or ghost', () => {
      const ghostDoc = '民事上訴狀。原審判決認事用法違反最高法院999年度台上字第99999號判決。';
      const result = verifyGeneratedDocument(ghostDoc, {
        allowedCitations: ['最高法院112年度台上字第9號']
      });
      expect(result.antiGhostVerification.verificationPassed).toBe(false);
      expect(result.antiGhostVerification.ghostCitationsFound).toBeGreaterThan(0);
      expect(result.antiGhostVerification.verifiedCitations.every(c => c.verified)).toBe(false);
    });

  });
  describe('Route Level Enforcement: court pleadings require canonical P9 authorization', () => {
    it.each([
      ['/api/generate-appeal-petition', { caseNo: '113年度上字第123號', claims: '原判決廢棄' }, 'PLEADING_DISCRIMINATOR_REQUIRED'],
      ['/api/defense/generate-pleading', { pleadingType: 'CLIENT_PERSONAL_REPORT', clientInput: '我否認借貸合意' }, 'P9_FINAL_GATE_REQUIRED']
    ])('blocks %s without an approved Rule Profile and P9 Final Gate', async (path, body, code) => {
      const server = createServer(createExpressApp());
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('test server did not bind');

      try {
        const res = await fetch(`http://127.0.0.1:${address.port}${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body)
        });
        expect(res.status).toBe(422);
        await expect(res.json()).resolves.toMatchObject({ code });
        expect(defaultAIProvider.generate).not.toHaveBeenCalled();
      } finally {
        await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
      }
    });

    it('returns a civil second appeal only after the canonical P9 gate is READY', async () => {
      const result = await post('/api/generate-appeal-petition', {
        caseType: 'civil',
        appealLevel: 'SECOND',
        courtName: '臺灣臺中地方法院',
        proceeding: '返還借款事件',
        appellantName: '甲○○',
        appellantAddress: '臺中市測試區原告路1號',
        appelleeName: '乙○○',
        appelleeAddress: '臺中市測試區被告路2號',
        appealDisposition: '原判決廢棄並改判。',
        facts: '原判決認定與卷內匯款資料不符。',
        evidenceList: '上證一：匯款紀錄',
        challengedJudgment: '臺灣臺中地方法院115年度訴字第1號判決，依法提起上訴。',
        appealReasons: '原判決認定事實與卷內資料不符。',
        appealSupportingFactsAndEvidence: '上證一可證明匯款性質。',
        documentDate: '民國115年9月14日',
        signature: '甲○○'
      });

      expect(result.status).toBe(200);
      expect(result.body.petitionText).toContain('原判決認定事實與卷內資料不符。');
      expect(result.body.pleadingDeliveryAuthorization).toMatchObject({ finalGateStatus: 'READY' });
      expect(defaultAIProvider.generate).not.toHaveBeenCalled();
    });

    it('returns a civil answer only after the canonical P9 gate is READY', async () => {
      const result = await post('/api/defense/generate-pleading', {
        pleadingType: 'LAWYER_PLEADING',
        clientInput: '被告否認借款契約成立。',
        answerDisposition: '原告之訴駁回。',
        opponentPosition: '否認原告所稱借款交付，匯款用途另有原因。',
        evidenceList: '被證一：往來紀錄',
        attachments: '被證一影本',
        documentaryEvidenceCopies: '被證一影本一份。',
        directNotice: '書證影本將依法直接通知原告。',
        documentDate: '民國115年9月14日',
        signature: '乙○○',
        caseInfo: {
          caseType: 'civil',
          courtName: '臺灣臺中地方法院',
          proceeding: '返還借款事件',
          clientName: '乙○○',
          clientAddress: '臺中市測試區被告路2號',
          opponentName: '甲○○',
          opponentAddress: '臺中市測試區原告路1號'
        }
      });

      expect(result.status).toBe(200);
      expect(result.body.pleadingText).toContain('被告否認借款契約成立。');
      expect(result.body.pleadingDeliveryAuthorization).toMatchObject({ finalGateStatus: 'READY' });
      expect(defaultAIProvider.generate).not.toHaveBeenCalled();
    });

    it('keeps a complete criminal appeal blocked while its official format profile is unverified', async () => {
      const result = await post('/api/generate-appeal-petition', {
        caseType: 'criminal',
        appealLevel: 'SECOND',
        courtName: '臺灣臺中地方法院',
        appealReasons: '原判決採證違反證據法則，理由詳列於本書狀。',
        copies: '繕本一份',
        documentDate: '民國115年9月14日',
        signature: '甲○○'
      });

      expect(result.status).toBe(422);
      expect(result.body.error).toContain('P6.FORMAT.RESULT');
      expect(defaultAIProvider.generate).not.toHaveBeenCalled();
    });

    it('blocks a civil third appeal without an explicit ground route', async () => {
      const result = await post('/api/generate-appeal-petition', {
        caseType: 'civil',
        appealLevel: 'THIRD'
      });

      expect(result.status).toBe(422);
      expect(result.body).toMatchObject({ code: 'PLEADING_DISCRIMINATOR_REQUIRED' });
      expect(defaultAIProvider.generate).not.toHaveBeenCalled();
    });
  });
});
