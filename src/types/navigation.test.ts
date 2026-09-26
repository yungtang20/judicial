import { describe, expect, it } from 'vitest';
import { canonicalizeRoute } from './navigation';

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
