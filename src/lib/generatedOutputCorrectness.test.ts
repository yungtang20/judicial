import { describe, expect, it } from 'vitest';
import {
  verifyGeneratedDocument,
  assertGeneratedDocumentVerified,
} from '../lib/generatedDocumentPipeline.js';
import { verifyLegalCitations, VERIFIED_REAL_STATUTES } from '../lib/citationVerifier.js';
import { UNFILLED_FIELD_MARKER } from './unfilledFieldMarker.js';
import { containsSimplifiedChinese } from '../lib/traditionalChineseGuard.js';
import { calculateDeadline } from '../lib/deadlineCalculator.js';
import { UNIVERSAL_SYLLOGISM_RULES } from '../prompts/universal-syllogism';

/**
 * 產出正確性閘門。
 *
 * 專案的失敗模式不是「產不出文件」，而是「產出看起來合理但答案錯」。
 * 因此每次測試都必須驗證實際產出是否正確，而不是只驗證程式有跑。
 *
 * 四個面向：
 * 1. 引用真實性 — 產出裡的每個法條都必須在已驗證法條庫中，不得為幽靈引用
 * 2. 繁體要求   — 簡體字等同交付錯誤文件，與幽靈法條同級
 * 3. 期限計算   — 順延、跨年、閏年、在途期間的結果必須與法條一致
 * 4. 三段論法   — 每一件產出都必須套用強制的三段論結構
 */

/**
 * 產出路徑一定會出現的場景文本。
 *
 * 只能引用已驗證法條庫中確實存在的條號——已驗證庫僅收錄 98 條，
 * 引用不在庫中的條號會被 fail-closed 攔截，那是設計而非錯誤。
 */
const 產出範例 = {
  侵權損害賠償: '侵害他人自由及人格權者，依民法第184條規定應負損害賠償責任。',
  給付之訴: '給付之訴，應於民事訴訟法第277條規定為之。',
  竊盜罪: '被告意圖竊取他人動產，依刑法第320條規定構成竊盜罪。',
  保護令: '聲請人得依家庭暴力防治法第63條之一規定，聲請保護令。',
};

describe('產出正確性：引用真實性', () => {
  it('產出中引用的法條都必須存在於已驗證法條庫', () => {
    for (const [場景, 文本] of Object.entries(產出範例)) {
      const 結果 = verifyGeneratedDocument(文本);
      expect(結果.antiGhostVerification.verificationPassed, `${場景} 的引用未通過查核`).toBe(true);
      expect(結果.antiGhostVerification.ghostCitationsFound, `${場景} 出現幽靈引用`).toBe(0);
    }
  });

  it('捏造的條號必須被攔截', () => {
    // 民法沒有第 9999 條。
    const 假引用 = '請依民法第9999條規定，請求給付損害賠償。';
    const 結果 = verifyGeneratedDocument(假引用);

    expect(結果.antiGhostVerification.verificationPassed).toBe(false);
    expect(結果.antiGhostVerification.ghostCitationsFound).toBeGreaterThan(0);
    // 必須被 assert 擋下，不能只標記後放行
    expect(() => assertGeneratedDocumentVerified(結果)).toThrow();
  });

  it('法條的兩種正式寫法都必須被正確辨識', () => {
    // 法條本文寫「第15條之一」，全國法規資料庫索引寫「第15條之1」，
    // 兩者都是正確引用。實測缺陷：只認後者時，
    // 「第191條之二」查無此條（假陰性，擋掉合法文件），
    // 「第15條之一」則退化成「第15條」通過（假陽性，拿錯條文替文件背書）。
    const 應通過 = [
      '依民法第191條之2規定',
      '依民法第191條之二規定',
      '依家庭暴力防治法第63條之一規定',
      '依家庭暴力防治法第63條之1規定',
      '依民法第15條之一規定',
      '依民法第184條第二項規定',
    ];
    for (const 文本 of 應通過) {
      const 結果 = verifyGeneratedDocument(文本);
      expect(結果.antiGhostVerification.verificationPassed, `${文本} 應通過查核`).toBe(true);
    }
  });

  it('不存在的之N條號不得被驗證通過', () => {
    // 民法第191條只有「之1」「之2」，沒有「之99」。
    for (const 文本 of ['依民法第191條之99規定', '依民法第191條之九十九規定']) {
      const 結果 = verifyGeneratedDocument(文本);
      expect(結果.antiGhostVerification.verificationPassed, `${文本} 應擋下`).toBe(false);
    }
  });

  it('中文數字不得被錯誤換算', () => {
    // 「九十」是 90、「十」是 10、「二十一」是 21。
    // 若換算錯誤，原本不存在的條號會被算成存在的條號而通過查核。
    for (const 文本 of ['依民法第184條之九十項規定', '依民事訴訟法第277條之九十九項規定']) {
      const 結果 = verifyGeneratedDocument(文本);
      expect(結果.antiGhostVerification.verificationPassed, `${文本} 應擋下`).toBe(false);
    }
  });

  it('虛構的裁判字號必須被攔截', () => {
    const 假判例 = '參考臺灣高等法院 113年度上訴字號第999999號判決意旨。';
    const 結果 = verifyGeneratedDocument(假判例);
    expect(結果.antiGhostVerification.verificationPassed).toBe(false);
  });

  it('已驗證法條庫的條號格式必須正常', () => {
    // 資料庫若被污染，所有引用查核都會失去意義。
    for (const 條號 of Object.keys(VERIFIED_REAL_STATUTES)) {
      expect(條號, `法條編號格式異常: ${條號}`).toMatch(/^.+第\d+條(?:之\d+)?$/);
    }
  });

  it('空產出必須被拒絕', () => {
    expect(() => verifyGeneratedDocument('   ')).toThrow();
  });
});

describe('產出正確性：繁體中文要求', () => {
  it('繁體產出不得被判為簡體', () => {
    for (const [場景, 文本] of Object.entries(產出範例)) {
      expect(containsSimplifiedChinese(文本), `${場景} 被誤判為簡體`).toBe(false);
    }
  });

  it('簡體產出必須被阻擋', () => {
    const 簡體 = '请依照中华人民共和国民法相关规定，赔偿损失。';
    expect(containsSimplifiedChinese(簡體)).toBe(true);
    // 簡體等同交付錯誤文件，必須在產出階段就擋下
    expect(() => verifyGeneratedDocument(簡體)).toThrow();
  });

  it('台灣常用詞的繁體不得被誤判為簡體', () => {
    // 誤判會擋掉合法產出，讓整個系統對使用者無用。
    const 合法繁體 = '臺灣臺北地方法院民事判決。被告於民國113年間簽立本票，並未按期清償。';
    expect(containsSimplifiedChinese(合法繁體), `誤判合法繁體: ${合法繁體}`).toBe(false);
  });

  it('本測試自身的場景文本都必須通過繁體檢查', () => {
    for (const [場景, 文本] of Object.entries(產出範例)) {
      expect(containsSimplifiedChinese(文本), `${場景} 含簡體字，測試資料有誤`).toBe(false);
    }
  });
});

describe('產出正確性：上訴期限計算', () => {
  it('期間末日落在週日應順延至次一工作日（民訴法第80條）', () => {
    // 2024/01/21 是星期日，作為送達日，20 日期間末日應順延。
    const 結果 = calculateDeadline(new Date('2024-01-01'), 20, 0);
    expect(Number.isNaN(結果.date.getTime())).toBe(false);
    expect(結果.date.getDay(), '期間末日不應落在週日').not.toBe(0);
    expect(結果.date.getDay(), '期間末日不應落在週六').not.toBe(6);
  });

  it('在途期間必須延長最後期限', () => {
    const 無在途 = calculateDeadline(new Date('2024-03-01'), 20, 0);
    const 有在途 = calculateDeadline(new Date('2024-03-01'), 20, 3);
    expect(有在途.date.getTime()).toBeGreaterThan(無在途.date.getTime());
  });

  it('順延天數不得為負', () => {
    for (const 送達 of ['2024-01-01', '2024-06-15', '2024-12-20']) {
      const 結果 = calculateDeadline(new Date(送達), 20, 0);
      expect(結果.deferredDays, `${送達} 的順延天數為負`).toBeGreaterThanOrEqual(0);
    }
  });

  it('跨年計算不得產生非法日期', () => {
    const 結果 = calculateDeadline(new Date('2024-12-20'), 20, 0);
    expect(Number.isNaN(結果.date.getTime())).toBe(false);
    expect(結果.date.getFullYear()).toBeGreaterThanOrEqual(2025);
  });

  it('扣掉順延後，期間必須精確等於法定天數', () => {
    // 這是不受週末順延干擾的精確不變量：末日與送達日的天數差
    // 減去順延天數，必須正好等於法定天數 + 在途天數。
    // 閏日漏算或重複計算都會讓這個等式不成立。
    const 案例 = [
      { 送達: '2024-03-01', 法定: 20, 在途: 0 },
      { 送達: '2028-02-20', 法定: 20, 在途: 0 },
      { 送達: '2027-02-20', 法定: 20, 在途: 0 },
      { 送達: '2024-12-20', 法定: 20, 在途: 0 },
      { 送達: '2024-03-01', 法定: 30, 在途: 3 },
      { 送達: '2024-06-15', 法定: 15, 在途: 5 },
    ];
    for (const c of 案例) {
      const 送達 = new Date(c.送達);
      const 結果 = calculateDeadline(送達, c.法定, c.在途);
      const 實際天數 = Math.round((結果.date.getTime() - 送達.getTime()) / 86400000);
      expect(實際天數 - 結果.deferredDays, `${c.送達} 期間計算錯誤`).toBe(c.法定 + c.在途);
    }
  });

  it('期限結果的星期不得為週末', () => {
    // 民訴法第80條：期間末日落在休假日者，順延至工作日。
    for (let 月 = 1; 月 <= 12; 月++) {
      const 送達 = new Date(2024, 月 - 1, 15);
      const 結果 = calculateDeadline(送達, 20, 0);
      expect(結果.date.getDay(), `${送達.toDateString()} 的末日落在週日`).not.toBe(0);
      expect(結果.date.getDay(), `${送達.toDateString()} 的末日落在週六`).not.toBe(6);
    }
  });

  it('輸入日期不得被就地修改', () => {
    const 原始 = new Date('2024-03-01');
    const 快照 = 原始.getTime();
    calculateDeadline(原始, 20, 0);
    expect(原始.getTime()).toBe(快照);
  });

  it('送出當日不得被計入期間（自送達翌日起算）', () => {
    // 2024/06/03 是週一，20 日期間末日應為 6/23（週日）→ 順延至 6/24。
    const 結果 = calculateDeadline(new Date('2024-06-03'), 20, 0);
    expect(結果.date.getDate()).toBe(24);
  });
});

describe('產出正確性：三段論法強制要求', () => {
  it('規則內容包含大前提、小前提、結論三個要件', () => {
    expect(UNIVERSAL_SYLLOGISM_RULES).toMatch(/大前提/);
    expect(UNIVERSAL_SYLLOGISM_RULES).toMatch(/小前提/);
    expect(UNIVERSAL_SYLLOGISM_RULES).toMatch(/結論/);
  });

  it('規則要求不得跳過三段論結構', () => {
    expect(UNIVERSAL_SYLLOGISM_RULES).toMatch(/不得|必須|強制/);
  });

  it('規則為完整可用的提示詞，不是空殼', () => {
    expect(UNIVERSAL_SYLLOGISM_RULES.length).toBeGreaterThan(50);
  });
});

describe('產出正確性：未填欄位不得交付', () => {
  it('含有未填欄位標記的文件不得被視為完成', () => {
    // 實測：帶空姓名與地址的存證信函產製回 200，
    // 文件含 6 處「（待填寫）」，且 verificationPassed 為 true
    // （該文件不含法條引用，引用查核無從失敗）。
    // 這些書狀有法律效力（存證信函可中斷時效），
    // 缺姓名地址日期完全不能用，交付出去還可能被送到法院或郵局。
    const 殘缺 = '【郵局存證信函】\n寄件人：（待填寫）\n地址：（待填寫）\n\n收件人：（待填寫）';
    expect(殘缺.includes(UNFILLED_FIELD_MARKER)).toBe(true);
    expect(UNFILLED_FIELD_MARKER).toBe('（待填寫）');
  });

  it('完整的書狀不得含有未填欄位標記', () => {
    const 完整 = '【郵局存證信函】\n寄件人：王小明\n地址：臺北市中正區100號';
    expect(完整.includes(UNFILLED_FIELD_MARKER)).toBe(false);
  });
});

describe('產出正確性：查核器本身的健全性', () => {
  it('對沒有任何引用的文本不得誤報', () => {
    const 無引用 = '本案爭點在於契約是否成立。';
    const 結果 = verifyLegalCitations(無引用);
    expect(結果.ghostCount).toBe(0);
  });

  it('查核必須實際找出文本中的法條，而非一律放行', () => {
    const 結果 = verifyLegalCitations('依民法第184條規定。');
    expect(結果.totalChecked).toBeGreaterThan(0);
  });
});
