import { describe, expect, it } from 'vitest';
import { canonicalizeRoute, isAppRoute } from './navigation';

describe('canonical UI route contract', () => {
  it('normalizes legacy route aliases into canonical sections', () => {
    expect(canonicalizeRoute('appealDeadline', 'deadline').route).toEqual({ view: 'appeal', section: 'deadline' });
    expect(canonicalizeRoute('smartAppeal').route).toEqual({ view: 'appeal', section: 'analysis' });
    expect(canonicalizeRoute('litigation', 'guide').route).toEqual({ view: 'litigation', section: 'guide' });
    expect(canonicalizeRoute('judgmentSearch').route).toEqual({ view: 'checker', section: 'local-search' });
  });

  it('maps guide prefill into facts and explicit form seed', () => {
    const result = canonicalizeRoute('legalToolbox', undefined, {
      preselectedToolId: 'UNIVERSAL_AI_PLEADING',
      prefilledData: {
        incidentDetails: '房東未退還押金',
        pleadingText: '請依租約請求返還押金'
      }
    });

    expect(result.route).toEqual({ view: 'litigation', section: 'toolbox' });
    expect(result.handoff.toolId).toBe('UNIVERSAL_AI_PLEADING');
    expect(result.handoff.facts).toBe('房東未退還押金');
    expect(result.handoff.formSeed).toEqual({
      incidentDetails: '房東未退還押金',
      pleadingText: '請依租約請求返還押金'
    });
  });
});

describe('isAppRoute guard', () => {
  it('接受所有合法的正規路由', () => {
    for (const route of [
      { view: 'analysis' },
      { view: 'process-guide' },
      { view: 'sdlc' },
      { view: 'agent-chat' },
      { view: 'litigation', section: 'guide' },
      { view: 'litigation', section: 'toolbox' },
      { view: 'litigation', section: 'defense' },
      { view: 'litigation', section: 'issues' },
      { view: 'litigation', section: 'evidence' },
      { view: 'appeal', section: 'analysis' },
      { view: 'appeal', section: 'defense' },
      { view: 'appeal', section: 'issues' },
      { view: 'appeal', section: 'evidence' },
      { view: 'appeal', section: 'deadline' },
      { view: 'checker', section: 'anti-ghost' },
      { view: 'checker', section: 'open-data' },
      { view: 'checker', section: 'local-search' }
    ]) {
      expect(isAppRoute(route)).toBe(true);
    }
  });

  it('拒絕非物件、null 與缺少 view 的輸入', () => {
    for (const value of [null, undefined, 1, 'analysis', [], true, {}, { section: 'guide' }]) {
      expect(isAppRoute(value)).toBe(false);
    }
  });

  it('需要 section 的 view 缺少 section 時一律拒絕', () => {
    expect(isAppRoute({ view: 'litigation' })).toBe(false);
    expect(isAppRoute({ view: 'appeal' })).toBe(false);
    expect(isAppRoute({ view: 'checker' })).toBe(false);
  });

  it('拒絕未知的 view 與未知的 section', () => {
    expect(isAppRoute({ view: 'unknown-view' })).toBe(false);
    expect(isAppRoute({ view: 'litigation', section: 'unknown' })).toBe(false);
    expect(isAppRoute({ view: 'appeal', section: 'guide' })).toBe(false);
    expect(isAppRoute({ view: 'checker', section: 'guide' })).toBe(false);
  });
});
