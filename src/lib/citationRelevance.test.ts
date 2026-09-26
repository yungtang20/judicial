import { describe, it, expect } from 'vitest';
import { assessInterpretationRelevance, isLiveVerified } from './citationRelevance';

const SEXUAL_CASE = '事發於民國112年11月15日晚上，我老婆趁我睡著時性交並內射，之後拿偷拍的影片威脅我';
const PROPERTY_CASE = '我上個月在租屋處退租時房東扣住五萬元押金不還，說要收清潔費但沒收據，我要求損害賠償';
const DEPRECIATION_INTERPRETATION = '法務部法律字第10803512340號函 民法第184條侵權行為之損害賠償與回復原狀費用計算要旨：若以金錢賠償修理費用者，應依固定資產耐用年數表及折舊率計算折舊。';

describe('assessInterpretationRelevance', () => {
  it('物之毀損修繕費折舊函釋不得出現在性自主案件的主要畫面', () => {
    const result = assessInterpretationRelevance({
      narrative: SEXUAL_CASE,
      text: DEPRECIATION_INTERPRETATION
    });
    expect(result.relevant).toBe(false);
    expect(result.sharedTopics).toEqual([]);
  });

  it('同一則折舊函釋在損害賠償案件仍然相關', () => {
    const result = assessInterpretationRelevance({
      narrative: PROPERTY_CASE,
      text: DEPRECIATION_INTERPRETATION
    });
    expect(result.relevant).toBe(true);
  });

  it('散布性影像函釋對偷拍案件為相關', () => {
    const result = assessInterpretationRelevance({
      narrative: '我被前伴侶偷拍私密照片並威脅要散布',
      text: '未經同意散布性影像罪，檢察官得聲請扣押設備與雲端檔案並請求刪除。'
    });
    expect(result.relevant).toBe(true);
    expect(result.sharedTopics).toContain('私密影像');
  });

  it('任一端缺文字時不得判定為相關', () => {
    expect(assessInterpretationRelevance({ narrative: '', text: '散布性影像' }).relevant).toBe(false);
    expect(assessInterpretationRelevance({ narrative: SEXUAL_CASE, text: '' }).relevant).toBe(false);
  });
});

describe('isLiveVerified', () => {
  const evidence = [
    { citation: '刑法第221條', status: 'VERIFIED' },
    { citation: '刑法第216條之1', status: 'UNAVAILABLE' }
  ];

  it('官方查核通過者為已驗證', () => {
    expect(isLiveVerified(evidence, '刑法第221條')).toBe(true);
  });

  it('查核失敗或查無此筆者一律不得進入主要分析畫面', () => {
    expect(isLiveVerified(evidence, '刑法第216條之1')).toBe(false);
    expect(isLiveVerified(evidence, '民法第767條')).toBe(false);
    expect(isLiveVerified([], '刑法第221條')).toBe(false);
  });

  it('比對時忽略罪名括號，避免已查驗法條被誤判為查無此筆', () => {
    const evidence = [{ citation: '刑法第315條之1', status: 'VERIFIED' }];
    expect(isLiveVerified(evidence, '刑法第315條之1（妨害秘密罪）')).toBe(true);
    expect(isLiveVerified(evidence, '刑法第 315 條之 1')).toBe(true);
    expect(isLiveVerified(evidence, '刑法第319條之3（未經同意散布性影像罪）')).toBe(false);
  });
});
