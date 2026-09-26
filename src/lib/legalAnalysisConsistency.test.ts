import { describe, it, expect } from 'vitest';
import {
  AnalysisConsistencyError,
  assertAnalysisConsistent,
  detectAnalysisContradictions
} from './legalAnalysisConsistency';

/** 妨害性自主公訴案：本機規則已判定為公訴罪，且屬性自主案件。 */
const SEXUAL_AUTONOMY_CASE = { isPublicProsecution: true, isSexualAutonomyCase: true };
/** 同為公訴罪但未標記性自主（僅供對照）。 */
const PUBLIC_PROSECUTION_ONLY = { isPublicProsecution: true };

describe('detectAnalysisContradictions', () => {
  it('攔截把公訴罪說成準親告罪', () => {
    const violations = detectAnalysisContradictions('此罪為純犯，且屬於「準親告罪」（需原告提起告訴）。', SEXUAL_AUTONOMY_CASE);
    expect(violations).toHaveLength(1);
    expect(violations[0].code).toBe('TELL_NATURE_CONTRADICTION');
  });

  it('攔截要求於六個月內提告的公訴罪說法', () => {
    const violations = detectAnalysisContradictions('依刑法第225條，須於知悉後六個月內提出告訴。', SEXUAL_AUTONOMY_CASE);
    expect(violations.map(v => v.code)).toContain('TELL_NATURE_CONTRADICTION');
  });

  it('正確的非告訴乃論敘述不得被誤判', () => {
    const analysis = '刑法第225條第1項屬非告訴乃論公訴罪，不受6個月告訴乃論期間之限制，檢警知悉即應主動偵辦。';
    expect(detectAnalysisContradictions(analysis, SEXUAL_AUTONOMY_CASE)).toEqual([]);
  });

  it('攔截第225條第1項被標示為猥褻罪名', () => {
    const violations = detectAnalysisContradictions('刑法第225條第1項（乘機性交猥褻罪）處三年以上十年以下有期徒刑。', SEXUAL_AUTONOMY_CASE);
    expect(violations.map(v => v.code)).toContain('OFFENSE_PARAGRAPH_MISLABEL');
  });

  it('第225條第1項標示為乘機性交罪時不得誤判', () => {
    const analysis = '刑法第225條第1項（乘機性交罪）處三年以上十年以下有期徒刑。';
    expect(detectAnalysisContradictions(analysis, SEXUAL_AUTONOMY_CASE)).toEqual([]);
  });

  it('第225條第2項標示為猥褻內容時不得誤判', () => {
    const analysis = '刑法第225條第2項（乘機猥褻罪）處六月以上五年以下有期徒刑。';
    expect(detectAnalysisContradictions(analysis, SEXUAL_AUTONOMY_CASE)).toEqual([]);
  });

  it('攔截把第225條第1項稱為純犯', () => {
    const violations = detectAnalysisContradictions('刑法第225條第1項為純犯。', SEXUAL_AUTONOMY_CASE);
    expect(violations.map(v => v.code)).toContain('IMPOSSIBILITY_MISLABEL');
  });

  it('未提供性自主旗標且全文無相關脈絡時不攔截', () => {
    const analysis = '本案屬民事糾紛，雙方須於6個月內提出告訴。';
    expect(detectAnalysisContradictions(analysis, PUBLIC_PROSECUTION_ONLY)).toEqual([]);
  });

  it('未提供性自主旗標且全文無相關脈絡時不攔截', () => {
    expect(detectAnalysisContradictions('本案屬準親告罪。', PUBLIC_PROSECUTION_ONLY)).toEqual([]);
  });

  it('空內容不產生違規', () => {
    expect(detectAnalysisContradictions('', SEXUAL_AUTONOMY_CASE)).toEqual([]);
    expect(detectAnalysisContradictions('   ', SEXUAL_AUTONOMY_CASE)).toEqual([]);
  });

  it('違規項目須附上可稽核的原文與權威依據', () => {
    const [violation] = detectAnalysisContradictions('此罪屬於準親告罪。', SEXUAL_AUTONOMY_CASE);
    expect(violation.evidence).toContain('準親告');
    expect(violation.authority).toContain('229條之1');
  });
});

describe('assertAnalysisConsistent', () => {
  it('一致時放行', () => {
    expect(() => assertAnalysisConsistent('刑法第225條屬非告訴乃論公訴罪。', SEXUAL_AUTONOMY_CASE)).not.toThrow();
  });

  it('矛盾時丟出可稽核的錯誤', () => {
    expect(() => assertAnalysisConsistent('此罪屬於準親告罪。', SEXUAL_AUTONOMY_CASE)).toThrow(AnalysisConsistencyError);
    try {
      assertAnalysisConsistent('此罪屬於準親告罪。', SEXUAL_AUTONOMY_CASE);
    } catch (error) {
      expect((error as AnalysisConsistencyError).violations.length).toBeGreaterThan(0);
    }
  });
});
