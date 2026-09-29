import { describe, expect, it } from 'vitest';
import { 抽取確定性欄位, 校正法院欄位 } from './judgmentFieldExtraction';

/**
 * 法院、案號與審級必須以規則抽取為準。
 *
 * 實測缺陷：AI 對這三個欄位的抽取錯誤率很高。
 * 四個真實判決格式的測試中，三個錯誤：
 *   臺灣高等法院 111年度上訴字 → 原審: 臺灣地方法院、審級: 第一審判決
 *   最高法院 110年度台上字     → 原審: 臺灣地方法院、審級: 第一審判決
 *   連續四次都給出相同的「臺灣地方法院／第一審判決」，
 *   顯然是照抄提示詞範例而非讀取原文。
 *
 * 後果嚴重：審級判錯會讓上訴法院判錯，
 * 使用者可能把第二審判決當第一審處理而漏掉上訴。
 */
describe('法院與審級的確定性抽取', () => {
  it('最高法院 → 第三審', () => {
    const r = 抽取確定性欄位('最高法院 110 年度台上字第 1234 號民事判決');
    expect(r.法院).toBe('最高法院');
    expect(r.審級).toBe('第三審判決');
  });

  it('臺灣高等法院 → 第二審', () => {
    const r = 抽取確定性欄位('臺灣高等法院 111 年度上訴字第 2345 號民事判決');
    expect(r.法院).toBe('臺灣高等法院');
    expect(r.審級).toBe('第二審判決');
  });

  it('高等法院分院 → 第二審，且保留分院名稱', () => {
    const r = 抽取確定性欄位('臺灣高等法院臺南分院 111 年度上訴字第 567 號民事判決');
    expect(r.法院).toContain('分院');
    expect(r.審級).toBe('第二審判決');
  });

  it('地方法院 → 第一審', () => {
    const r = 抽取確定性欄位('臺灣臺北地方法院 113 年度訴字第 1234 號民事判決');
    expect(r.法院).toBe('臺灣臺北地方法院');
    expect(r.審級).toBe('第一審判決');
  });

  it('抽取案號並去除空白', () => {
    const r = 抽取確定性欄位('臺灣臺北地方法院 113 年度訴字第 1234 號民事判決');
    expect(r.案號).toBe('113年度訴字第1234號');
  });

  it('空輸入回傳 null，不臆測', () => {
    expect(抽取確定性欄位('')).toEqual({ 法院: null, 案號: null, 審級: null });
  });
});

describe('校正 AI 的猜測', () => {
  it('AI 把高等法院判成地方法院時必須被覆寫', () => {
    const 輸出 = { courtName: '臺灣地方法院', courtLevel: '第一審判決', caseNo: '111年度訴字第2345號' };
    const 修正 = 校正法院欄位(輸出, '臺灣高等法院 111 年度上訴字第 2345 號民事判決');
    expect(修正.courtName).toBe('臺灣高等法院');
    expect(修正.courtLevel).toBe('第二審判決');
  });

  it('AI 把最高法院判成第一審時必須被覆寫', () => {
    const 輸出 = { courtName: '臺灣地方法院', courtLevel: '第一審判決' };
    const 修正 = 校正法院欄位(輸出, '最高法院 110 年度台上字第 1234 號民事判決');
    expect(修正.courtName).toBe('最高法院');
    expect(修正.courtLevel).toBe('第三審判決');
  });

  it('AI 已抽對時不得覆寫', () => {
    const 輸出 = { courtName: '臺灣臺北地方法院', courtLevel: '第一審判決', caseNo: '113年度訴字第1234號' };
    const 修正 = 校正法院欄位(輸出, '臺灣臺北地方法院 113 年度訴字第 1234 號民事判決');
    expect(修正.courtName).toBe('臺灣臺北地方法院');
    expect(修正.courtLevel).toBe('第一審判決');
    expect(修正.deterministicFieldCorrections).toBeUndefined();
  });

  it('規則抽不到時保留 AI 結果，不用空值清掉', () => {
    // 若硬蓋成 null，反而會把 AI 可能抽對的內容清掉。
    const 輸出 = { courtName: '某特別法庭' };
    const 修正 = 校正法院欄位(輸出, '完全沒有法院名稱的文字');
    expect(修正.courtName).toBe('某特別法庭');
  });

  it('有修正時記錄變更內容供稽核', () => {
    const 輸出 = { courtName: '臺灣地方法院', courtLevel: '第一審判決' };
    const 修正 = 校正法院欄位(輸出, '最高法院 110 年度台上字第 1234 號');
    expect(修正.deterministicFieldCorrections).toBeDefined();
    expect(String(修正.deterministicFieldCorrections)).toContain('最高法院');
  });

  it('不得影響其他欄位', () => {
    const 輸出 = { courtName: '臺灣地方法院', appealEligibility: 'ALLOWED', disclaimer: 'x' };
    const 修正 = 校正法院欄位(輸出, '最高法院 110 年度台上字第 1234 號');
    expect(修正.appealEligibility).toBe('ALLOWED');
    expect(修正.disclaimer).toBe('x');
  });
});
