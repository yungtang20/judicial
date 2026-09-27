import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * 安全敏感的分流工具不得替使用者預設情境類別。
 *
 * 實測：法理流程引導的 scenarioCategory 初始值是 'SEXUAL_HARM'（性侵害）。
 * 使用者未做任何選擇就能按「下一步」進入步驟 2，步驟 1 同時顯示 ✓。
 * 等於系統在沒有任何依據的情況下，把每個進入這個工具的人
 * 當成性侵害案件處理，並依此給出後續路由與安全指引。
 *
 * 這個工具的自我描述是「第一時間辨識是否為性侵害、家暴或親屬相盜案件，
 * 提供緊急安全處置指引」——預設最嚴重的類別正好與此目的相反。
 */
const SRC = path.resolve(__dirname, '..', 'components', 'LegalProcessGuide.tsx');

describe('法理流程引導不得預設情境類別', () => {
  const source = readFileSync(SRC, 'utf8');

  it('情境類別的初始值必須是空字串', () => {
    expect(source).toMatch(/useState<string>\(\s*''\s*\)/);
    expect(source).not.toMatch(/useState<string>\(\s*'SEXUAL_HARM'\s*\)/);
    expect(source).not.toMatch(/useState<string>\(\s*'DOMESTIC'\s*\)/);
  });

  it('未選擇情境前必須停用下一步按鈕', () => {
    expect(source).toMatch(/disabled=\{!scenarioCategory\}/);
  });

  it('停用狀態須有明確的視覺與操作提示', () => {
    expect(source).toMatch(/disabled:opacity-\d+/);
    expect(source).toMatch(/disabled:cursor-not-allowed/);
    expect(source).toMatch(/請先選擇爭議情境/);
  });

  it('關係人不得預設為配偶，否則每個人都被當成家暴案件', () => {
    // 預設 'SPOUSE' 會讓 isFamilyRelation 對每個使用者都為真，
    // 把陌生人侵害或一般契約糾紛都導成家暴路徑並套用保護令指引。
    expect(source).toMatch(/useState<ProcessGuideInput\['relationship'\]>\(''\)/);
    expect(source).not.toMatch(/useState<ProcessGuideInput\['relationship'\]>\('SPOUSE'\)/);
    // 關係人在步驟三選擇，因此停用條件掛在步驟三到步驟四的按鈕上。
    expect(source).toMatch(/disabled=\{!relationship\}/);
    expect(source).toMatch(/請先選擇與加害者的關係/);
  });
});
