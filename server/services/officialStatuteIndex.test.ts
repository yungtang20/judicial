import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildIndex,
  extractFirstZipEntry,
  loadOfficialStatuteIndex,
  resetOfficialStatuteIndexCache
} from './officialStatuteIndex';
import {
  __setOfficialStatuteIndexForTest,
  isOfficialStatuteIndexReady,
  officialPrecheckOptions
} from './statuteExistenceProvider';
import { precheckLegalInput } from '../../src/lib/legalInputPrecheck';
import { verifyLegalCitations } from '../../src/lib/citationVerifier';

/**
 * 官方法規即時查證
 *
 * 這套查證取代本機靜態索引，因為靜態索引已被實測證明會過期：
 *  - 覆蓋率極低：只收錄民法 41 條（3.3%）、民訴法 7 條（1.2%）
 *  - 硬編的條號上限已落後：民訴法實際 640 條而索引寫 607，
 *    票據法實際 146 條而索引寫 144——第608～640條是真實的，
 *    卻會被判定為「該法最高僅至第607條」的捏造引用。
 *
 * 官方資料（law.moj.gov.tw）的 UpdateDate 讓基準可追溯，
 * 「這條是否存在」因此是確定性事實，不是推測。
 *
 * 但 fail-closed 不能因此被削弱：官方查不到時必須維持原有擋下行為。
 */

/** 官方資料形狀的最小樣本，足以涵蓋解析規則。 */
function 官方資料(法: Array<{ LawName: string; 条: string[] }>) {
  return {
    UpdateDate: '2026/9/18 上午 12:00:00',
    Laws: 法.map((l) => ({
      LawName: l.LawName,
      LawArticles: [
        { ArticleType: 'C', ArticleNo: '' },
        ...l.条.map((n) => ({ ArticleType: 'A', ArticleNo: n }))
      ]
    }))
  };
}

describe('官方資料解析', () => {
  const 索引 = buildIndex(官方資料([
    { LawName: '民法', 条: ['第 1 條', '第 184 條', '第 471 條', '第 1113-10 條'] },
    { LawName: '中華民國刑法', 条: ['第 1 條', '第 271 條'] }
  ]));

  it('官方確認存在的條文回報 EXISTS', () => {
    expect(索引.verify('民法', 184)).toBe('EXISTS');
    expect(索引.verify('民法', 471)).toBe('EXISTS');
  });

  it('官方確認不存在的條文回報 ABSENT', () => {
    expect(索引.verify('民法', 9999)).toBe('ABSENT');
    expect(索引.verify('刑法', 9999)).toBe('ABSENT');
  });

  it('條之N 與母條是不同條文', () => {
    // 「第1113條之10」與「第1113條」是兩條，不能互相頂替，
    // 否則會拿錯誤的條文替文件背書。
    expect(索引.verify('民法', 1113, 10)).toBe('EXISTS');
    expect(索引.verify('民法', 1113)).toBe('EXISTS');
  });

  it('法名前綴不同仍對應到同一部法', () => {
    // 官方 LawName 前綴不一致：民法是「民法」，刑法是「中華民國刑法」。
    expect(索引.verify('刑法', 271)).toBe('EXISTS');
    expect(索引.verify('中華民國刑法', 271)).toBe('EXISTS');
  });

  it('官方清單沒有的法名回報 UNKNOWN，不得判定為捏造', () => {
    // 法名可能是誤植或非現行法，不能據此說引用是假的。
    expect(索引.verify('不存在的法', 5)).toBe('UNKNOWN');
  });

  it('非有限數字回報 UNKNOWN', () => {
    expect(索引.verify('民法', Number.NaN)).toBe('UNKNOWN');
  });

  it('揭露官方更新日，讓查證基準可追溯', () => {
    expect(索引.updateDate).toBe('2026/9/18 上午 12:00:00');
  });

  it('拒絕無法解析的 ZIP，不得默默回傳空內容', () => {
    expect(() => extractFirstZipEntry(Buffer.from('這不是 ZIP'))).toThrow();
  });
});

describe('前檢查採用官方資料', () => {
  const 索引 = buildIndex(官方資料([
    { LawName: '民法', 条: ['第 1 條', '第 184 條', '第 471 條', '第 479 條', '第 1113-10 條'] }
  ]));
  const options = {
    statuteExistence: (law: string, art: number, sub?: number) => 索引.verify(law, art, sub),
    officialUpdateDate: 索引.updateDate
  };

  it('官方確認存在的法條可產製', () => {
    // 這正是修正前的真實案例：民法第471、479條都真實存在，
    // 卻因為本機索引沒收錄而被擋下，整份書狀無法產製。
    const r = precheckLegalInput('原告依民法第471條與民法第479條規定起訴。', 'generation', options);
    expect(r.status, `應產製但被擋：${JSON.stringify(r.issues)}`).toBe('pass');
    expect(r.checkerKind).toBe('official');
  });

  it('官方確認不存在的法條仍被擋下', () => {
    const r = precheckLegalInput('依民法第9999條規定。', 'generation', options);
    expect(r.status).toBe('reject');
    expect(r.issues[0]?.code).toBe('MALFORMED_CITATION');
  });

  it('官方查不到時維持 fail-closed，不得因無法查證就放行', () => {
    // 這是關鍵：官方不可用或法名未收錄時，行為必須與原本一致——
    // 產製模式擋下未查證的引用。
    const r = precheckLegalInput('依民法第471條規定。', 'generation', {
      statuteExistence: () => 'UNKNOWN',
      officialUpdateDate: 索引.updateDate
    });
    expect(r.status).toBe('reject');
  });

  it('未提供官方資料時行為與原本完全相同', () => {
    // 治理測試 legalGovernance.test.ts 以同步兩參數呼叫驗證 fail-closed，
    // 這個簽章與行為都不能改。
    expect(precheckLegalInput('民法第184條', 'generation').status).toBe('pass');
    expect(precheckLegalInput('民法第999條', 'generation').status).toBe('reject');
    expect(precheckLegalInput('民法第999條', 'analysis').status).toBe('needs_review');
  });

  it('官方確認不存在的法條在分析模式也擋下', () => {
    // 官方確認「民法沒有第9999條」，這是確定性的捏造而非「查不到」，
    // 因此分析模式同樣拒絕。修改前只能標記待審——
    // 那等於讓捏造引用在分析流程中通行。
    const r = precheckLegalInput('依民法第9999條規定。', 'analysis', options);
    expect(r.status).toBe('reject');
    expect(r.issues[0]?.code).toBe('MALFORMED_CITATION');
  });

  it('官方未收錄的法名在分析模式標記待審，不誤判為捏造', () => {
    // 法名不在官方清單只代表「無法確定」，不能等於「假的」。
    const r = precheckLegalInput('依某某法第5條規定。', 'analysis', {
      statuteExistence: () => 'UNKNOWN'
    });
    expect(r.status).toBe('needs_review');
    expect(r.issues[0]?.code).toBe('UNVERIFIED_CITATION');
  });
});

describe('官方索引優先於會過期的硬編上限', () => {
  it('硬編上限落後時仍以官方為準', () => {
    // 實測：民訴法實際 640 條，但靜態索引硬編 607，
    // 第608～640條會被誤判為捏造。官方資料存在時必須放行。
    const 索引 = buildIndex(官方資料([{ LawName: '民事訴訟法', 条: ['第 607 條', '第 630 條'] }]));
    const r = verifyLegalCitations('依民事訴訟法第630條規定。', {
      statuteExistence: (law, art, sub) => 索引.verify(law, art, sub)
    });
    expect(r.results[0]?.verified).toBe(true);
  });

  it('官方資料不存在時維持原本的硬編判斷', () => {
    // 離線情境：不能因為查不到就把原本擋下的變成放行。
    const r = verifyLegalCitations('依民事訴訟法第630條規定。');
    expect(r.results[0]?.verified).toBe(false);
  });
});

describe('官方來源不可用時的行為', () => {
  beforeEach(() => {
    resetOfficialStatuteIndexCache();
    __setOfficialStatuteIndexForTest(null);
  });

  it('索引未就緒時不提供查詢能力，前檢查退回本機索引', () => {
    expect(isOfficialStatuteIndexReady()).toBe(false);
    expect(officialPrecheckOptions().statuteExistence).toBeUndefined();
    // 退回本機索引後，仍會擋下未收錄的引用——fail-closed 未被削弱。
    expect(precheckLegalInput('依民法第471條規定。', 'generation', officialPrecheckOptions()).status)
      .toBe('reject');
  });

  it('索引就緒後提供查詢能力並揭露查證方式', () => {
    const 索引 = buildIndex(官方資料([{ LawName: '民法', 条: ['第 471 條'] }]));
    __setOfficialStatuteIndexForTest(索引);
    expect(isOfficialStatuteIndexReady()).toBe(true);
    const opts = officialPrecheckOptions();
    expect(opts.statuteExistence?.('民法', 471)).toBe('EXISTS');
    expect(opts.officialUpdateDate).toBe('2026/9/18 上午 12:00:00');
  });
});

describe('官方來源實際可用性', () => {
  beforeEach(() => {
    resetOfficialStatuteIndexCache();
    __setOfficialStatuteIndexForTest(null);
  });

  // 下載官方資料約 6 MB，vitest 預設 5 秒逾時不足（實測曾因此間歇性失敗）。
  it('可從法務部全國法規資料庫取得索引', { timeout: 60_000 }, async () => {
    const 索引 = await loadOfficialStatuteIndex();
    // 官方來源是外部依賴，離線時不得讓整個測試套件失敗，
    // 但能取得時必須驗證它確實可用且資料新鮮。
    if (!索引) {
      expect(__setOfficialStatuteIndexForTest).toBeDefined();
      return;
    }
    expect(索引.lawCount).toBeGreaterThan(1000);
    expect(索引.updateDate).not.toBe('（官方未提供）');
    // 真實存在的條文
    expect(索引.verify('民法', 184)).toBe('EXISTS');
    expect(索引.verify('民法', 471)).toBe('EXISTS');
    // 該法最高僅至第1225條，第9999條不可能存在
    expect(索引.verify('民法', 9999)).toBe('ABSENT');
    expect(索引.verify('刑法', 9999)).toBe('ABSENT');
    // 硬編上限已落後的民訴法，官方確認第630條存在
    expect(索引.verify('民事訴訟法', 630)).toBe('EXISTS');
  });
});

describe('產出驗證同樣採用官方資料', () => {
  beforeEach(() => {
    resetOfficialStatuteIndexCache();
    __setOfficialStatuteIndexForTest(null);
  });

  it('未注入時沿用本機索引，行為與原本相同', () => {
    // 治理測試與單元測試不注入官方資料時，必須完全等同於上線前行為。
    expect(verifyLegalCitations('依民法第184條規定。').results[0]?.verified).toBe(true);
    expect(verifyLegalCitations('依民法第479條規定。').results[0]?.verified).toBe(false);
  });

  it('注入後產出路徑也能查證真實法條', () => {
    // 實測缺陷：輸入預檢雖已改用官方資料，但產出驗證仍走本機索引，
    // 導致任何使用者輸入的法條引用都讓產製失敗（HTTP 422）。
    // 這裡鎖住「注入一次即全面生效」。
    const 索引 = buildIndex(官方資料([
      { LawName: '民法', 条: ['第 1 條', '第 184 條', '第 471 條', '第 479 條'] }
    ]));
    __setOfficialStatuteIndexForTest(索引);
    expect(verifyLegalCitations('依民法第479條規定。').results[0]?.verified).toBe(true);
    expect(verifyLegalCitations('依民法第9999條規定。').results[0]?.verified).toBe(false);
  });

  it('撤回注入後回到本機索引，不得殘留官方判斷', () => {
    const 索引 = buildIndex(官方資料([{ LawName: '民法', 条: ['第 479 條'] }]));
    __setOfficialStatuteIndexForTest(索引);
    expect(verifyLegalCitations('依民法第479條規定。').results[0]?.verified).toBe(true);
    __setOfficialStatuteIndexForTest(null);
    expect(verifyLegalCitations('依民法第479條規定。').results[0]?.verified).toBe(false);
  });
});

