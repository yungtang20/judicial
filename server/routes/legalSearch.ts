import { Router, Request, Response } from 'express';
import { searchLegalSources } from '../../src/lib/twLegalRagClient.js';
import { precheckLegalInput } from '../../src/lib/legalInputPrecheck.js';

const router = Router();

/**
 * 法律檢索端點。
 *
 * 實作說明：此功能原先以 `/api/legal-search` 提交，但當時一併把
 * `src/lib/twLegalRagClient.ts` 覆蓋成壓縮後的單行 bundle，導致所有具名型別
 * （`LegalSearchSources`、`LegalSourceItem`、`LegalPromptContext`）消失而無法建置。
 * 此處改以完整的原始模組重新實作，維持相同的請求／回應契約。
 */
router.post('/api/legal-search', async (req: Request, res: Response) => {
  const { query } = req.body as { query?: unknown };
  if (typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: '請提供法律檢索問題。' });
  }

  // 與其他端點一致：先做輸入預檢，避免把明顯無效的查詢送到外部法源。
  const precheck = precheckLegalInput(query.trim());
  if (precheck.status === 'reject') {
    return res.status(400).json({
      error: precheck.issues[0]?.message || '查詢內容不符合檢索條件。',
      code: 'LEGAL_INPUT_REJECTED'
    });
  }

  // 檢索失敗時一律回傳 enabled:false 的空結果（fail-closed），
  // 不得以空結果冒充「查無此資料」。
  return res.json(await searchLegalSources(query.trim()));
});

export default router;
