import { Router, Request, Response } from 'express';
import { verifyExternalPrecedents } from '../../src/lib/externalCitationVerifier.js';

const router = Router();

/** Optional, user-consented cross-check for external precedent documents. */
router.post('/api/external-citations/verify', async (req: Request, res: Response) => {
  const { citations, consent } = req.body as { citations?: unknown; consent?: unknown };
  if (consent !== true) {
    return res.status(400).json({ error: '外部查詢需要使用者明確同意。' });
  }
  if (!Array.isArray(citations) || citations.length === 0 || !citations.every((citation) => typeof citation === 'string')) {
    return res.status(400).json({ error: '請提供裁判字號陣列。' });
  }
  const results = await verifyExternalPrecedents(citations as string[]);
  return res.json({ source: 'dr-lawbot', disclaimer: '此為第三方存在性交叉檢查，不是官方核實，也不判斷裁判內容是否支持引用主張。', results });
});

export default router;

