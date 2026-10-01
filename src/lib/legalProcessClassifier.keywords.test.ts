import { describe, it, expect } from 'vitest';
import { filterSensitiveKeywords } from './legalProcessClassifier';

/**
 * 實測缺陷：當事人輸入「我丈夫剛才打我，說要殺我，我現在很害怕」，
 * 畫面顯示「尚無特定風險關鍵詞」。
 *
 * 原因：DOMESTIC_KEYWORDS 收的是「毆打」「打人」「威脅要殺」這類固定詞組，
 * 當事人不會這樣寫；DOMESTIC_ASSAULT_PATTERNS 的動詞清單也沒有「打」，
 * 且完全沒有致死威脅的樣式。
 *
 * 這個測試同時守住另一個方向：不能為了抓到這些說法而放寬比對，
 * 讓不曾受暴的人看到家庭暴力警示（「打他電話」是最典型的陷阱）。
 */
describe('敏感關鍵詞篩查', () => {
  const 篩 = (t: string) => filterSensitiveKeywords(t);

  describe('應當被偵測到的危機敘述', () => {
    it('毆打搭配致死威脅的自然說法', () => {
      const r = 篩('我丈夫剛才打我，說要殺我，我現在很害怕');
      expect(r.hasDomesticViolenceKeywords).toBe(true);
      expect(r.hasThreatHarassmentKeywords).toBe(true);
      expect(r.detectedKeywords.length).toBeGreaterThan(0);
    });

    it('「打我」「打了我」這類口語說法', () => {
      expect(篩('他昨天打了我').hasDomesticViolenceKeywords).toBe(true);
      expect(篩('他打我一下').hasDomesticViolenceKeywords).toBe(true);
    });

    it('各種致死威脅的說法', () => {
      expect(篩('他揚言要殺我').hasThreatHarassmentKeywords).toBe(true);
      expect(篩('他要打死我').hasThreatHarassmentKeywords).toBe(true);
      expect(篩('他說我會死得很難看').hasThreatHarassmentKeywords).toBe(true);
    });

    it('限制人身自由', () => {
      expect(篩('他不讓我出門').hasThreatHarassmentKeywords).toBe(true);
    });

    it('既有分類仍正常運作', () => {
      expect(篩('他用手摸我胸部').hasSexualAssaultKeywords).toBe(true);
      expect(篩('他威脅散布我的私密照').hasPrivateMediaKeywords).toBe(true);
      expect(篩('我被下藥後不省人事').hasIncapacitatedKeywords).toBe(true);
    });
  });

  describe('不應被誤判的無辜敘述', () => {
    it('打電話不會被當成毆打', () => {
      const r = 篩('我打他電話他都沒接，我只好打給律師');
      expect(r.hasDomesticViolenceKeywords).toBe(false);
    });

    it('「打了三通電話」「打完報告」不觸發', () => {
      expect(篩('我打了三通電話給銀行').hasDomesticViolenceKeywords).toBe(false);
      expect(篩('我打完報告才下班').hasDomesticViolenceKeywords).toBe(false);
    });

    it('房東押金糾紛不會被當成家暴', () => {
      const r = 篩('房東不退還三萬元押金，租約已到期，我有收據');
      expect(r.hasDomesticViolenceKeywords).toBe(false);
      expect(r.hasThreatHarassmentKeywords).toBe(false);
    });

    it('一般民事與消費爭議不觸發', () => {
      expect(篩('店家賣给我的筆電三天就壞了').hasDomesticViolenceKeywords).toBe(false);
      expect(篩('收到一張闖紅燈罰單').hasThreatHarassmentKeywords).toBe(false);
    });

    it('「我要殺青」這類非暴力用語不誤判', () => {
      // 「殺」後面接的不是人稱代名詞，樣式不應命中
      const r = 篩('我要殺青這部電影');
      expect(r.hasThreatHarassmentKeywords).toBe(false);
    });

    it('空白輸入不產生任何判定', () => {
      const r = 篩('');
      expect(r.detectedKeywords).toEqual([]);
      expect(r.hasDomesticViolenceKeywords).toBe(false);
      expect(r.hasThreatHarassmentKeywords).toBe(false);
    });
  });
});