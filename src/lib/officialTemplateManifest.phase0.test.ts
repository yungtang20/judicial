import { describe, expect, it } from 'vitest';
import {
  classifyTemplateP9Readiness,
  getTemplateP9Baseline,
  getTemplateById,
} from './officialTemplateManifest';

describe('official template Phase 0 baseline', () => {
  it('loads legacy manifest entries as P9_NOT_CONFIGURED', () => {
    const template = getTemplateById('judicial-0202-1');
    expect(template).not.toBeNull();
    expect(template!.p9Status).toBe('P9_NOT_CONFIGURED');
  });

  it('does not treat READY_FOR_MERGE as P9_READY', () => {
    const template = getTemplateById('judicial-0202-1')!;
    const result = classifyTemplateP9Readiness({
      ...template,
      templateStatus: 'READY_FOR_MERGE',
      p9Status: 'P9_NOT_CONFIGURED',
      p9ProfileId: undefined,
      p9ProfileVersion: undefined,
    });

    expect(result.status).toBe('P9_NOT_CONFIGURED');
    expect(result.reasons).toContain('P9_PROFILE_NOT_CONFIGURED');
  });

  it('reports the current manifest baseline without promoting templates', () => {
    const baseline = getTemplateP9Baseline();

    expect(baseline.total).toBeGreaterThan(600);
    expect(baseline.byStatus.P9_READY).toBe(0);
    expect(baseline.byStatus.P9_NOT_CONFIGURED).toBe(baseline.total);
  });
});
