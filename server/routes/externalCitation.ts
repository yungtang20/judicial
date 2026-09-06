import { Router, Request, Response } from 'express';
import { verifyExternalPrecedents } from '../../src/lib/externalCitationVerifier.js';

const router = Router();
const MAX_CITATIONS_COUNT = 50;
const MAX_CITATION_LENGTH = 100;

/**
 * 簡易驗證裁判字號字串是否符合常規格式
 * (排除危險控制字元與過短/過長異常輸入)
 */
function isValidCitationFormat(citation: string): boolean {
  if (citation.length < 3 || citation.length > MAX_CITATION_LENGTH) {
    return false;
  }
  // 不得包含 ASCII 控制字元或特定惡意字元
  if (/[\x00-\x1F\x7F<>{}$`\\]/.test(citation)) {
    return false;
  }
  return true;
}

/** Optional, user-consented cross-check for external precedent documents. */
router.post('/api/external-citations/verify', async (req: Request, res: Response) => {
  const requestId = req.id || (req.headers['x-request-id'] as string) || `req_${Date.now()}`;

  try {
    const { citations, consent } = req.body as { citations?: unknown; consent?: unknown };

    if (consent !== true) {
      return res.status(400).json({
        code: 'CONSENT_REQUIRED',
        error: '外部查詢需要使用者明確同意。',
        message: '外部查詢需要使用者明確同意。',
        requestId,
      });
    }

    if (!Array.isArray(citations) || citations.length === 0) {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        error: '請提供裁判字號陣列。',
        message: '請提供裁判字號陣列。',
        requestId,
      });
    }

    if (citations.length > MAX_CITATIONS_COUNT) {
      return res.status(400).json({
        code: 'LIMIT_EXCEEDED',
        error: `單次查詢裁判字號最多 ${MAX_CITATIONS_COUNT} 筆。`,
        message: `單次查詢裁判字號最多 ${MAX_CITATIONS_COUNT} 筆。`,
        requestId,
      });
    }

    // 清洗、修剪並去重
    const sanitizedSet = new Set<string>();
    for (let i = 0; i < citations.length; i++) {
      const item = citations[i];
      if (typeof item !== 'string') {
        return res.status(400).json({
          code: 'INVALID_INPUT',
          error: `第 ${i + 1} 筆裁判字號格式錯誤，必須為字串。`,
          message: `第 ${i + 1} 筆裁判字號格式錯誤，必須為字串。`,
          requestId,
        });
      }

      const trimmed = item.trim();
      if (!trimmed) {
        continue;
      }

      if (!isValidCitationFormat(trimmed)) {
        return res.status(400).json({
          code: 'INVALID_CITATION_FORMAT',
          error: `第 ${i + 1} 筆裁判字號格式不合法或含有無效字元。`,
          message: `第 ${i + 1} 筆裁判字號格式不合法或含有無效字元。`,
          requestId,
        });
      }

      sanitizedSet.add(trimmed);
    }

    const uniqueCitations = Array.from(sanitizedSet);
    if (uniqueCitations.length === 0) {
      return res.status(400).json({
        code: 'INVALID_INPUT',
        error: '有效裁判字號清單不可為空。',
        message: '有效裁判字號清單不可為空。',
        requestId,
      });
    }

    const results = await verifyExternalPrecedents(uniqueCitations);

    return res.json({
      source: 'dr-lawbot',
      disclaimer: '此為第三方存在性交叉檢查，不是官方核實，也不判斷裁判內容是否支持引用主張。',
      results,
      count: uniqueCitations.length,
      requestId,
    });
  } catch (error: any) {
    console.error(`[ExternalCitationRoute] [${requestId}] Error:`, error);
    return res.status(500).json({
      code: 'VERIFICATION_ERROR',
      error: '外部裁判核驗服務處理失敗',
      message: '外部裁判核驗服務處理失敗，請稍後重試',
      requestId,
    });
  }
});

export default router;
