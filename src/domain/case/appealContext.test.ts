import { describe, expect, it } from 'vitest';
import { buildAppealContext } from './appealContext';

describe('appeal context handoff', () => {
  it('fills missing canonical fields from cross-feature context', () => {
    const context = buildAppealContext(
      { facts: '統一分析案情' },
      {
        timestamp: Date.now(),
        sourceTool: 'unified',
        domain: '刑事',
        cause: '詐欺罪',
        scenarioKeywords: '詐欺',
        issuesSummary: '有事證'
      }
    );

    expect(context).toMatchObject({
      facts: '統一分析案情',
      domain: '刑事',
      cause: '詐欺罪',
      issuesSummary: '有事證'
    });
  });
});
