import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describePrecheckRejection } from './precheckRejectionMessage';
import { precheckLegalInput, type LegalInputPrecheckResult } from './legalInputPrecheck';

/**
 * 輸入預檢被拒時，必須回報真實原因。
 *
 * 實測缺陷：貼上空白內容，畫面卻顯示
 * 「輸入內容包含顯著異常或虛構之法律條號，已被安全機制攔截」——
 * 空白裡根本沒有條號，使用者會去查一個不存在的問題。
 * 預檢本身給的是 INVALID_REQUEST「法律輸入內容不得為空」，
 * 但路由丟掉了預檢的真實理由。
 *
 * 本檔先前就存在，但其中「路由不得再硬寫與預檢無關的拒絕訊息」一項
 * 搜尋的是「已被安全機制攋截」（攋），而程式實際寫的是「攔截」（攔），
 * 字串永遠不相符，該測試形同虛設、一直空過。
 * 現在改為結構化檢查：路由的拒絕分支必須呼叫 describePrecheckRejection。
 */

function 預檢結果(code: string, citation?: string): LegalInputPrecheckResult {
  return {
    status: 'reject',
    checkerKind: 'heuristic',
    explicitCitations: [],
    issues: [{ code: code as 'INVALID_REQUEST', message: 'x', citation }]
  };
}

describe('輸入預檢的拒絕理由', () => {
  it('空白輸入必須說明內容為空，不得說成含有幽靈法條', () => {
    const reason = describePrecheckRejection(precheckLegalInput('     '));
    expect(reason).toMatch(/請提供/);
    expect(reason).not.toMatch(/法律條號|法條/);
  });

  it('引用格式可疑時必須說明是引用問題', () => {
    const reason = describePrecheckRejection(
      precheckLegalInput('參照最高法院110年度台上字第99999999號判決。', 'generation')
    );
    expect(reason).toMatch(/引用|安全機制/);
  });

  it('空字串與純空白的代碼都是 INVALID_REQUEST', () => {
    expect(precheckLegalInput('').issues[0]?.code).toBe('INVALID_REQUEST');
    expect(precheckLegalInput('  \n\t ').issues[0]?.code).toBe('INVALID_REQUEST');
  });

  it('真的含有可疑條號時才回報 MALFORMED_CITATION', () => {
    expect(precheckLegalInput('依民法第9999條規定。', 'analysis').issues[0]?.code)
      .toBe('MALFORMED_CITATION');
  });

  it('未知代碼仍回傳可讀訊息', () => {
    const reason = describePrecheckRejection(預檢結果('SOMETHING_ELSE'));
    expect(reason).toBeTruthy();
    expect(reason.length).toBeGreaterThan(0);
  });
});

describe('路由不得硬寫與預檢無關的拒絕訊息', () => {
  it('所有路由的預檢拒絕分支都必須使用 describePrecheckRejection', () => {
    const 目錄 = path.resolve(__dirname, '../../server/routes');
    const 違規: string[] = [];

    for (const 檔名 of readdirSync(目錄).filter(f => f.endsWith('.ts') && !f.includes('.test.'))) {
      const 內容 = readFileSync(path.join(目錄, 檔名), 'utf8');
      // 逐個預檢呼叫點檢查：後續的拒絕回應是否用了正確的描述函式。
      const 呼叫點 = [...內容.matchAll(/precheckLegalInput\(/g)];
      for (let i = 0; i < 呼叫點.length; i++) {
        const 起點 = 呼叫點[i].index!;
        const 片段 = 內容.slice(起點, 起點 + 400);
        if (!/precheck\.status\s*===?\s*['"]reject['"]/.test(片段)) continue;
        if (!/describePrecheckRejection\(\s*precheck\s*\)/.test(片段)) {
          違規.push(`${檔名}（第 ${內容.slice(0, 起點).split('\n').length} 行）`);
        }
      }
      // 不得出現硬編的幽靈法條字樣（任一字元變體）。
      if (/已被安全機制[攋攔]截/.test(內容)) 違規.push(`${檔名}（仍含硬編訊息）`);
    }

    expect(違規, '以下路由的預檢拒絕分支未如實回報原因：').toEqual([]);
  });
});
