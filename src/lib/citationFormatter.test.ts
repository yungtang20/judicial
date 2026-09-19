import { describe, it, expect } from 'vitest';
import {
  formatStandardCourtCitation,
  buildPleadingCitationSnippet
} from './citationFormatter';

describe('CitationFormatter (臺灣司法引註標準化工具)', () => {
  it('能將簡寫最高法院案號格式化為正規判決書狀字串', () => {
    const formatted = formatStandardCourtCitation('112台上2409');
    expect(formatted).toBe('最高法院 112 年度台上字第 2409 號判決');
  });

  it('能正確識別裁定類別案號', () => {
    const formatted = formatStandardCourtCitation('108台抗123');
    expect(formatted).toBe('最高法院 108 年度台抗字第 123 號裁定');
  });

  it('若已有完整字號應予以保留並優化排版空格', () => {
    const raw = '最高法院110年度台上字第55號民事判決';
    const formatted = formatStandardCourtCitation(raw);
    expect(formatted).toContain('最高法院 110 年度');
    expect(formatted).toContain('字第 55 號');
  });

  it('能產出標準書狀引註程式碼段（含要旨）', () => {
    const snippet = buildPleadingCitationSnippet({
      citation: '112台上2409',
      summary: '契約解除後之回復原狀請求權，其時效起算點...'
    });
    expect(snippet).toContain('【裁判字號】最高法院 112 年度台上字第 2409 號判決');
    expect(snippet).toContain('【裁判要旨】「契約解除後之回復原狀請求權，其時效起算點...」');
    expect(snippet).toContain('依法應予參照');
  });
});
