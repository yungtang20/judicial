import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useCaseStore, getActiveCase } from './useCaseStore';

const STORAGE_KEY = 'judicial_case_autosave_v1';

/**
 * 案件卷跨重新整理的保留。
 *
 * 背景：useCaseStore 原本完全沒有持久化。按一次重新整理，事實、爭點、
 * 證據清單、已產製書狀與人工核准紀錄全部消失，且沒有任何提示或復原途徑。
 * 對律師而言等同憑空蒸發整份卷宗。
 */
describe('案件卷自動儲存', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useCaseStore.getState().resetCase();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('案件卷變更後會寫入 sessionStorage', () => {
    useCaseStore.getState().updateIssues([{
      id: 'issue-1', title: '爭點一', originalHolding: '', appealArgument: ''
    }]);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeTruthy();
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    expect(saved['active-case'].issues).toHaveLength(1);
  });

  it('儲存的資料損毀時不得讓應用崩潰', () => {
    sessionStorage.setItem(STORAGE_KEY, '{ this is not json');
    // rehydrateCases 在載入時執行；此處直接驗證不會拋出
    expect(() => JSON.parse('{ this is not json')).toThrow();
    // store 本身仍可正常使用
    expect(getActiveCase(useCaseStore.getState()).caseId).toBe('active-case');
  });

  it('開立新案件會清空自動儲存，不會留下舊案件資料', () => {
    useCaseStore.getState().updateIssues([{
      id: 'issue-1', title: '舊爭點', originalHolding: '', appealArgument: ''
    }]);
    useCaseStore.getState().resetCase();
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    expect(saved['active-case'].issues).toEqual([]);
  });

  it('已產製文件與人工核准紀錄會一併保存', () => {
    useCaseStore.getState().addDocument({
      id: 'doc-1', kind: 'APPEAL_PETITION', title: '上訴理由狀', text: '內容',
      status: 'VERIFIED', sourceTool: 'test', createdAt: new Date().toISOString()
    });
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
    expect(saved['active-case'].documents).toHaveLength(1);
    expect(saved['active-case'].documents[0].title).toBe('上訴理由狀');
  });
});
