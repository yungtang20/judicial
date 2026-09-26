import { describe, it, expect } from 'vitest';
import { assessGrounding } from './groundingAssessment';

describe('assessGrounding', () => {
  it('提煉內容與原文用詞高度重疊時不警示', () => {
    const source = '原告張小明主張被告借款新臺幣50萬元未償還，請求返還本金及利息。';
    const generated = '原告張小明主張被告借款新臺幣50萬元未償還，請求返還本金及利息。';
    const result = assessGrounding(source, generated);
    expect(result.coverage).toBeGreaterThan(0.5);
    expect(result.likelyUngrounded).toBe(false);
    expect(result.warning).toBeNull();
  });

  it('原文極薄而提煉內容長篇時必須警示', () => {
    // 實測情境：29 字元無意義原文，模型卻產出長篇捏造事實
    const source = 'Civil Judgment 112t4W,1234_';
    const generated = '原審法院於言詞辯論終結後，經調查證人證言與通訊對話紀錄，認為被告辯解與經驗法則不符，遂為不利於被告之認定的刑事或侵權事實。';
    const result = assessGrounding(source, generated);
    expect(result.likelyUngrounded).toBe(true);
    expect(result.warning).toContain('逐句核對');
  });

  it('原文為空但產出內容時必須警示（不得默認可信）', () => {
    const result = assessGrounding('', '任意生成的事實敘述');
    expect(result.likelyUngrounded).toBe(true);
    expect(result.warning).toBeTruthy();
  });

  it('兩者皆空時不警示', () => {
    const result = assessGrounding('', '');
    expect(result.likelyUngrounded).toBe(false);
    expect(result.warning).toBeNull();
  });

  it('英文內容也能比對', () => {
    const result = assessGrounding('The plaintiff claimed damages under Article 184', 'The plaintiff claimed damages');
    expect(result.likelyUngrounded).toBe(false);
  });
});
