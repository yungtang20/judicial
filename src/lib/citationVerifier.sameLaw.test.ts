import { describe, it, expect } from 'vitest';
import { resolveSameLawShortForms, verifyLegalCitations } from './citationVerifier';

describe('resolveSameLawShortForms', () => {
  it('把「準用同法第X條」還原為前文所指的法條', () => {
    expect(resolveSameLawShortForms('依民事訴訟法第567條規定，準用同法第569條之規定。'))
      .toBe('依民事訴訟法第567條規定，民事訴訟法第569條之規定。');
  });

  it('還原時保留項次與款次', () => {
    expect(resolveSameLawShortForms('依民事訴訟法第244條規定，準用同法第245條第2項第3款。'))
      .toBe('依民事訴訟法第244條規定，民事訴訟法第245條第2項第3款。');
  });

  it('連續多個簡稱各自指向最近的前文法條', () => {
    expect(resolveSameLawShortForms('依民法第184條、同法第185條。'))
      .toBe('依民法第184條、民法第185條。');
  });

  it('全文未出現明確法名時維持原樣，維持 fail-closed', () => {
    const text = '準用同法第567條之規定。';
    expect(resolveSameLawShortForms(text)).toBe(text);
    const result = verifyLegalCitations(text);
    expect(result.ghostCount).toBe(0);
    // 未還原者仍會被判為未驗證，不得靜默放行
    expect(result.results.some(citation => !citation.verified)).toBe(true);
  });

  it('不含簡稱的文件不受影響', () => {
    const text = '依民法第184條及第195條請求損害賠償。';
    expect(resolveSameLawShortForms(text)).toBe(text);
  });

  it('空字串安全處理', () => {
    expect(resolveSameLawShortForms('')).toBe('');
  });
});

describe('同法簡稱不會被誤判為幽靈引用', () => {
  it('還原後的引用不得殘留「同法」字樣', () => {
    const result = verifyLegalCitations('依民事訴訟法第567條規定，準用同法第569條之規定。');
    expect(result.results.map(citation => citation.citationText).filter(text => text.includes('同法'))).toEqual([]);
    expect(result.ghostCount).toBe(0);
  });

  it('還原後的引用帶有明確法名，可交由官方即時查核升級', () => {
    const result = verifyLegalCitations('依民事訴訟法第567條規定，準用同法第569條之規定。');
    const citations = result.results.map(citation => citation.citationText);
    expect(citations).toContain('民事訴訟法第567條');
    expect(citations).toContain('民事訴訟法第569條');
  });
});
