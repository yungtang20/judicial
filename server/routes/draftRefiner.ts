import { Router, Request, Response } from 'express';
import { defaultAIProvider } from '../../src/ai/providers/providerRegistry.js';
import { refineVerifiedDraft } from '../../src/lib/generation/draftRefiner.js';
import { verifyOfficialCitations } from '../services/officialCitationVerification.js';
import { GhostCitationError } from '../../src/lib/generation/ghostCitationInterceptor.js';

const router = Router();

router.post('/api/draft-refine', async (req: Request, res: Response) => {
  const { draftText, instruction, allowedCitations } = req.body || {};
  if (typeof draftText !== 'string' || !draftText.trim() || typeof instruction !== 'string' || !instruction.trim() || !Array.isArray(allowedCitations)) {
    return res.status(400).json({ code: 'INVALID_INPUT', error: 'draftText、instruction 與 allowedCitations 為必要欄位' });
  }
  try {
    const result = await refineVerifiedDraft(
      draftText.slice(0, 50000),
      instruction.slice(0, 4000),
      allowedCitations.filter((item: unknown): item is string => typeof item === 'string').slice(0, 200),
      async prompt => {
        const generated = await defaultAIProvider.generate(prompt, { temperature: 0.2 });
        return generated.text;
      },
      // 本機法規種子僅 24 條，未收錄的真實條文一律判為未驗證而擋下；
      // 補上全國法規資料庫即時查核，官方查不到時仍維持 fail-closed。
      inputs => verifyOfficialCitations(inputs)
    );
    return res.json({ success: true, draftText: result.documentText, antiGhostVerification: result.antiGhostVerification });
  } catch (error: any) {
    // 依錯誤物件上的 code 判斷，不從訊息字串推測（訊息已改為使用者可讀文字）。
    const isCitationBlock = error instanceof GhostCitationError
      || error?.name === 'GhostCitationError';
    return res.status(422).json({
      code: isCitationBlock ? 'GHOST_CITATION_BLOCKED' : 'DRAFT_REFINE_BLOCKED',
      error: error?.message || '草稿微調未通過引用檢核'
    });
  }
});

export default router;
