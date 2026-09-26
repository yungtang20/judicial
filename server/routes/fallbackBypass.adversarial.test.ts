import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createServer } from 'node:http';
import { createExpressApp } from '../index.js';
import { defaultAIProvider } from '../../src/ai/providers/providerRegistry.js';
import { defaultLegalRetrievalService } from '../services/legalGenerationPipeline.js';
import { verifyGeneratedDocument } from '../../src/lib/generatedDocumentPipeline.js';

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
  describe('Route Level Enforcement: /api/generate-appeal-petition & /api/defense/generate-pleading', () => {
    it('Case A: appeal route fails closed until P9 canonical delivery is wired', async () => {
      const server = createServer(createExpressApp());
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('test server did not bind');
      const baseUrl = `http://127.0.0.1:${address.port}`;

      // Mock AI to return a valid document with legal citation
      vi.spyOn(defaultAIProvider, 'generate').mockResolvedValue({
        text: '民事上訴理由狀。按民法第184條第1項前段規定，原審判決違背法令。上訴人請求廢棄原判決。'
      });

      try {
        const res = await fetch(`${baseUrl}/api/generate-appeal-petition`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            caseNo: '113年度上字第123號',
            claims: '原判決廢棄，應適用民法第184條第1項',
          })
        });

        expect(res.status).toBe(409);
        expect((await res.json()).code).toBe('P9_FINAL_GATE_REQUIRED');
      } finally {
        await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
      }
    });

    it('Case B, C, E: appeal route cannot fall back to an ungated pleading', async () => {
      const server = createServer(createExpressApp());
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('test server did not bind');
      const baseUrl = `http://127.0.0.1:${address.port}`;

      // Mock AI provider failure
      vi.spyOn(defaultAIProvider, 'generate').mockRejectedValue(new Error('AI 上游網路逾時中斷'));

      try {
        const res = await fetch(`${baseUrl}/api/generate-appeal-petition`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            caseNo: '113年度上字第123號',
            claims: '原判決不利部分廢棄',
            judgmentSummary: '原審判決未憑證據認定'
          })
        });

        // The fallback document must NOT bypass citation check with documentText: ""
        // It must either pass full citation verification on fallback text, or fail-closed (422)
        expect(res.status).toBe(409);
        expect((await res.json()).code).toBe('P9_FINAL_GATE_REQUIRED');
      } finally {
        await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
      }
    });

    it('Defense Case: defense route fails closed until P9 canonical delivery is wired', async () => {
      const server = createServer(createExpressApp());
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('test server did not bind');
      const baseUrl = `http://127.0.0.1:${address.port}`;

      vi.spyOn(defaultAIProvider, 'generate').mockRejectedValue(new Error('Gemini quota exceeded'));

      try {
        const res = await fetch(`${baseUrl}/api/defense/generate-pleading`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            pleadingType: 'CLIENT_PERSONAL_REPORT',
            clientInput: '我向對造說明並無借貸合意',
            caseInfo: {
              caseType: 'CIVIL',
              courtName: '臺灣臺北地方法院',
              caseNo: '113年度訴字第100號',
              clientRole: '被告',
              clientName: '陳大明',
              opponentRole: '原告',
              opponentName: '李小美'
            }
          })
        });

        expect(res.status).toBe(409);
        expect((await res.json()).code).toBe('P9_FINAL_GATE_REQUIRED');
      } finally {
        await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
      }
    });
  });
});
