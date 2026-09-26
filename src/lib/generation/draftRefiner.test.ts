import { describe, expect, it } from 'vitest';
import { refineVerifiedDraft } from './draftRefiner';

describe('draftRefiner', () => {
  it('re-verifies refined citations against the whitelist', async () => {
    const result = await refineVerifiedDraft('依民法第184條請求。', '改成較正式語氣', ['民法第184條'], async () => '依民法第184條請求損害賠償。');
    expect(result.documentText).toContain('民法第184條');
  });

  it('blocks a newly introduced citation outside the whitelist with a readable message', async () => {
    // 民法第999條不是現行法條，會先被攔截器擋下（fail-closed 行為不變）
    await expect(
      refineVerifiedDraft('原草稿', '加入法條', ['民法第184條'], async () => '依民法第999條請求。')
    ).rejects.toThrow(/法律文件引用檢核未通過.*民法第999條/);
  });

  it('攔截訊息不得洩漏內部錯誤代碼給使用者', async () => {
    let message = '';
    try {
      await refineVerifiedDraft('原草稿', '加入法條', ['民法第184條'], async () => '依民法第999條請求。');
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('法律文件引用檢核未通過');
    expect(message).not.toMatch(/_REQUIRED|GHOST_CITATION|INVALID_LAW/);
  });
});
