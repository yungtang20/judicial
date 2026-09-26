import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AntiGhostBadge } from './AntiGhostBadge';

/**
 * 引用掃描徽章必須如實反映查核結果。
 *
 * 實測：標題列硬寫「0 處幽靈」且固定用綠色打勾，即使文件確實含有幽靈法條
 * 也照樣宣稱零幽靈，與下方逐條明細自相矛盾。律師只 glance 標題就會以為文件乾淨。
 */
describe('引用掃描徽章反映實際結果', () => {
  it('有幽靈法條時不得宣稱零幽靈', () => {
    render(
      <AntiGhostBadge
        verification={{
          totalCitationsChecked: 5,
          ghostCitationsFound: 2,
          verifiedCitations: [
            { citationText: '民法第479條', verified: true, isGhostOrFake: false } as never,
            { citationText: '民法第9999條', verified: false, isGhostOrFake: true } as never
          ]
        }}
      />
    );
    expect(screen.getByText(/2 處幽靈法條/)).toBeTruthy();
    expect(screen.queryByText(/· 0 處幽靈/)).toBeNull();
  });

  it('精簡模式有幽靈時必須以警示呈現，不得顯示綠色已核實', () => {
    render(
      <AntiGhostBadge
        compact
        verification={{
          totalCitationsChecked: 3,
          ghostCitationsFound: 1,
          verifiedCitations: [{ citationText: '民法第9999條', verified: false, isGhostOrFake: true } as never]
        }}
      />
    );
    expect(screen.getByText(/1 處幽靈/)).toBeTruthy();
    expect(screen.queryByText(/處核實/)).toBeNull();
  });

  it('完全驗證通過時才顯示綠色與零幽靈', () => {
    render(
      <AntiGhostBadge
        verification={{
          totalCitationsChecked: 2,
          ghostCitationsFound: 0,
          verifiedCitations: [
            { citationText: '民法第479條', verified: true, isGhostOrFake: false } as never,
            { citationText: '民法第184條', verified: true, isGhostOrFake: false } as never
          ]
        }}
      />
    );
    expect(screen.getByText(/0 處幽靈/)).toBeTruthy();
  });

  it('有未查證但非幽靈的引用時必須提示人工確認', () => {
    render(
      <AntiGhostBadge
        verification={{
          totalCitationsChecked: 4,
          ghostCitationsFound: 0,
          verifiedCitations: [
            { citationText: '民法第479條', verified: true, isGhostOrFake: false } as never,
            { citationText: '民法第1000條', verified: false, isGhostOrFake: false } as never
          ]
        }}
      />
    );
    expect(screen.getByText(/未查證/)).toBeTruthy();
  });
});
