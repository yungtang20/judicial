import { describe, expect, it } from 'vitest';
import {
  formatFlywheelReport,
  summarizeAuditFailures,
  topFailureGroups,
  type FlywheelLogInput
} from './auditFlywheel';

const SAMPLE: FlywheelLogInput[] = [
  { action: 'POST', resource: '/api/toolbox/generate', status: 'FAILURE', statusCode: 422 },
  { action: 'POST', resource: '/api/toolbox/generate', status: 'FAILURE', statusCode: 422 },
  { action: 'POST', resource: '/api/toolbox/generate', status: 'FAILURE', statusCode: 422 },
  { action: 'POST', resource: '/api/generate-appeal-petition', status: 'DENIED', statusCode: 403 },
  { action: 'POST', resource: '/api/generate-appeal-petition', status: 'DENIED', statusCode: 403 },
  { action: 'GET', resource: '/api/health', status: 'SUCCESS', statusCode: 200 }
];

describe('稽核資料飛輪', () => {
  it('只排失敗不排成功，並由多到少排序', () => {
    const summary = summarizeAuditFailures(SAMPLE);
    expect(summary.total).toBe(6);
    expect(summary.failureCount).toBe(5);
    expect(summary.failureRate).toBeCloseTo(5 / 6);
    expect(summary.groups).toHaveLength(2);
    expect(summary.groups[0]).toMatchObject({
      action: 'POST',
      resource: '/api/toolbox/generate',
      count: 3
    });
    expect(summary.groups[0]?.share).toBeCloseTo(3 / 5);
    expect(summary.groups[1]).toMatchObject({ count: 2 });
  });

  it('空輸入不爆炸，回傳零失敗摘要', () => {
    const summary = summarizeAuditFailures([]);
    expect(summary.total).toBe(0);
    expect(summary.failureCount).toBe(0);
    expect(summary.groups).toEqual([]);
    expect(formatFlywheelReport(summary)).toContain('無失敗紀錄');
  });

  it('全成功時排名為空，失敗率為零', () => {
    const summary = summarizeAuditFailures([
      { action: 'GET', resource: '/api/health', status: 'SUCCESS', statusCode: 200 }
    ]);
    expect(summary.failureCount).toBe(0);
    expect(summary.groups).toEqual([]);
  });

  it('一次只取前 N 名，報告點名第一名', () => {
    const summary = summarizeAuditFailures(SAMPLE);
    const top = topFailureGroups(summary, 1);
    expect(top).toHaveLength(1);
    expect(top[0]?.resource).toBe('/api/toolbox/generate');
    const report = formatFlywheelReport(summary, 5);
    expect(report).toContain('/api/toolbox/generate');
    expect(report).toContain('60.0%');
  });
});
