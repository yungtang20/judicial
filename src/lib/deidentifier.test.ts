import { describe, it, expect } from 'vitest';
import { scrubPersonalInfo } from './deidentifier';

/**
 * 實測缺陷：在上訴流程對判決書按下「一鍵去識別化」，
 *
 *   一、被告應給付原告新臺幣5萬元。
 *
 * 會變成
 *
 *   一、被◯◯◯原告新臺幣5萬元。
 *
 * 原因是姓名遮蔽的正則從「原告」往前貪婪抓 4 個中文字，
 * 抓到的是「告應給付」——整段判決主文被當成姓名遮掉。
 * 被破壞的判決主文接著會送去 AI 分析，等於讓 AI 讀到錯誤的法律事實。
 *
 * 另一種破壞是日期：「民國112年3月1日被告未到庭」
 * 會變成「民國112年3月1◯◯◯被告未到庭」。
 *
 * 這些測試同時守住另一個方向：修正邊界規則之後，
 * 不能讓「證人王小明先生」這類寫法反而漏遮。
 */
describe('裁判書去識別化', () => {
  describe('不得破壞法律文字', () => {
    it('判決主文完整保留', () => {
      const 原文 = '一、被告應給付原告新臺幣5萬元。';
      expect(scrubPersonalInfo(原文)).toBe(原文);
    });

    it('日期中的「日」不會被當成姓名吃掉', () => {
      expect(scrubPersonalInfo('民國112年3月1日被告未到庭'))
        .toBe('民國112年3月1日被告未到庭');
      expect(scrubPersonalInfo('於112年5月20日原告提出告訴'))
        .toBe('於112年5月20日原告提出告訴');
    });

    it('含日期與稱謂的敘述不變', () => {
      const 原文 = '被告李小姐於民國112年3月1日毆打原告陳先生。';
      expect(scrubPersonalInfo(原文)).toBe(原文);
    });

    it('判決確定日期不變', () => {
      expect(scrubPersonalInfo('判決於110年12月30日確定')).toBe('判決於110年12月30日確定');
    });

    it('公訴與訴請等法律用語不變', () => {
      expect(scrubPersonalInfo('公訴人對被告提起公訴')).toBe('公訴人對被告提起公訴');
      expect(scrubPersonalInfo('主張侵權行為之原告認為訴請不應被駁回'))
        .toBe('主張侵權行為之原告認為訴請不應被駁回');
      expect(scrubPersonalInfo('原告王小明訴請被告張大華給付新臺幣50萬元。'))
        .toBe('原告王小明訴請被告張大華給付新臺幣50萬元。');
    });
  });

  describe('仍須遮蔽的個資', () => {
    it('稱謂前的姓名', () => {
      expect(scrubPersonalInfo('王大明先生')).toBe('◯◯◯先生');
      expect(scrubPersonalInfo('李美玲女士')).toBe('◯◯◯女士');
    });

    it('角色詞後的姓名不能因為邊界規則而漏遮', () => {
      expect(scrubPersonalInfo('證人王小明先生到庭')).toBe('證人◯◯◯先生到庭');
      expect(scrubPersonalInfo('代理人張大華先生')).toBe('代理人◯◯◯先生');
      expect(scrubPersonalInfo('訴訟代理人陳志明女士')).toBe('訴訟代理人◯◯◯女士');
    });

    it('身分證字號', () => {
      expect(scrubPersonalInfo('身分證字號：A123456789')).toBe('身分證字號：A1********');
    });

    it('手機與市話', () => {
      expect(scrubPersonalInfo('手機：0912345678')).toBe('手機：09********');
      expect(scrubPersonalInfo('手機：0912-345-678')).toBe('手機：09**-***-***');
      expect(scrubPersonalInfo('市話：02-2345-6789')).toBe('市話：0*-****-****');
    });

    it('地址', () => {
      expect(scrubPersonalInfo('地址：台北市大安區仁愛路四段123號5樓'))
        .toBe('地址：台北市大安區***');
    });

    it('完整判決書的個資欄位被遮蔽而主文不變', () => {
      const 判決 = [
        '臺灣臺北地方法院民事判決',
        '案號：（112）訴字第1234號',
        '判決日期：民國112年3月1日',
        '原告王大明',
        '訴訟代理人：陳律師',
        '被告李美玲',
        '判決主文',
        '一、被告應給付原告新臺幣5萬元。',
      ].join('\n');
      const 結果 = scrubPersonalInfo(判決);
      expect(結果).toContain('一、被告應給付原告新臺幣5萬元。');
      expect(結果).toContain('判決日期：民國112年3月1日');
    });
  });

  it('空字串不會拋錯', () => {
    expect(scrubPersonalInfo('')).toBe('');
  });
});