import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { LegalRetrievalService } from './legalGenerationPipeline';

/**
 * 外部判例檢索不得成為書狀的引用授權來源。
 *
 * 背景：tw-legal-rag 提供 2,250 萬筆裁判書，開啟後分析品質明顯提升
 * （實測押金糾紛檢索到鳳簡字第281號、違約金檢索到橋小字第111號並引用民法第252條）。
 *
 * 但若把檢索結果當成 allowedCitations 回傳，產出驗證會開啟 strictAllowedOnly，
 * 書狀就只能引用本次檢索到的案號。實測會造成兩個問題：
 *   1. 驗證器的案號正則只認 4 種案由代號（訴、台上、上、重上…），
 *      TLR 實測回傳 22 種，其餘無法解析 → 引用被擋，
 *      使用者只看到「產製不出來」而不知原因。
 *   2. 驗證規則 numVal > 6000 會把真實的高號案號
 *      （如「北簡字第 7197 號」）判為幽靈。
 *
 * 因此這裡鎖住：判例進提示詞供模型參考，但引用授權維持空白，
 * 由既有的本機索引與官方法規查證規則決定。
 */
function 假檢索回應(允許清單: string[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      results: [
        {
          doc_id: 'TPHV,105,上易,913,20161010,1',
          citation_text: '臺灣高等法院 105 年度上易字第 913 號（民事）',
          snippet: '借貸契約成立，請求返還借款。',
          citation_url: 'https://example.test/x'
        }
      ],
      allowed_citations: 允許清單
    })
  } as unknown as Response;
}

describe('外部判例檢索與引用授權的分界', () => {
  let 服務: LegalRetrievalService;
  const 允許 = ['臺灣高等法院 105 年度上易字第 913 號（民事）'];

  beforeEach(() => {
    process.env.TLR_ENABLED = 'true';
    process.env.TLR_BASE_URL = 'https://tlr.example.test';
  });

  afterEach(() => {
    delete process.env.TLR_ENABLED;
    delete process.env.TLR_BASE_URL;
    vi.restoreAllMocks();
  });

  it('search 不得把檢索結果當成引用授權來源', async () => {
    const 假fetch = vi.fn().mockResolvedValue(假檢索回應(允許));
    服務 = new LegalRetrievalService(假fetch as never);
    const 結果 = await 服務.search('借貸契約 返還借款');
    // 檢索結果仍可用於分析
    expect(結果.judgments.length).toBeGreaterThan(0);
    // 但不得成為引用授權
    expect(結果.allowedCitations ?? []).toEqual([]);
  });

  it('retrieveContext 的引用授權維持空白，判例仍進入提示詞', async () => {
    const 假fetch = vi.fn().mockResolvedValue(假檢索回應(允許));
    服務 = new LegalRetrievalService(假fetch as never);
    const ctx = await 服務.retrieveContext('借貸契約 返還借款');
    expect(ctx.allowedCitations).toEqual([]);
    // 判例仍應出現在提示詞中供模型參考
    expect(ctx.promptBlock).toContain('上易字第 913 號');
  });

  it('狀態訊息須說明檢索結果僅供參考、引用需另行指定', async () => {
    // 使用者看到「已檢索實務裁判」但書狀裡沒有，會誤以為系統出錯。
    const 假fetch = vi.fn().mockResolvedValue(假檢索回應(允許));
    服務 = new LegalRetrievalService(假fetch as never);
    const ctx = await 服務.retrieveContext('借貸契約');
    expect(ctx.statusMessage).toContain('僅供分析參考');
    expect(ctx.statusMessage).toContain('引用需另行指定');
  });
});
