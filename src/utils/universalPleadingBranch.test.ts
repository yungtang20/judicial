import { describe, expect, it } from 'vitest';
import { buildFallbackToolboxResult } from './toolboxFallbacks';

/**
 * 通用書狀必須符合案件性質。
 *
 * 實測缺陷：UNIVERSAL_AI_PLEADING 的標題是「民刑事聲請/告訴/起訴狀」，
 * 內文卻只有刑事程序。以民事借貸糾紛（要求判決給付 50 萬元）產出：
 *   「請  貴機關體察實情，依法立案偵辦…」
 *   「符合告訴乃論/公訴追訴要件」
 *   「對造人（相對人/被告）」
 *
 * 民事當事人拿到刑事程序框架的書狀，法院會以程式不符退件，
 * 也可能誤導人去報警而非提告——後者對已受侵害的當事人尤其不當。
 */
describe('通用書狀依案件性質分支', () => {
  const 民事參數 = {
    complainantName: '王○○',
    accusedName: '張○○',
    complainantAddress: '臺北市中正區100號',
    complainantPhone: '0912345678',
    accusedAddress: '新北市板橋區1號',
    courtName: '臺灣高等法院',
    incidentDetails: '被告於民國112年1月1日借款50萬元，約定三個月償還，屆期未清償。',
  };

  const 刑事參數 = {
    complainantName: '王○○',
    accusedName: '張○○',
    complainantAddress: '臺北市中正區100號',
    complainantPhone: '0912345678',
    accusedAddress: '新北市板橋區1號',
    prosecutorOffice: '臺灣士林地方法院檢察署',
    incidentDetails: '被告於民國113年3月1日竊取我所有之自行車一部。',
  };

  const 產製 = (params: Record<string, string>) =>
    buildFallbackToolboxResult('UNIVERSAL_AI_PLEADING', params as never).documentText;

  it('民事案件產生民事起訴狀', () => {
    const 文件 = 產製(民事參數);
    expect(文件).toContain('民事起訴狀');
    expect(文件).toContain('訴之聲明');
    expect(文件).toContain('相對人');
  });

  it('民事案件不得出現刑事程序字樣', () => {
    // 這些是刑事專屬概念，出現在民事書狀會誤導當事人與法院。
    const 文件 = 產製(民事參數);
    for (const 刑事語 of ['立案偵辦', '告訴乃論', '公訴追訴', '檢舉人', '刑事訴訟法']) {
      expect(文件, `民事書狀不應出現「${刑事語}」`).not.toContain(刑事語);
    }
  });

  it('民事書狀應援引民事訴訟法要件', () => {
    const 文件 = 產製(民事參數);
    expect(文件).toContain('民事訴訟法');
    expect(文件).toMatch(/第二百七十七條|第二百七十九條/);
  });

  it('填了移送機關則視為刑事', () => {
    const 文件 = 產製(刑事參數);
    expect(文件).toContain('刑事告訴狀');
    expect(文件).toContain('請  貴機關依法偵辦');
    expect(文件).toContain('六個月內提出告訴');
  });

  it('刑事書狀不得出現民事訴之聲明', () => {
    const 文件 = 產製(刑事參數);
    expect(文件).not.toContain('訴之聲明');
  });

  it('受文機關依案件性質取用不同欄位', () => {
    // 先前 targetAgency 取 prosecutorOffice || courtName，
    // 導致填了高等法院卻印出地方法院。
    expect(產製(民事參數)).toContain('臺灣高等法院');
    expect(產製(刑事參數)).toContain('臺灣士林地方法院檢察署');
  });

  it('兩種案件都不得出現待填寫以外欄位', () => {
    for (const 參數 of [民事參數, 刑事參數]) {
      const 文件 = 產製(參數);
      expect(文件).not.toContain('（待填寫）');
    }
  });
});
