import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { describePrecheckRejection } from './precheckRejectionMessage';
import { precheckLegalInput } from './legalInputPrecheck';

/**
 * 輸入預檢被拒時，必須回報真實原因。
 *
 * 實測：貼上空白內容，畫面卻顯示
 * 「輸入內容包含顯著異常或虛構之法律條號，已被安全機制攔截」——
 * 空白裡根本沒有條號，使用者會去查一個不存在的問題。
 * 預檢本身給的是 INVALID_REQUEST「法律輸入內容不得為空」，
 * 但路由丟掉了預檢的真實理由。
 */
describe('輸入預檢的拒絕理由', () => {
  it('空白輸入必須說明內容為空，不得說成含有幽靈法條', () => {
    const reason = describePrecheckRejection(precheckLegalInput('     '));
    expect(reason).toMatch(/請提供/);
    expect(reason).not.toMatch(/虛構之法律條號/);
  });

  it('引用格式可疑時必須說明是引用問題', () => {
    const reason = describePrecheckRejection(
      precheckLegalInput('參照最高法院110年度台上字第99999999號判決。', 'generation')
    );
    expect(reason).toMatch(/引用格式或案號/);
  });

  it('路由不得再硬寫與預檢無關的拒絕訊息', () => {
    const dir = path.resolve(__dirname, '../../server/routes');
    const offenders = readdirSync(dir)
      .filter(f => f.endsWith('.ts') && !f.includes('.test.'))
      .filter(f => readFileSync(path.join(dir, f), 'utf8')
        .includes('輸入內容包含顯著異常或虛構之法律條號，已被安全機制攋截'))
      .map(f => path.join('server/routes', f));
    expect(offenders).toEqual([]);
  });
});
