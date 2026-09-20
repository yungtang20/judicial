import { describe, it, expect } from 'vitest';
import { formatLegalChapter, formatVerificationStatus } from './legalChapterLabels';

describe('legalChapterLabels', () => {
  it('translates DOMESTIC_VIOLENCE_PROTECTION to Traditional Chinese', () => {
    expect(formatLegalChapter('DOMESTIC_VIOLENCE_PROTECTION')).toBe(
      '家庭暴力防治法（民事保護令與家暴防治專章）'
    );
  });

  it('translates other English category enums correctly', () => {
    expect(formatLegalChapter('CRIMINAL_COMPLAINT_SEXUAL_ASSAULT')).toBe('刑法妨害性自主罪章');
    expect(formatLegalChapter('CIVIL_TORT_GENERAL')).toBe('民法侵權行為損害賠償專節');
    expect(formatLegalChapter('LABOR_DISPUTE')).toBe('勞動基準法與勞資爭議處理法專章');
  });

  it('preserves existing Chinese chapter strings', () => {
    expect(formatLegalChapter('刑法第339條詐欺罪章')).toBe('刑法第339條詐欺罪章');
  });

  it('translates verification statuses into Traditional Chinese', () => {
    expect(formatVerificationStatus('PASS')).toContain('可以使用');
    expect(formatVerificationStatus('NEEDS_REVIEW')).toContain('僅供參考');
    expect(formatVerificationStatus('FAIL')).toContain('不可使用');
  });
});
