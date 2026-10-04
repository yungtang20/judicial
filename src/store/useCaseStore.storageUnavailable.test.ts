import { afterEach, describe, expect, it, vi } from 'vitest';

const sessionStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage');

afterEach(() => {
  vi.resetModules();
  if (sessionStorageDescriptor) {
    Object.defineProperty(window, 'sessionStorage', sessionStorageDescriptor);
  }
});

describe('案件卷儲存區不可存取時', () => {
  it('getter 拋出 SecurityError 時仍可載入並更新案件卷', async () => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('Storage access denied', 'SecurityError');
      }
    });
    vi.resetModules();

    const { useCaseStore, getActiveCase } = await import('./useCaseStore');
    useCaseStore.getState().updateIssues([{
      id: 'issue-private-mode',
      title: '無法存取儲存區時仍可編輯',
      originalHolding: '',
      appealArgument: ''
    }]);

    expect(getActiveCase(useCaseStore.getState()).issues).toMatchObject([
      { id: 'issue-private-mode', title: '無法存取儲存區時仍可編輯' }
    ]);
  });
});
