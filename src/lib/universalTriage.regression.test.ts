import { describe, expect, it } from 'vitest';
import { evaluateNarrativeCompleteness, enforceTriageConsistency } from './universalTriage';

describe('universalTriage regression: 提領方式與身分證遺失指引', () => {
  it('flags missing transaction method when a card dispute has no method specified', () => {
    const result = evaluateNarrativeCompleteness('我在夜店遺失錢包，事後發現銀行帳戶被持卡人提領2萬元，對方沒有說明提領方式。');
    const labels = result.missingElements.join('|');
    expect(labels).toContain('提領方式');
  });

  it('does not flag missing transaction method when method is given', () => {
    const result = evaluateNarrativeCompleteness('我的信用卡被盜刷，透過網路簽帳每月一筆Mobike會費被扣款，有明確經過網路交易。');
    const labels = result.missingElements.join('|');
    expect(labels).not.toContain('提領方式');
  });

  it('adds 戶政掛失 guidance when identity documents are lost with the wallet', () => {
    const payload: any = {
      isComplete: false,
      missingElements: [],
      suggestedActions: ['先報案'],
      legalBasis: ['刑法第339條（詐欺取財）'],
      statuteOfLimitations: '詐欺告訴乃論6個月',
      litigationNatureText: '刑事告訴乃論',
      caseType: 'CRIMINAL_COMPLAINT_FRAUD',
      category: '刑事案件',
      isSensitive: false,
      protectionNotice: '',
      recommendedToolId: 'CRIMINAL_COMPLAINT_FRAUD',
      identifiedIssue: '詐欺取財'
    };
    const query = '我的信用卡與金融卡被盜刷，錢包也不見，身分證健保卡都被拿走，我並沒有刷卡交易。';
    const result = enforceTriageConsistency(payload, query);
    const actions = (result.suggestedActions || []).join('|');
    expect(actions).toContain('戶政');
  });
});
