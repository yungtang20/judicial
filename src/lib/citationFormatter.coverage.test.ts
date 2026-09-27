import { describe, expect, it } from 'vitest';
import { formatStandardCourtCitation } from './citationFormatter';

/**
 * 裁判字號格式化必須涵蓋實際使用的各種格式。
 *
 * 實測三個缺口：
 * 1. 最高法院再審的實際字號是「台上再」，程式清單寫的是「台再」。
 *    「台上」先匹配後接不上數字，整組比對失敗，
 *    導致 112台上再2409 完全沒有被格式化。
 * 2. 地方法院字號（112北訴123、112士訴45、112訴67）完全未處理。
 * 3. 已含年度與字號但未載明法院者（112年度台上字第2409號）原樣輸出。
 *
 * 字號格式不一致會影響幽靈裁判的正規化比對——
 * 同一件案子以不同格式出現時就比對不到。
 */
describe('裁判字號格式化', () => {
  it('最高法院各類字號', () => {
    expect(formatStandardCourtCitation('112台上2409')).toBe('最高法院 112 年度台上字第 2409 號判決');
    expect(formatStandardCourtCitation('112台抗1234')).toBe('最高法院 112 年度台抗字第 1234 號裁定');
    // 再審：實際字號為「台上再」，先前因清單寫成「台再」而漏掉
    expect(formatStandardCourtCitation('112台上再2409')).toBe('最高法院 112 年度台上再字第 2409 號判決');
  });

  it('高等法院字號', () => {
    expect(formatStandardCourtCitation('111上易1234')).toBe('高等法院 111 年度上易字第 1234 號判決');
    expect(formatStandardCourtCitation('110上訴567')).toBe('高等法院 110 年度上訴字第 567 號判決');
  });

  it('地方法院字號：整理格式但不得臆測所屬法院', () => {
    // 地院代碼無法從字號推回是哪一間地院（「訴」可能是臺北、臺中、臺南），
    // 因此只整理格式並標明法院名稱未載明。
    expect(formatStandardCourtCitation('112北訴123')).toBe('112 年度北訴字第 123 號（地方法院，法院名稱未載明）');
    expect(formatStandardCourtCitation('112士訴45')).toBe('112 年度士訴字第 45 號（地方法院，法院名稱未載明）');
    expect(formatStandardCourtCitation('112訴67')).toBe('112 年度訴字第 67 號（地方法院，法院名稱未載明）');
    expect(formatStandardCourtCitation('113重訴89')).toBe('113 年度重訴字第 89 號（地方法院，法院名稱未載明）');
  });

  it('不得臆測法院名稱', () => {
    const 結果 = formatStandardCourtCitation('112北訴123');
    // 不得出現任何具體地院名稱
    expect(結果).not.toMatch(/臺北地方法院|士林地方法院|新北地方法院/);
    expect(結果).toContain('法院名稱未載明');
  });

  it('已含年度字號但未載明法院者應整理格式', () => {
    const 結果 = formatStandardCourtCitation('112年度台上字第2409號');
    expect(結果).toContain('112 年度');
    expect(結果).toContain('2409 號');
    // 不得出現重複的「字第字第」
    expect(結果).not.toContain('字第字第');
  });

  it('已含完整法院名稱者維持原樣並整理空格', () => {
    expect(formatStandardCourtCitation('最高法院 112 年度台上字第 2409 號'))
      .toBe('最高法院 112 年度台上字第 2409 號');
    expect(formatStandardCourtCitation('臺灣臺北地方法院 112 年度訴字第 123 號'))
      .toBe('臺灣臺北地方法院 112 年度訴字第 123 號');
  });

  it('無法辨識者原樣返回，不得憑空產生內容', () => {
    expect(formatStandardCourtCitation('garbage 文字')).toBe('garbage 文字');
    expect(formatStandardCourtCitation('')).toBe('');
  });
});
