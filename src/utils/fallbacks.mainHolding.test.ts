import { describe, expect, it } from 'vitest';
import { buildFallbackJudgmentAnalysis } from './fallbacks';

/**
 * 裁判主文不得捏造。
 *
 * 實測：輸入「主文：被告有期徒刑三個月」，輸出 mainHolding 為
 * 「處有期徒刑 6 月，如易科罰金，以新臺幣 1,000 元折算 1 日。」
 *
 * 成因有兩層：
 * 1. 抽取正則要求「主文」之後必須換行，
 *    「主文：…」這種同一行用冒號的常見寫法抽不到。
 * 2. 抽不到就直接填入寫死的範例句，
 *    等於把提示詞的範例刑期當成這個案件的判決結果。
 *
 * 刑期直接影響能不能上訴、是不是加重或減輕，捏造的後果遠大於留白。
 * 前端對空值已有明確提示，不會因為改成留白而壞掉。
 */

describe('降級模式的裁判主文', () => {
  it('抽不到主文時不得填入範例句', () => {
    const 結果 = buildFallbackJudgmentAnalysis('臺灣臺北地方法院刑事判決書，主文：被告有期徒刑三個月。');
    // 關鍵：不得出現範例句裡的刑期
    expect(結果.judgmentSummary.mainHolding).not.toContain('有期徒刑 6 月');
    expect(結果.judgmentSummary.mainHolding).not.toContain('1,000 元折算');
  });

  it('抽不到主文時標示來源為 NOT_FOUND', () => {
    const 結果 = buildFallbackJudgmentAnalysis('臺灣臺北地方法院刑事判決書。');
    expect(結果.mainHoldingSource).toBe('NOT_FOUND');
  });

  it('同一行的「主文：」寫法必須能被抽到', () => {
    const 結果 = buildFallbackJudgmentAnalysis('臺灣臺北地方法院刑事判決書，主文：被告有期徒刑三個月。');
    expect(結果.mainHoldingSource).toBe('EXTRACTED');
    expect(結果.judgmentSummary.mainHolding).toContain('有期徒刑三個月');
  });

  it('換行後的正式主文格式也能抽到', () => {
    const 判決書 = [
      '臺灣臺北地方法院刑事判決',
      '主　文',
      '被告蔡○○，犯竊盜罪，處有期徒刑八個月。',
      '事實及理由',
      '本院查明確有竊盜犯行。',
    ].join('\n');
    const 結果 = buildFallbackJudgmentAnalysis(判決書);
    expect(結果.mainHoldingSource).toBe('EXTRACTED');
    expect(結果.judgmentSummary.mainHolding).toContain('八個月');
  });

  it('抽取的主文必須忠於原文', () => {
    const 判決書 = '刑事判決\n主文\n被告處有期徒刑十五年。\n事實及理由\n略';
    const 結果 = buildFallbackJudgmentAnalysis(判決書);
    expect(結果.judgmentSummary.mainHolding).toBe('被告處有期徒刑十五年。');
  });

  it('主文不得連同下一個段落一起被抽進來', () => {
    // 修正前單行寫法貪婪吃到行尾，會把「事實及理由」當成主文。
    // 使用者在畫面上看到「被告有期徒刑三個月。事實及理由：被告於民國…」
    // 根本不知道判決結果到底是哪一句。
    const 單行 = '臺灣臺北地方法院刑事判決書，主文：被告有期徒刑三個月。事實及理由：被告於民國113年3月1日竊取財物。';
    const 結果 = buildFallbackJudgmentAnalysis(單行);
    expect(結果.judgmentSummary.mainHolding).toBe('被告有期徒刑三個月。');
    expect(結果.judgmentSummary.mainHolding).not.toContain('事實及理由');
  });

  it('主文後接中華民國日期時也要停止', () => {
    const 文本 = '刑事判決\n主文\n被告處有期徒刑三個月。\n中華民國115年3月15日\n事實及理由\n略';
    const 結果 = buildFallbackJudgmentAnalysis(文本);
    expect(結果.judgmentSummary.mainHolding).toBe('被告處有期徒刑三個月。');
    expect(結果.judgmentSummary.mainHolding).not.toContain('中華民國');
  });

  it('單行結尾無後續段落時取到行尾', () => {
    const 結果 = buildFallbackJudgmentAnalysis('主文：原告之訴駁回。');
    expect(結果.mainHoldingSource).toBe('EXTRACTED');
    expect(結果.judgmentSummary.mainHolding).toBe('原告之訴駁回。');
  });

  it('行政案件不得套用民事的判決主文', () => {
    // 先前 isAdmin 分支填的是「原告之訴駁回」——那是民事用語，
    // 行政訴訟沒有「原告之訴」這種訴的型態。
    const 結果 = buildFallbackJudgmentAnalysis('臺灣臺北高等行政判決書，訴願決定書。');
    expect(結果.judgmentSummary.mainHolding).not.toContain('原告之訴駁回');
  });

  it('案號與裁判日期抓不到時維持空白，不得捏造', () => {
    const 結果 = buildFallbackJudgmentAnalysis('某判決書，內容不明。');
    expect(結果.caseNo).toBe('');
    expect(結果.judgeDate).toBe('');
  });

  it('降級結果必須明確揭露是本機範本', () => {
    const 結果 = buildFallbackJudgmentAnalysis('臺灣臺北地方法院刑事判決書。');
    expect(結果.isLocalFallback).toBe(true);
    expect(結果.fallbackNotice).toContain('固定範本');
    // 說明也要涵蓋主文，讓使用者知道主文欄位同樣不可直接引用
    expect(結果.fallbackNotice).toContain('主文');
  });
});
