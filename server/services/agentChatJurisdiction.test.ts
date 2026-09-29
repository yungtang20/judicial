import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 助理必須聲明管轄範圍，且不得把台灣法套用到外國案件。
 *
 * 實測缺陷：詢問「與美國聯邦政府的國際訴訟」時，
 * 助理引用了《行政訴訟法》作為分析依據。
 *
 * 外國法與台灣法體系完全不同（普通法系 vs 民法系、
 * 訴訟制度與管轄權結構皆異）。把台灣法條當成外國案件的答案依據，
 * 會讓使用者誤以為該引用適用，直接導向錯誤決策。
 *
 * 原始的系統提示詞列了長度、引用、不表態等規則，
 * 但完全沒有界定涵蓋哪些法域，模型因此自行延伸。
 */
const 原始碼 = readFileSync(
  resolve(process.cwd(), 'server/services/agentChat.ts'),
  'utf8'
);

describe('助理的管轄範圍', () => {
  it('明確聲明只涵蓋臺灣法', () => {
    expect(原始碼).toContain('本助理只提供臺灣法');
  });

  it('外國案件不得引用臺灣法條作為答案依據', () => {
    expect(原始碼).toMatch(/不得引用臺灣法條作為答案依據/);
  });

  it('要求建議諮詢該國執業律師，而非硬給答案', () => {
    // 拒絕並轉介，比給一個錯誤的答案安全。
    expect(原始碼).toMatch(/諮詢該國執業律師/);
  });

  it('管轄範圍規則在系統提示詞內（不可放在註解或程式碼外）', () => {
    const 起始 = 原始碼.indexOf('const systemPrompt = [');
    const 結束 = 原始碼.indexOf('.filter(Boolean)', 起始);
    const 區塊 = 原始碼.slice(起始, 結束);
    expect(區塊).toContain('只提供臺灣法');
    expect(區塊).toContain('不得引用臺灣法條');
  });

  it('原有的四項規則不得被移除', () => {
    const 起始 = 原始碼.indexOf('const systemPrompt = [');
    const 結束 = 原始碼.indexOf('.filter(Boolean)', 起始);
    const 區塊 = 原始碼.slice(起始, 結束);
    for (const 規則 of ['500 字以內', '不得虛構', '保持中立客觀', '統一附加']) {
      expect(區塊, `缺少原有規則：${規則}`).toContain(規則);
    }
  });
});
