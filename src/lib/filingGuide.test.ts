import { describe, expect, it } from 'vitest';
import { buildFilingGuide } from './filingGuide';

describe('filingGuide', () => {
  it('numbers exhibits and keeps court/fee claims qualified', () => {
    const guide = buildFilingGuide({ exhibitNames: ['借據', '對話紀錄'] });
    expect(guide.exhibits).toEqual(['證物1：借據', '證物2：對話紀錄']);
    expect(guide.feeHint).toContain('重新試算');
  });
});
