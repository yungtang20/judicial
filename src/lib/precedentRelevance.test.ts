import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RELEVANCE_THRESHOLD,
  filterPrecedentsByRelevance,
  getRelevantPrecedents,
  hasStatuteIntersection,
  tfidfCosineSimilarity
} from './precedentRelevance';

const walletCaseSummary = '被告與被害人為前男友女友，被告於被害人飲酒後脫衣拍攝裸露照片，事發後被害人報警。關鍵爭點在於被告是否未經同意持有私密照片，與刑法第315條之1妨害秘密罪構成要件。';
const investmentFraudSummary = '被告為假投資平台負責人，以高利誘使被害人匯入資金至人頭帳戶，嗣後關閉官網無法聯繫。經查屬假投資詐騙集團，涉刑法第339條詐欺取財罪之共同正犯。';

const walletNarrative = '我的錢包在夜店遺失，事後發現銀行帳戶被冒用提領2萬元，我並沒有提領也沒有授權，銀行簡訊才通知我。';
const legalBasis = ['刑法第339條（詐欺取財）', '刑事訴訟法第244條（告訴乃論：自知悉犯人之日起6個月內）'];

describe('precedentRelevance', () => {
  it('excludes investment-fraud precedents from a wallet-theft narrative', () => {
    const results = filterPrecedentsByRelevance(
      [{ caseNumber: 'TAITRUN-2023-刑112-字第1234號', summary: investmentFraudSummary, citedStatutes: ['刑法第339條'] }],
      walletNarrative,
      legalBasis
    );

    expect(results).toHaveLength(1);
    expect(results[0].relevant).toBe(false);
    expect(results[0].rejectionReason).not.toBeNull();
  });

  it('retains a same-domain precedent with matching statute intersection', () => {
    const results = filterPrecedentsByRelevance(
      [{ caseNumber: 'TAITRUN-2023-刑112-字第5678號', summary: walletCaseSummary, citedStatutes: ['刑法第315條之1'] }],
      '被告與被害人為前男友女友，被告於被害人飲酒後脫衣拍攝裸露照片，事發後被害人報警。',
      ['刑法第315條之1']
    );

    expect(results).toHaveLength(1);
    expect(results[0].relevant).toBe(true);
    expect(results[0].rejectionReason).toBeNull();
  });

  it('hasStatuteIntersection returns true when a common statute exists', () => {
    expect(hasStatuteIntersection(['刑法第339條'], legalBasis)).toBe(true);
    expect(hasStatuteIntersection(['民法第184條'], legalBasis)).toBe(false);
  });

  it('tfidfCosineSimilarity returns higher score for overlapping texts', () => {
    const relevant = tfidfCosineSimilarity(walletCaseSummary, '被害人飲酒後被拍攝裸露照片，報警，刑法315條之1');
    const irrelevant = tfidfCosineSimilarity(investmentFraudSummary, '被害人飲酒後被拍攝裸露照片，報警，刑法315條之1');
    expect(relevant).toBeGreaterThan(irrelevant);
  });

  it('getRelevantPrecedents filters out irrelevant case numbers', () => {
    const arr = [
      { caseNumber: 'A', summary: investmentFraudSummary, citedStatutes: ['刑法第339條'] },
      { caseNumber: 'B', summary: walletCaseSummary, citedStatutes: ['刑法第315條之1'] }
    ];
    const relevant = getRelevantPrecedents(arr, investmentFraudSummary, legalBasis);
    expect(relevant).toContain('A');
    expect(relevant).not.toContain('B');
  });

  it('returns zero kept entries when none are relevant (fail-closed)', () => {
    const results = filterPrecedentsByRelevance(
      [{ caseNumber: 'X', summary: investmentFraudSummary, citedStatutes: ['民法第1條'] }],
      walletNarrative,
      legalBasis
    );

    expect(results[0].relevant).toBe(false);
    expect(results[0].rejectionReason).not.toBeNull();
  });
});
