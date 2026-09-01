import { Router, Request, Response } from 'express';
import { searchLegalSources } from '../../src/lib/twLegalRagClient.js';

const router = Router();

router.post('/api/legal-search', async (req: Request, res: Response) => {
  const { query } = req.body as { query?: unknown };
  if (typeof query !== 'string' || !query.trim()) return res.status(400).json({ error: '請提供法律檢索問題。' });
  return res.json(await searchLegalSources(query));
});

export default router;

