import { describe, expect, it } from 'vitest';
import { buildFallbackToolboxResult } from './toolboxFallbacks';
import { TOOL_FIELD_SCHEMAS } from '../lib/toolFieldSchemas';
import { verifyLegalCitations } from '../lib/citationVerifier';
import { containsSimplifiedChinese } from '../lib/traditionalChineseGuard';

/**
 * 每個範本產出的文件都必須通過引用檢核。
 *
 * 實測缺陷：通用書狀的刑事分支引用「刑事訴訟法第八條」——
 * 該條不在已驗證法條庫，被幽靈引用閘門擋下整份文件，
 * 使用者拿到的是「取得建議失敗」而不是書狀。
 *
 * 這類問題在開發時完全看不出來（範本語法正確、內容看起來合理），
 * 只有實際跑過 verifyLegalCitations 才會發現。
 * 因此對所有範本逐一產出並檢核。
 */

function 測試值(鍵: string): string {
  if (/Amount|amount|Rent|rent|Salary|salary|Pay|pay|Escort|total|Share|price|cost/i.test(鍵)) return '50000';
  if (/Date|date|Month|month|Year|year|Day|day/i.test(鍵)) return '114年6月1日';
  if (/Phone|phone|Mobile/i.test(鍵)) return '0912345678';
  if (/Id$|idNo|IdNo|Code|code|Account/i.test(鍵)) return 'A123456789';
  if (/Address|address|Place|place|Office/i.test(鍵)) return '臺北市中正區忠孝東路100號';
  if (/Court|法院/i.test(鍵)) return '臺灣臺北地方法院';
  if (/Relationship|relationship/i.test(鍵)) return '朋友';
  if (/Bank|bank/i.test(鍵)) return '臺灣銀行';
  if (/Months|months/i.test(鍵)) return '3';
  if (/Period|period/i.test(鍵)) return '114年1月至114年6月';
  return '王小明';
}

const 全部產出 = Object.entries(TOOL_FIELD_SCHEMAS).map(([工具, 表單]) => {
  const params: Record<string, string> = {};
  for (const f of 表單) params[f.key] = 測試值(f.key);
  return { 工具, 文件: buildFallbackToolboxResult(工具, params).documentText || '' };
});

describe('範本產出的引用檢核', () => {
  it('掃描確實涵蓋了所有範本（避免測試因資料為空而空轉）', () => {
    expect(全部產出.length).toBeGreaterThan(40);
    expect(全部產出.filter((x) => x.文件).length).toBe(全部產出.length);
  });

  it('每個範本產出的文件都不得含待填欄位', () => {
    const 有缺口 = 全部產出
      .filter((x) => x.文件.includes('（待填寫）'))
      .map((x) => x.工具);
    expect(有缺口, `以下範本在欄位填齊時仍有待填欄位：\n${有缺口.join('\n')}`).toEqual([]);
  });

  it('每個範本產出的文件都不得含簡體中文', () => {
    const 有簡體 = 全部產出
      .filter((x) => containsSimplifiedChinese(x.文件))
      .map((x) => x.工具);
    expect(有簡體, `以下範本產出含簡體中文：\n${有簡體.join('\n')}`).toEqual([]);
  });

  it('每個範本引用的法條都必須在已驗證庫中', () => {
    // 引用未收錄的條文會被幽靈引用閘門擋下，使用者拿到的是錯誤訊息
    // 而不是書狀——這正是通用書狀先前發生的問題。
    const 未收錄: string[] = [];
    for (const { 工具, 文件 } of 全部產出) {
      const 檢核 = verifyLegalCitations(文件);
      const 未驗證 = 檢核.results.filter((r) => !r.verified).map((r) => r.citationText);
      if (未驗證.length) 未收錄.push(`${工具}: ${未驗證.join('、')}`);
    }
    expect(未收錄, `以下範本引用了未收錄的法條，會被閘門擋下：\n${未收錄.join('\n')}`).toEqual([]);
  });

  it('每個範本產出的文件都不得有幽靈引用', () => {
    const 有幽靈: string[] = [];
    for (const { 工具, 文件 } of 全部產出) {
      const 檢核 = verifyLegalCitations(文件);
      if (檢核.ghostCount > 0) 有幽靈.push(工具);
    }
    expect(有幽靈, `以下範本產出幽靈引用：\n${有幽靈.join('\n')}`).toEqual([]);
  });

  it('範本中的條號應統一用阿拉伯數字', () => {
    // 同一份法律文件裡第277條與第二百七十七條混用，看起來不夠嚴謹。
    // citationVerifier 的對照表刻意用中文數字來比對用戶輸入，不在此列。
    const 混用 = 全部產出
      .filter((x) => /(民法|民事訴訟法|刑事訴訟法|刑法|票據法)第[一二三四五六七八九十百]+條/.test(x.文件))
      .map((x) => x.工具);
    expect(混用, `以下範本使用中文數字條號，應統一為阿拉伯數字：
${混用.join('\n')}`).toEqual([]);
  });
});
