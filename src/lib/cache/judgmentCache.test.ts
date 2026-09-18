import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeJudgmentQuery,
  setCachedData,
  getCachedData,
  removeCachedData,
  clearJudgmentCache,
  getJudgmentCacheStats,
  withJudgmentCache
} from './judgmentCache';

describe('judgmentCache (司法院判決檢索本地快取)', () => {
  beforeEach(() => {
    clearJudgmentCache('sessionStorage');
    clearJudgmentCache('localStorage');
  });

  describe('案號與關鍵字正規化 (normalizeJudgmentQuery)', () => {
    it('應能正規化全形空格與冗餘字詞', () => {
      const q1 = ' 112 年度 台上 字第 2409 號 ';
      const q2 = '112台上2409';
      expect(normalizeJudgmentQuery(q1)).toBe('112台上2409');
      expect(normalizeJudgmentQuery(q2)).toBe('112台上2409');
      expect(normalizeJudgmentQuery(q1)).toBe(normalizeJudgmentQuery(q2));
    });

    it('應能處理法院全名與括號備註', () => {
      const q = '臺灣高等法院 110 上易 1234 (民事庭)';
      expect(normalizeJudgmentQuery(q)).toBe('臺灣高等法院110上易1234');
    });
  });

  describe('快取存取與 TTL', () => {
    it('應能成功儲存與讀取快取資料', () => {
      const testData = { caseNo: '112台上2409', title: '最高法院裁判', content: '上訴駁回' };
      setCachedData('112台上2409', testData, { storageType: 'sessionStorage' });

      const cached = getCachedData<typeof testData>('112 年度 台上 字第 2409 號', { storageType: 'sessionStorage' });
      expect(cached).not.toBeNull();
      expect(cached?.fromCache).toBe(true);
      expect(cached?.data.caseNo).toBe('112台上2409');
      expect(cached?.data.content).toBe('上訴駁回');
    });

    it('未命中應回傳 null', () => {
      const res = getCachedData('不存在的案號999', { storageType: 'sessionStorage' });
      expect(res).toBeNull();
    });

    it('超過 TTL 應自動失效', async () => {
      const testData = { id: 'test_expired' };
      setCachedData('test_key', testData, { ttlMs: 10, storageType: 'sessionStorage' });

      // 等待 20ms 使其過期
      await new Promise((r) => setTimeout(r, 25));

      const res = getCachedData('test_key', { storageType: 'sessionStorage' });
      expect(res).toBeNull();
    });
  });

  describe('withJudgmentCache 高階包裝', () => {
    it('初次呼叫執行 fetcher，第二次呼叫應命中快取不調用 fetcher', async () => {
      let callCount = 0;
      const mockFetcher = async () => {
        callCount++;
        return { result: '判決內容', count: callCount };
      };

      // 第一次：未命中，呼叫 fetcher
      const res1 = await withJudgmentCache('111台上100', mockFetcher, { storageType: 'sessionStorage' });
      expect(res1.fromCache).toBe(false);
      expect(res1.data.count).toBe(1);
      expect(callCount).toBe(1);

      // 第二次：相同案號（含空格與字第），應命中快取，fetcher 不會被呼叫
      const res2 = await withJudgmentCache('111 年度 台上 字第 100 號', mockFetcher, { storageType: 'sessionStorage' });
      expect(res2.fromCache).toBe(true);
      expect(res2.data.count).toBe(1);
      expect(callCount).toBe(1);

      // 第三次：啟用 bypassCache 強制重新整理
      const res3 = await withJudgmentCache('111台上100', mockFetcher, { bypassCache: true, storageType: 'sessionStorage' });
      expect(res3.fromCache).toBe(false);
      expect(res3.data.count).toBe(2);
      expect(callCount).toBe(2);
    });
  });

  describe('統計與清除', () => {
    it('應能正確取得快取統計並完全清除', () => {
      setCachedData('case_A', { a: 1 }, { storageType: 'sessionStorage' });
      setCachedData('case_B', { b: 2 }, { storageType: 'sessionStorage' });

      const statsBefore = getJudgmentCacheStats('sessionStorage');
      expect(statsBefore.totalItems).toBeGreaterThanOrEqual(2);

      clearJudgmentCache('sessionStorage');
      const statsAfter = getJudgmentCacheStats('sessionStorage');
      expect(statsAfter.totalItems).toBe(0);
    });
  });
});
