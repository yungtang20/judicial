import { describe, expect, it } from 'vitest';
import { filterScenarios, matchesSafetyQuery } from './scenarioSearch';
import type { ScenarioItem } from './ScenarioDetailModal';

const scenario = (overrides: Partial<ScenarioItem>): ScenarioItem => ({
  id: 'scenario',
  category: 'DEBT',
  icon: (() => null) as never,
  color: '',
  title: '借錢不還',
  plainDesc: '朋友欠款未清償',
  situation: '有借據與轉帳紀錄',
  recommendedAction: '寄發存證信函',
  targetToolId: 'legalToolbox',
  feeInfo: '',
  timeInfo: '',
  mustPrepare: [],
  tags: ['借據', '存證信函'],
  ...overrides
});

describe('scenario search helpers', () => {
  const scenarios = [
    scenario({ id: 'debt' }),
    scenario({ id: 'safety', category: 'SAFETY', title: '遭到性侵', tags: ['性侵', '保護令'] })
  ];

  it('filters by category and direct text', () => {
    expect(filterScenarios(scenarios, 'DEBT', '借錢')).toHaveLength(1);
    expect(filterScenarios(scenarios, 'SAFETY', '')[0].id).toBe('safety');
  });

  it('supports reverse tag and token matching', () => {
    expect(filterScenarios(scenarios, 'ALL', '我想要存證信函')).toHaveLength(1);
    expect(filterScenarios(scenarios, 'ALL', '我被我女友性侵了')).toHaveLength(1);
  });

  it('detects safety queries from category or safety keywords', () => {
    expect(matchesSafetyQuery('', 'SAFETY')).toBe(true);
    expect(matchesSafetyQuery('想申請保護令', 'ALL')).toBe(true);
    expect(matchesSafetyQuery('欠錢不還', 'ALL')).toBe(false);
  });
});
