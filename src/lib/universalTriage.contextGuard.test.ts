import { describe, expect, it } from 'vitest';
import { buildIntelligentRuleBasedTriage } from './universalTriage';

/**
 * 分類不得僅憑單一關鍵字凌駕上下文。
 *
 * 實測三個誤分類（全部把民事／合法事項判成刑事）：
 *   「他毀謗我的名譽，讓我遭受嚴重的精神傷害」→ 普通傷害罪（應為名譽）
 *   「我在直播賣商品」→ 公然侮辱罪（直播本身完全合法）
 *   「房東說要對我造成傷害，不退押金」→ 普通傷害罪（應為租賃糾紛）
 *
 * 根因有兩個：
 * 1. 「傷害」只比對有無該二字，不看是否指向人身，
 *    而名譽與租賃分支都排在後面，永遠走不到。
 * 2. 「直播」單獨出現即觸發妨害名譽，不需要任何誹謗內容。
 *
 * 與先前修正的押金／威脅案例同型：關鍵字覆蓋了上下文。
 */
const 判斷 = (q: string) =>
  buildIntelligentRuleBasedTriage(q) as { identifiedIssue?: string; caseType?: string };

describe('分類必須看上下文而非單一關鍵字', () => {
  it('名譽侵害不會因「精神傷害」被誤判為傷害罪', () => {
    const r = 判斷('他毀謗我的名譽，讓我遭受嚴重的精神傷害。');
    expect(r.identifiedIssue).not.toMatch(/普通傷害/);
    expect(r.identifiedIssue).toMatch(/名譽/);
  });

  it('直播本身不構成妨害名譽', () => {
    const r = 判斷('我在直播賣我的 handmade 商品。');
    expect(r.identifiedIssue).not.toMatch(/侮辱|誹謗|名譽/);
    expect(r.caseType).toBe('CIVIL');
  });

  it('租賃糾紛中的「傷害」不會被誤判為傷害罪', () => {
    const r = 判斷('房東說要對我造成傷害，不退押金。');
    expect(r.identifiedIssue).not.toMatch(/普通傷害/);
    expect(r.caseType).toBe('CIVIL');
  });

  it('押金糾紛帶威脅仍走租賃（先前修正不得回歸）', () => {
    const r = 判斷('房東不退押金，還威脅要把我的東西丟到走廊。');
    expect(r.identifiedIssue).not.toMatch(/恐嚇危害安全/);
    expect(r.identifiedIssue).toMatch(/押金|租賃/);
  });
});

describe('真正的刑事案件仍必須被辨識', () => {
  it('互毆', () => {
    expect(判斷('我們互相毆打，兩人都有受傷。').identifiedIssue).toMatch(/普通傷害/);
  });

  it('毆打', () => {
    expect(判斷('他毆打我，把我打到住院。').identifiedIssue).toMatch(/普通傷害/);
  });

  it('正當防衛', () => {
    expect(判斷('我被毆打所以還手，是正當防衛。').identifiedIssue).toMatch(/普通傷害/);
  });

  it('車禍受傷（過失傷害）', () => {
    expect(判斷('我被機車撞到，膝蓋受傷。').identifiedIssue).toMatch(/車禍/);
  });

  it('真正的妨害名譽（含直播辱罵）', () => {
    expect(判斷('他在直播中辱罵我，說我是骗子。').identifiedIssue).toMatch(/侮辱|誹謗/);
  });

  it('性侵害案件', () => {
    expect(判斷('他在我不清醒時強迫我發生性行為。').identifiedIssue).toMatch(/性自主/);
  });
});

describe('與上下文無關的詞彙不得觸發分類', () => {
  it.each([
    ['跌倒受傷', '我在家跌倒受傷，去醫院包紮。', /傷害罪/],
    ['信用卡被掉', '我的信用卡被掉了，請求銀行協助。', /洗錢|詐騙/],
    ['觸摸', '他只是摸了摸我的頭表示安慰。', /性自主/],
    ['摸魚', '他上班時間都在摸魚。', /性自主/]
  ])('%s 不得被歸類為%s', (_名, 輸入, 不應出現) => {
    const r = 判斷(輸入);
    expect(r.identifiedIssue || '').not.toMatch(不應出現);
  });
});
