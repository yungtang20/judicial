import { describe, it, expect } from 'vitest';
import { isSameCaseNumber, looksLikeCaseNumber, normalizeCaseNumber } from './caseNumberMatch';

describe('裁判字號比對', () => {
  it('正規化會去除空白、標點與臺/台差異', () => {
    expect(normalizeCaseNumber('臺灣臺北地方法院 113 年度訴字第 1234 號')).toBe('台灣台北地方法院113年度訴字第1234號');
  });

  it('辨識出裁判字號型態的查詢', () => {
    expect(looksLikeCaseNumber('最高法院98年度台上字第1045號')).toBe(true);
    expect(looksLikeCaseNumber('臺灣臺北地方法院 113 年度訴字第 1234 號')).toBe(true);
    expect(looksLikeCaseNumber('租賃押金返還')).toBe(false);
    expect(looksLikeCaseNumber('如何申請保護令')).toBe(false);
  });

  it('年度、字別、號次相同即視為同一裁判（法院名稱不列入比對）', () => {
    expect(isSameCaseNumber('最高法院98年度台上字第1045號', '最高法院 98 年度台上字第 1045 號')).toBe(true);
    expect(isSameCaseNumber('最高法院98年度台上字第1045號', '最高法院98年度台上字第1046號')).toBe(false);
    expect(isSameCaseNumber('最高法院98年度台上字第1045號', '最高法院99年度台上字第1045號')).toBe(false);
    expect(isSameCaseNumber('臺灣臺南地方法院115年度訴字第1203號', '最高法院98年度台上字第1045號')).toBe(false);
  });

  it('無法解析的輸入不會被判為同一裁判', () => {
    expect(isSameCaseNumber('租賃押金', '租賃押金')).toBe(false);
    expect(isSameCaseNumber('', '')).toBe(false);
  });
});
