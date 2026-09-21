import { Router, Request, Response } from 'express';
import { defaultAIProvider } from '../../src/ai/providers/providerRegistry.js';
import { refineVerifiedDraft } from '../../src/lib/generation/draftRefiner.js';

const router = Router();

router.post('/api/draft-refine', async (req: Request, res: Response) => {
  const { draftText, instruction, allowedCitations } = req.body || {};
  if (typeof draftText !== 'string' || !draftText.trim() || typeof instruction !== 'string' || !instruction.trim() || !Array.isArray(allowedCitations)) {
    return res.status(400).json({ code: 'INVALID_INPUT', error: 'draftText、instruction 與 allowedCitations 為必要欄位' });
  }
  try {
    const result = await refineVerifiedDraft(draftText.slice(0, 50000), instruction.slice(0, 4000), allowedCitations.filter((item: unknown): item is string => typeof item === 'string').slice(0, 200), async prompt => {
      const generated = await defaultAIProvider.generate(prompt, { temperature: 0.2 });
      return generated.text;
    });
    return res.json({ success: true, draftText: result.documentText, antiGhostVerification: result.antiGhostVerification });
  } catch (error: any) {
    return res.status(422).json({ code: error?.message?.startsWith('GHOST_CITATION_BLOCKED') ? 'GHOST_CITATION_BLOCKED' : 'DRAFT_REFINE_BLOCKED', error: error?.message || '草稿微調未通過引用檢核' });
  }
});

export default router;
