import { describe, expect, it, beforeEach } from 'vitest';
import { buildIndex, resetOfficialStatuteIndexCache } from '../../server/services/officialStatuteIndex';
import { __setOfficialStatuteIndexForTest } from '../../server/services/statuteExistenceProvider';
import { verifyLegalCitations } from './citationVerifier';
import { precheckLegalInput } from './legalInputPrecheck';

/**
 * 律師智慧助理的法條查證必須接上官方索引。
 *
 * 實測缺陷：助理的檢索只剩 24 筆本機種子（TLR 已停用），
 * 完全沒接全國法規資料庫。於是使用者問「民法第479條」時，
 * 助理回答「目前無民法第479條之有效法源資料」——
 * 而該條確實存在，官方索引已確認。
 *
 * 這等於對使用者說真實法條不存在。同樣的輸入在
 * /api/toolbox/generate 卻能正確產製，是功能之間的不一致。
 *
 * 這裡以底層驗證器為切入點鎖定：官方索引一旦注入，
 * 助理所用的引用查證就必須能確認這些真實法條。
 */

const 真實法條 = [
  { 法名: '民法', 條號: 479 },
  { 法名: '民法', 條號: 184 },
  { 法名: '民事訴訟法', 條號: 630 },
  { 法名: '刑法', 條號: 271 }
];

const 索引 = buildIndex({
  UpdateDate: '測試用',
  Laws: (() => {
    // 同一法名只能有一筆：buildIndex 以法名為鍵，
    // 分成多筆會互相覆蓋（先前測試因此漏掉第479條而失敗）。
    const 分組 = new Map<string, string[]>();
    for (const { 法名, 條號 } of 真實法條) {
      const 條 = 分組.get(法名) || [];
      條.push(`第 ${條號} 條`);
      分組.set(法名, 條);
    }
    return [...分組].map(([LawName, 條]) => ({
      LawName,
      LawArticles: 條.map(n => ({ ArticleType: 'A', ArticleNo: n }))
    }));
  })()
});

describe('律師助理的法條查證', () => {
  beforeEach(() => {
    resetOfficialStatuteIndexCache();
    __setOfficialStatuteIndexForTest(索引);
  });

  it('官方索引確認存在的法條不得被判為未知', () => {
    // 這是實測的失敗情境：助理曾回覆「無民法第479條之有效法源資料」。
    for (const { 法名, 條號 } of 真實法條) {
      const 引用 = `${法名}第${條號}條`;
      const r = verifyLegalCitations(`依${引用}規定。`, {
        statuteExistence: (l, a, s) => 索引.verify(l, a, s)
      });
      expect(r.results[0]?.verified, `${引用} 被判為未查證`).toBe(true);
    }
  });

  it('官方確認不存在的條號仍須標示為不可信', () => {
    const r = verifyLegalCitations('依民法第9999條規定。', {
      statuteExistence: (l, a, s) => 索引.verify(l, a, s)
    });
    expect(r.results[0]?.verified).toBe(false);
    expect(r.results[0]?.isGhostOrFake).toBe(true);
  });

  it('產製前檢查同樣受官方索引影響，兩條路徑結論一致', () => {
    // /api/toolbox/generate 與 /api/agent-chat 對同一引用的結論必須一致。
    const options = { statuteExistence: (l: string, a: number, s?: number) => 索引.verify(l, a, s) };
    const 驗證 = verifyLegalCitations('依民法第479條規定。', options).results[0];
    const 前檢 = precheckLegalInput('依民法第479條規定。', 'generation', options);
    expect(驗證.verified).toBe(true);
    expect(前檢.status).toBe('pass');
  });
});
