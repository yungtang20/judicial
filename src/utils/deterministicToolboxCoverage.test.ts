import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { hasDeterministicToolboxTemplate, DETERMINISTIC_TOOLBOX_CATEGORIES, buildFallbackToolboxResult } from './toolboxFallbacks';
import { LEGAL_TOOLS } from '../lib/legalToolRegistry';

/**
 * 有確定性模板的書狀類別不應走 AI 起草。
 *
 * 實測：正式站 28 項工具中有 19 項產製失敗（12 項引用查核失敗、3 項無管線、
 * 4 項逾時），且同一份輸入的產出因模型隨機性而不同。原因是全部類別都被
 * 路由到 AI 起草管線，而 toolboxFallbacks 裡既有的確定性模板完全沒被使用。
 */
describe('確定性模板類別', () => {
  it('工具箱中可見的書狀類別大多已有確定性模板', () => {
    const covered = LEGAL_TOOLS.filter(tool => hasDeterministicToolboxTemplate(tool.id));
    expect(covered.length).toBeGreaterThan(20);
  });

  it('同時具備兩種實作的類別，必須由確定性管線優先處理', () => {
    // buildFallbackToolboxResult 也收錄了 PAYMENT_ORDER_PETITION（universalTriage 會用到），
    // 但正式路由必須先走 P4-P9 確定性管線，否則會繞過 P9 最終守門員。
    // 這個先後順序屬於治理要求，路由中的判斷順序不能被調換。
    const route = readFileSync(path.resolve(__dirname, '../../server/routes/toolbox.ts'), 'utf8');
    const canonicalAt = route.indexOf('isCourtPleadingToolCategory(categoryKey)');
    const deterministicAt = route.indexOf('hasDeterministicToolboxTemplate(categoryKey)');
    expect(canonicalAt).toBeGreaterThan(-1);
    expect(deterministicAt).toBeGreaterThan(-1);
    expect(canonicalAt).toBeLessThan(deterministicAt);
  });

  it('清單不得為空且不得包含空字串', () => {
    expect(DETERMINISTIC_TOOLBOX_CATEGORIES.size).toBeGreaterThan(0);
    expect(DETERMINISTIC_TOOLBOX_CATEGORIES.has('')).toBe(false);
  });

  it('確定性產出必須是穩定的：相同輸入兩次結果完全相同', () => {
    const params = {
      creditorName: '王大明', debtorName: '李小華', debtAmount: '500,000',
      noteDate: '112年5月1日', noteDueDate: '112年11月1日', interestRate: '6'
    };
    const a = buildFallbackToolboxResult('PROMISSORY_NOTE', params);
    const b = buildFallbackToolboxResult('PROMISSORY_NOTE', params);
    expect(a.documentText).toBe(b.documentText);
  });

  it('確定性產出不得含簡體中文', () => {
    const out = buildFallbackToolboxResult('DEMAND_LETTER_DEBT', {
      senderName: '王大明', recipientName: '李小華', amount: '600,000',
      reason: '借款屢催不還', senderAddress: '臺北市', recipientAddress: '新北市'
    });
    expect(out.documentText).not.toMatch(/[签书转账贷诉讼证债权项则规远连选适际难题标确认识务实资费费额经济议论断决处释据凭责偿属损赔礼仪响应当录统结级线组织维续网电话机关开闭闻阵陆陈险隐韩顺预领验鱼鲜鸡鸣麦黄齐龟记并]/);
  });
});
