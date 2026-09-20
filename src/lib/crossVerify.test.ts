/**
 * crossVerify 三態 + 報告分區測試（提示詞 2／2）
 * 重點：三態各可歸因、三區分於資料結構層級分開、
 *       缺口區不填補（fail-closed 精神）。
 */
import { describe, expect, it } from 'vitest';
import type { ExternalCitationResult } from './externalCitationVerifier';
import type { TaiwanLegalDbResult } from './taiwanLegalDbClient';
import { crossVerify, crossVerifyAll, buildCrossVerifyReport } from './crossVerify';

const dr = (o: Partial<ExternalCitationResult>): ExternalCitationResult => ({
  citation: 'X',
  status: 'unknown',
  exactMatch: false,
  source: 'dr-lawbot',
  message: 'm',
  searchUrl: 'u',
  ...o
});

const tl = (o: Partial<TaiwanLegalDbResult>): TaiwanLegalDbResult => ({
  citation: 'X',
  status: 'unavailable',
  source: 'mcp-taiwan-legal-db',
  message: 'm',
  ...o
});

describe('crossVerify 三態', () => {
  it('CONFIRMED：兩邊都 verified（一致）', () => {
    const o = crossVerify('c', dr({ status: 'verified' }), tl({ status: 'verified' }));
    expect(o.status).toBe('CONFIRMED');
  });

  it('CONFIRMED：兩邊都 not_found（一致——都查無）', () => {
    const o = crossVerify('c', dr({ status: 'not_found' }), tl({ status: 'not_found' }));
    expect(o.status).toBe('CONFIRMED');
  });

  it('CONFLICTING：一邊 verified 一邊 not_found（不一致）', () => {
    const o = crossVerify('c', dr({ status: 'verified' }), tl({ status: 'not_found' }));
    expect(o.status).toBe('CONFLICTING');
    // 兩邊原文都要留（報告層要原文化，不選邊）
    expect(o.drLawbot?.status).toBe('verified');
    expect(o.taiwanLegalDb?.status).toBe('not_found');
  });

  it('INSUFFICIENT：一邊 unknown（無有效結論）', () => {
    const o = crossVerify('c', dr({ status: 'unknown' }), tl({ status: 'verified' }));
    expect(o.status).toBe('INSUFFICIENT');
  });

  it('INSUFFICIENT：一邊 unavailable（未串接）', () => {
    const o = crossVerify('c', dr({ status: 'verified' }), tl({ status: 'unavailable' }));
    expect(o.status).toBe('INSUFFICIENT');
  });

  it('INSUFFICIENT：一邊完全缺（undefined）', () => {
    expect(crossVerify('c', dr({ status: 'verified' }), undefined).status).toBe('INSUFFICIENT');
    expect(crossVerify('c', undefined, tl({ status: 'verified' })).status).toBe('INSUFFICIENT');
    expect(crossVerify('c', undefined, undefined).status).toBe('INSUFFICIENT');
  });
});

describe('報告三區分（資料結構層級分開，非最後排版硬湊）', () => {
  it('buildCrossVerifyReport 依狀態正確分區', () => {
    const report = buildCrossVerifyReport([
      crossVerify('a', dr({ status: 'verified' }), tl({ status: 'verified' })),
      crossVerify('b', dr({ status: 'verified' }), tl({ status: 'not_found' })),
      crossVerify('c', dr({ status: 'unknown' }), tl({ status: 'verified' }))
    ]);
    expect(report.confirmed.map((o) => o.citation)).toEqual(['a']);
    expect(report.conflicting.map((o) => o.citation)).toEqual(['b']);
    expect(report.insufficient.map((o) => o.citation)).toEqual(['c']);
    // 三區互斥且完整（total = 輸入筆數）
    expect(report.confirmed.length + report.conflicting.length + report.insufficient.length).toBe(3);
  });

  it('端對端：crossVerifyAll 餵混合情境，輸出三區正確', () => {
    const queries = ['q1', 'q2', 'q3'];
    const drResults = [
      dr({ citation: 'q1', status: 'verified' }),
      dr({ citation: 'q2', status: 'verified' }),
      dr({ citation: 'q3', status: 'not_found' })
    ];
    const tlResults = [
      tl({ citation: 'q1', status: 'verified', rawSummary: '原文A' }),
      tl({ citation: 'q2', status: 'not_found' }),
      tl({ citation: 'q3', status: 'not_found' })
    ];
    const report = crossVerifyAll(queries, drResults, tlResults);
    expect(report.confirmed.map((o) => o.citation)).toEqual(['q1', 'q3']);
    expect(report.conflicting.map((o) => o.citation)).toEqual(['q2']);
    expect(report.insufficient).toHaveLength(0);
  });

  it('缺口區不填補：INSUFFICIENT 條目無 rawSummary 冒充結果（fail-closed）', () => {
    const report = crossVerifyAll(
      ['only-drlawbot'],
      [dr({ citation: 'only-drlawbot', status: 'verified' })],
      [] // 第二邊完全沒有回傳
    );
    const gap = report.insufficient[0];
    expect(gap).toBeDefined();
    expect(gap.taiwanLegalDb).toBeUndefined(); // 不造虛的第二邊結果
  });

  it('兩邊陣列長度不一致：缺的一邊帶入 undefined → 該筆 INSUFFICIENT', () => {
    const report = crossVerifyAll(
      ['a', 'b'],
      [dr({ citation: 'a', status: 'verified' }), dr({ citation: 'b', status: 'verified' })],
      [tl({ citation: 'a', status: 'verified' })] // 只有 a
    );
    expect(report.confirmed.map((o) => o.citation)).toEqual(['a']);
    expect(report.insufficient.map((o) => o.citation)).toEqual(['b']);
  });
});
