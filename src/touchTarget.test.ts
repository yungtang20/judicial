import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 觸控裝置的最小點擊目標。
 *
 * 實測 390×844 視窗（iPhone 尺寸）發現：
 *   範例案件按鈕  274×32
 *   開始分析      308×40   ← 主要行動按鈕
 *   歷史記錄      120×30
 *   儲存目前內容   82×29
 *   案件備份       90×30
 *   範例下拉選單  286×33
 *
 * 全部低於 44×44 的建議值。手機是法律扶助工具的主要使用情境，
 * 目標過小會提高誤觸率——尤其是「開始分析」這種主要操作。
 *
 * 以 pointer: coarse 限定只影響觸控裝置，桌面版維持緊湊排版。
 */
const 樣式 = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

describe('觸控目標尺寸', () => {
  it('存在 pointer: coarse 的觸控專用規則', () => {
    expect(樣式).toContain('@media (pointer: coarse)');
  });

  it('觸控裝置上按鈕與輸入框至少 44px 高', () => {
    const 區塊 = 樣式.slice(樣式.indexOf('@media (pointer: coarse)'));
    expect(區塊).toMatch(/min-height:\s*44px/);
    // 輸入框也涵蓋
    expect(區塊).toMatch(/input\[type='text'\]/);
    expect(區塊).toMatch(/select/);
  });

  it('輸入框字級至少 16px，避免 iOS 聚焦時自動縮放', () => {
    // iOS Safari 在字級小於 16px 時會在聚焦時縮放整個版面，
    // 使用者會迷失在畫面中。實測常見於輸入框沿用 14px。
    const 區塊 = 樣式.slice(樣式.indexOf('@media (pointer: coarse)'));
    expect(區塊).toMatch(/font-size:\s*16px/);
  });

  it('不得影響定位元素（會撐破浮動層版面）', () => {
    const 區塊 = 樣式.slice(樣式.indexOf('@media (pointer: coarse)'));
    expect(區塊).toMatch(/:not\(\[class\*="absolute"\]\):not\(\[class\*="fixed"\]\)/);
  });

  it('規則不得套用到整個網域（只限 main 之外的殘留）', () => {
    // 這是全域樣式，誤加 min-height 會讓版面在桌面版被撐高。
    // 確認規則被限定在 media query 內而非全域。
    const 媒體區塊 = 樣式.slice(樣式.indexOf('@media (pointer: coarse)'));
    const 媒體外 = 樣式.replace(媒體區塊, '');
    expect(媒體外).not.toMatch(/min-height:\s*44px/);
  });
});

describe('行動版版面', () => {
  it('樣式表不得含會造成水平捲動的固定寬度', () => {
    // 實測 390px 視窗下 main 的 scrollWidth 等於視窗寬度，無水平捲動。
    // 這裡守住常見成因：固定 px 寬度大於 390。
    const 過寬 = [...樣式.matchAll(/min-width:\s*(\d+)px/g)]
      .map(m => Number(m[1]))
      .filter(w => w > 400);
    expect(過寬, `發現大於 400px 的 min-width：${過寬.join(', ')}`).toEqual([]);
  });
});
