import { describe, it, expect } from 'vitest';
import { calculateAppealDeadline } from './appealDocumentActions';

/**
 * 實測缺陷：calculateAppealDeadline 原本自己寫了一份期限計算，
 * 只判斷 getDay() === 6 與 0（週六、週日），完全不查國定假日。
 * 專案另有 src/lib/deadlineCalculator.ts（查假日表），
 * 但上訴流程畫面用的是舊的那份。
 *
 * 具體後果：2026-09-05 送達，20 日不變期間的原始末日是 2026-09-25，
 * 該日是國定假日（週五）。舊邏輯因為不是週末就不順延，
 * 會把國定假日當成截止日。使用者照著畫面上的紅字期限遞狀就會逾期。
 *
 * 這些測試鎖的是「期限必須依假日表順延」這個行為，
 * 不是實作細節——寫法改了但結果不對，這些測試一樣會失敗。
 */
describe('上訴期限計算', () => {
  const 送達 = (deliveryDate: string, travelDays = 0, caseType = 'civil', currentDate = new Date('2026-09-01')) =>
    calculateAppealDeadline({ deliveryDate, travelDays, caseType, currentDate });

  it('原始末日落在國定假日時必須順延，不能把假日當成截止日', () => {
    // 2026-09-05 + 20 日 = 2026-09-25，該日在國定假日表內且是週五
    const r = 送達('2026-09-05');
    expect(r.declarationDeadline).not.toBe('2026年9月25日');
    // 09-26 週六、09-27 週日，次一工作日為週一 09-28
    expect(r.declarationDeadline).toBe('2026年9月28日');
  });

  it('原始末日落在週末時順延至次一工作日', () => {
    // 2026-09-06 + 20 日 = 2026-09-26（週六）
    const r = 送達('2026-09-06');
    expect(r.declarationDeadline).toBe('2026年9月28日');
  });

  it('非假日時不順延，維持法定期間末日', () => {
    // 2026-09-04 + 20 日 = 2026-09-24（週四）
    const r = 送達('2026-09-04');
    expect(r.declarationDeadline).toBe('2026年9月24日');
  });

  it('在途期間天數會併入法定期間計算', () => {
    const 無在途 = 送達('2026-09-04', 0);
    const 有在途 = 送達('2026-09-04', 8);
    expect(無在途.declarationDeadline).not.toBe(有在途.declarationDeadline);
  });

  it('刑事案件的補提理由書期間比民事長', () => {
    const 民事 = 送達('2026-09-04', 0, 'civil');
    const 刑事 = 送達('2026-09-04', 0, 'criminal');
    expect(民事.reasoningDeadline).not.toBe(刑事.reasoningDeadline);
  });

  it('期限落在假日表維護範圍之外時必須標記出來', () => {
    // 2026-10-25 + 20 日 = 2026-11-14，已超出假日表（僅建檔至 2026-10-10）
    const r = 送達('2026-10-25');
    expect(r.declarationBeyondCoverage).toBe(true);
  });

  it('涵蓋範圍內的期限不會標記超出', () => {
    const r = 送達('2026-09-04');
    expect(r.declarationBeyondCoverage).toBe(false);
  });

  it('缺少送達日期或日期無效時不會產生期限', () => {
    expect(送達('').declarationDeadline).toBe('未知');
    expect(送達('不是日期').declarationDeadline).toBe('無效日期');
  });
});