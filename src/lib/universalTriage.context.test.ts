import { describe, expect, it } from 'vitest';
import { buildIntelligentRuleBasedTriage } from './universalTriage';

/**
 * 分類必須看上下文，不能只看單一關鍵字。
 *
 * 實測缺陷：系統自己提供的「租賃押金」範例內含
 * 「房東…威脅若再爭執將把我的私人物品丟到走廊」，
 * 命中「威脅」關鍵字後整案被分類為
 * 「恐嚇危害安全罪 / 強制罪爭議」、刑事非告訴乃論（公訴罪），
 * 使用者看到「檢警知悉即應主動偵辦」。
 *
 * 但房東揚言丟棄物品是租賃契約上的施壓，屬民事押金糾紛。
 * 第 15 個分支本來就有正確處理（標示「無刑事責任」），
 * 卻因關鍵字分支先攔截而不可達。
 *
 * 反向要求：真正的威脅人身安全仍必須被辨識為刑事，
 * 否則家暴與暴力恐嚇的當事人會拿不到人身安全指引。
 */
const 押金範例 =
  '事發於民國112年11月15日晚上約11點，在臺北市信義區租屋處。我與房東因退租押金發生爭執，' +
  '房東以無合理依據之清潔費為由拒絕退還新臺幣5萬元押金，並威脅若再爭執將把我的私人物品丟到走廊。' +
  '我有雙方簽署之房屋租賃契約書、歷次匯款房租水電之銀行明細，以及當日 LINE 對話紀錄截圖。';

const 判斷 = (q: string) => buildIntelligentRuleBasedTriage(q) as {
  identifiedIssue?: string;
  caseType?: string;
  litigationNatureText?: string;
};

describe('分類不得被單一關鍵字凌駕', () => {
  it('租賃押金糾紛中的「威脅」不得分類為恐嚇危害安全罪', () => {
    const r = 判斷(押金範例);
    expect(r.identifiedIssue, `押金範例被分類為：${r.identifiedIssue}／${r.litigationNatureText}`)
      .not.toMatch(/恐嚇危害安全罪|強制罪/);
  });

  it('押金範例應走民事押金返還分支', () => {
    const r = 判斷(押金範例);
    expect(r.identifiedIssue).toMatch(/押金/);
    expect(r.caseType).toBe('CIVIL');
  });

  it('押金範例不得宣稱是刑事公訴罪', () => {
    // 這是最容易造成實害的誤導：讓當事人以為警察會主動偵辦。
    expect(判斷(押金範例).litigationNatureText).not.toMatch(/公訴罪|主動偵辦/);
  });

  it('無押金脈絡的威脅仍應辨識為刑事恐嚇', () => {
    // 不可為了修掉誤判而讓真正的威脅漏網。
    const r = 判斷('我前男友說如果我敢提告，就要找人打我，揚言報復，讓我每天都很害怕。');
    expect(r.identifiedIssue).toMatch(/恐嚇危害安全罪/);
  });

  it('人身安全威脅不得因提及財物而被降級為民事', () => {
    // 押金只是手段、威脅指向人身時，仍應走刑事分支。
    const r = 判斷('房東說如果我不退押金就要找人打我，他揚言報復，我每天都很害怕。');
    expect(r.identifiedIssue).toMatch(/恐嚇危害安全罪/);
  });
});
