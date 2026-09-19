import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveJudgmentToDb,
  getJudgmentFromDb,
  deleteJudgmentFromDb,
  clearAllJudgmentsFromDb,
  getJudgmentCountInDb
} from './indexedDbStorage';

describe('IndexedDbStorage (離線大容量裁判存儲引擎)', () => {
  beforeEach(async () => {
    await clearAllJudgmentsFromDb();
  });

  it('能儲存並順利取回裁判全文（具備記憶體/環境降級備援）', async () => {
    const item = {
      id: '112台上2409',
      rawCitation: '最高法院 112 年度台上字第 2409 號民事判決',
      fulltext: '臺灣最高法院民事判決 112年度台上字第2409號...',
      storedAt: Date.now(),
      source: 'tlr' as const
    };

    await saveJudgmentToDb(item);
    const retrieved = await getJudgmentFromDb('112台上2409');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe('112台上2409');
    expect(retrieved?.fulltext).toContain('112年度台上字第2409號');
  });

  it('能正確回傳存儲計數與刪除單筆資料', async () => {
    await saveJudgmentToDb({
      id: 'doc_1',
      rawCitation: '判決一',
      fulltext: '內文一',
      storedAt: Date.now(),
      source: 'manual'
    });
    await saveJudgmentToDb({
      id: 'doc_2',
      rawCitation: '判決二',
      fulltext: '內文二',
      storedAt: Date.now(),
      source: 'manual'
    });

    const count = await getJudgmentCountInDb();
    expect(count).toBe(2);

    await deleteJudgmentFromDb('doc_1');
    const countAfter = await getJudgmentCountInDb();
    expect(countAfter).toBe(1);

    const checkDoc1 = await getJudgmentFromDb('doc_1');
    expect(checkDoc1).toBeNull();
  });
});
