import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/pdfUtils', () => ({
  parsePdfFile: vi.fn()
}));

import {
  calculateAppealDeadline,
  fetchJudicialUrl
} from './appealDocumentActions';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('calculateAppealDeadline', () => {
  it('fails closed for missing or invalid delivery dates', () => {
    expect(calculateAppealDeadline({ deliveryDate: '', travelDays: 0, caseType: 'civil' }))
      .toEqual({ declarationDeadline: '未知', reasoningDeadline: '未知', daysLeft: 0 });
    expect(calculateAppealDeadline({ deliveryDate: 'invalid', travelDays: 0, caseType: 'civil' }))
      .toEqual({ declarationDeadline: '無效日期', reasoningDeadline: '無效日期', daysLeft: 0 });
  });

  it('adds the declaration period and travel days deterministically', () => {
    const currentDate = new Date('2026-09-01T00:00:00+08:00');
    const result = calculateAppealDeadline({
      deliveryDate: '2026-09-01T00:00:00+08:00',
      travelDays: 2,
      caseType: 'civil',
      currentDate
    });

    expect(result.daysLeft).toBe(22);
    expect(result.declarationDeadline).not.toBe('未知');
    expect(result.reasoningDeadline).not.toBe('未知');
  });

  it('crosses a leap-year month boundary without mutating the supplied current date', () => {
    const currentDate = new Date('2024-02-10T00:00:00+08:00');
    const originalTimestamp = currentDate.getTime();
    const result = calculateAppealDeadline({
      deliveryDate: '2024-02-10T00:00:00+08:00',
      travelDays: 0,
      caseType: 'civil',
      currentDate
    });
    const expectedDeadline = new Date('2024-03-01T00:00:00+08:00')
      .toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });

    expect(result.declarationDeadline).toBe(expectedDeadline);
    expect(result.daysLeft).toBe(20);
    expect(currentDate.getTime()).toBe(originalTimestamp);
  });
});

describe('fetchJudicialUrl', () => {
  it('loads returned text into the requested judgment field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ text: '裁判全文', title: '測試裁判' })
    }));
    const setTargetJudicialField = vi.fn();
    const setIsFetchingUrl = vi.fn();
    const setUrlFetchSuccessMsg = vi.fn();
    const setRawText = vi.fn();
    const setSecondText = vi.fn();

    await fetchJudicialUrl({
      targetField: 'second',
      firstUrl: '',
      secondUrl: 'https://judicial.gov.tw/example',
      setTargetJudicialField,
      setIsFetchingUrl,
      setUrlFetchSuccessMsg,
      setRawText,
      setSecondText
    });

    expect(setTargetJudicialField).toHaveBeenCalledWith('second');
    expect(setSecondText).toHaveBeenCalledWith('裁判全文');
    expect(setRawText).not.toHaveBeenCalled();
    expect(setIsFetchingUrl).toHaveBeenNthCalledWith(1, true);
    expect(setIsFetchingUrl).toHaveBeenLastCalledWith(false);
    expect(setUrlFetchSuccessMsg).toHaveBeenLastCalledWith('✅ 已自動透過判決書資料庫帶入【測試裁判】！');
  });
});
