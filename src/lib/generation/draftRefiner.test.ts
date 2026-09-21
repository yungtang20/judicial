import { describe, expect, it } from 'vitest';
import { refineVerifiedDraft } from './draftRefiner';

describe('draftRefiner', () => {
  it('re-verifies refined citations against the whitelist', async () => {
    const result = await refineVerifiedDraft('依民法第184條請求。', '改成較正式語氣', ['民法第184條'], async () => '依民法第184條請求損害賠償。');
    expect(result.documentText).toContain('民法第184條');
  });

  it('blocks a newly introduced citation outside the whitelist', async () => {
    await expect(refineVerifiedDraft('原草稿', '加入法條', ['民法第184條'], async () => '依民法第999條請求。')).rejects.toThrow('GHOST_CITATION_BLOCKED');
  });
});
