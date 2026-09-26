import { describe, it, expect } from 'vitest';
import {
  FORENSIC_WINDOW_HOURS,
  buildForensicGuidance,
  extractIncidentDate,
  isWithinForensicWindow
} from './forensicGuidance';

describe('extractIncidentDate', () => {
  it('抽取民國年份的案情日期', () => {
    const result = extractIncidentDate('事發於民國112年11月15日晚上約11點，在台北市信義區');
    expect(result.source).toBe('ROC');
    expect(result.raw).toBe('民國112年11月15日');
    expect(result.date?.getFullYear()).toBe(2023);
    expect(result.date?.getMonth()).toBe(10);
    expect(result.date?.getDate()).toBe(15);
  });

  it('省略「民國」二字的三位數年份仍視為民國', () => {
    expect(extractIncidentDate('112年3月2日發生').date?.getFullYear()).toBe(2023);
  });

  it('西元年份優先於民國判讀', () => {
    const result = extractIncidentDate('2023年11月15日');
    expect(result.source).toBe('AD');
    expect(result.date?.getFullYear()).toBe(2023);
  });

  it('拒絕不存在的日期', () => {
    expect(extractIncidentDate('民國112年2月30日').date).toBeNull();
    expect(extractIncidentDate('民國112年13月1日').date).toBeNull();
  });

  it('沒有日期時回傳 null 而非擲錯', () => {
    expect(extractIncidentDate('我昨天被房东扣押金')).toEqual({ date: null, raw: null, source: null });
    expect(extractIncidentDate('')).toEqual({ date: null, raw: null, source: null });
  });
});

describe('isWithinForensicWindow', () => {
  const now = new Date(2026, 8, 26, 12, 0, 0);

  it('事發後 72 小時內視為在時效內', () => {
    expect(isWithinForensicWindow(new Date(2026, 8, 24, 12, 0, 0), now)).toBe(true);
    expect(isWithinForensicWindow(new Date(2026, 8, 23, 12, 0, 1), now)).toBe(true);
  });

  it('超過 72 小時即失效（本案為 2023 年舊案）', () => {
    expect(isWithinForensicWindow(new Date(2023, 10, 15, 23, 0, 0), now)).toBe(false);
    expect(FORENSIC_WINDOW_HOURS).toBe(72);
  });

  it('日期在未來時一律視為失效（fail-closed）', () => {
    expect(isWithinForensicWindow(new Date(2026, 9, 1), now)).toBe(false);
  });

  it('抽取不到日期時一律失效（fail-closed）', () => {
    expect(isWithinForensicWindow(null, now)).toBe(false);
  });
});

describe('buildForensicGuidance', () => {
  it('時效內使用急迫語彙', () => {
    const guidance = buildForensicGuidance(true);
    expect(guidance.withinWindow).toBe(true);
    expect(guidance.preservationTips.join('')).toContain('黃金72小時');
    expect(guidance.immediateSteps[1]).toContain('採證');
  });

  it('時效已過時改用數位事證導向語彙，且不得出現急迫指令', () => {
    const guidance = buildForensicGuidance(false);
    expect(guidance.withinWindow).toBe(false);
    expect(guidance.preservationTips.join('')).toContain('保存時效可能已過');
    expect(guidance.preservationTips.join('')).not.toContain('黃金72小時');
    expect(guidance.preservationTips.join('')).not.toContain('切勿沐浴更衣');
    expect(guidance.timeLimitSuffix).toContain('數位事證');
  });

  it('兩種分支都必須保留數位事證保全要求', () => {
    for (const withinWindow of [true, false]) {
      expect(buildForensicGuidance(withinWindow).preservationTips.join('')).toContain('數位事證');
    }
  });
});
