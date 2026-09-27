import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { containsSimplifiedChinese, findSimplifiedChinese } from './traditionalChineseGuard';

/**
 * 簡繁對照表不得收錄「異體字」，否則會把法條原文誤判為簡體字。
 *
 * 實測（2026-09-27）：把「雇」列入對照表後，掃描立刻抓出 20 處以上
 * 「雇主」，包含 `citationVerifier.ts` 的 `officialSummary` 欄位——
 * 那是**勞動基準法條文的引用**。
 *
 * 在台灣法文中「雇主」與「僱主」並用，屬異體關係而非簡繁對應。
 * 若依掃描結果把 20 處全部改成「僱主」，等於**改寫法律引用**，
 * 那比留著簡體字更糟。
 *
 * 與「干／后／发／复／汇／余／脏」同類：依語境對應多個繁體字，
 * 必須以語境判斷，不能放進單一字對單一字的對照表。
 */
const 原始碼 = readFileSync(path.resolve(__dirname, 'traditionalChineseGuard.ts'), 'utf8');

/** 繁簡同形或依語境多义的字，不得列入對照表。 */
const 異體或同形字 = ['雇', '干', '后', '发', '复', '汇', '余', '脏', '面', '里', '系', '台', '借', '克', '困', '累', '千', '术', '制', '周', '折', '战', '御', '范', '回', '板', '表', '丑', '云', '舍', '冲', '准', '历', '钟'];

describe('簡繁對照表不得收錄異體字', () => {
  it.each(異體或同形字)('「%s」不得列入對照表', 字 => {
    const 已列入 = new RegExp(`\\['${字}',\\s*'[^']+'\\]`).test(原始碼);
    expect(已列入, `「${字}」屬異體或同形字，列入會誤判法條原文`).toBe(false);
  });

  it('常見法律詞不得被誤判為含簡體字', () => {
    const 應通過 = [
      '雇主不依勞動契約給付報酬',
      '勞動基準法第38條',
      '請求給付遲延利息',
      '強制執行',
      '臺灣臺北地方法院',
      '民事訴訟法第244條',
      '被告應給付原告新臺幣50萬元'
    ];
    for (const 詞 of 應通過) {
      expect(containsSimplifiedChinese(詞), `「${詞}」被誤判`).toBe(false);
    }
  });

  it('法條原文引用不得因對照表而被標記', () => {
    // 這些是 citationVerifier 中實際引用的法條片段
    const 法條片段 = [
      '雇主終止勞動契約預告期間',
      '雇主不依勞動契約給付報酬',
      '勞工在同一雇主或事業單位，繼續工作滿一定期間者'
    ];
    for (const 片段 of 法條片段) {
      expect(findSimplifiedChinese(片段), `法條片段「${片段}」被誤判：${JSON.stringify(findSimplifiedChinese(片段))}`).toEqual([]);
    }
  });

  it('真正的簡體字仍須被辨識', () => {
    expect(containsSimplifiedChinese('不当得利')).toBe(true);
    expect(containsSimplifiedChinese('这里是不当得利的说明')).toBe(true);
    expect(containsSimplifiedChinese('诉讼')).toBe(true);
  });
});
