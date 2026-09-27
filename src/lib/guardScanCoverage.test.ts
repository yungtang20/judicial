import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

/**
 * 掃描型防護必須涵蓋它宣稱保護的完整範圍。
 *
 * 這是一個反覆出現的失敗模式，已實測到三次：
 * 1. 原生對話框防護只收集 .tsx，src/hooks 底下 13 處原生 alert 全部漏網。
 * 2. 繁體中文防護只收集 .ts，跳過全部 77 個 .tsx——
 *    而使用者看到的中文幾乎都在元件裡。
 * 3. 以單一測試檔判定守護是否有效，把「該檔沒測到」誤認為「沒人測」。
 *
 * 量測範圍太窄，卻把結果當成完整結論。
 * 這裡把「範圍」本身變成可驗證的對象。
 */

const SRC = path.resolve(__dirname, '..');

/** 必須同時掃描 .ts 與 .tsx 的防護。 */
const 需完整副檔名: string[] = [
  'lib/aiOutputTraditionalGuard.test.ts',
  'components/noNativeDialogs.test.ts',
  'lib/noFabricatedIdentityDefaults.test.ts'
];

/**
 * 這些防護找的是 JSX 元素，.ts 檔本來就不可能含有，
 * 只掃 .tsx 是正確範圍，不是縮窄。
 */
const 僅Jsx: string[] = [
  'components/clickableDivAccessibility.test.ts',
  'components/iconButtonAccessibility.test.ts',
  'components/clipboardReliability.test.ts'
];

describe('掃描型防護的範圍不得被縮窄', () => {
  it.each(需完整副檔名)('%s 必須同時掃描 .ts 與 .tsx', 檔案 => {
    const src = readFileSync(path.join(SRC, 檔案), 'utf8');
    // 兩種寫法都算完整：.tsx? 或 \.(ts|tsx)$
    const 完整 = /\.tsx\?/.test(src) || /\\\.\(ts\|tsx\)\$/.test(src) || /\\\.tsx\?\\\$/.test(src);
    expect(完整, `${檔案} 未使用同時涵蓋兩種副檔名的過濾式`).toBe(true);
    expect(src, `${檔案} 只掃單一副檔名會漏掉另一類原始碼`).not.toMatch(/endsWith\('\.ts'\)/);
  });

  it.each(僅Jsx)('%s 掃描 JSX 元素，僅 .tsx 屬正確範圍', 檔案 => {
    const src = readFileSync(path.join(SRC, 檔案), 'utf8');
    expect(src).toMatch(/endsWith\('\.tsx'\)/);
  });

  it.each(需完整副檔名)('%s 的掃描根目錄必須是整個 src/', 檔案 => {
    const src = readFileSync(path.join(SRC, 檔案), 'utf8');
    expect(src, `${檔案} 的掃描根目錄不是 src/，可能只掃到部分目錄`)
      .toMatch(/path\.resolve\(__dirname,\s*'\.\.'\)/);
  });

  it('src/ 下兩種副檔名都存在，缺一即為縮窄', () => {
    const 計數 = (副檔名: RegExp): number => {
      let n = 0;
      const 走 = (dir: string): void => {
        for (const entry of readdirSync(dir)) {
          if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
          const full = path.join(dir, entry);
          if (statSync(full).isDirectory()) 走(full);
          else if (副檔名.test(entry) && !entry.includes('.test.')) n += 1;
        }
      };
      走(SRC);
      return n;
    };
    expect(計數(/\.ts$/), 'src/ 下沒有 .ts 檔，掃描範圍的假設已過時').toBeGreaterThan(0);
    expect(計數(/\.tsx$/), 'src/ 下沒有 .tsx 檔，掃描範圍的假設已過時').toBeGreaterThan(0);
  });

  it('明確列舉目標的防護必須同步維護清單', () => {
    // zeroCitationNotice 以明確檔案清單列舉產出途徑。
    // 新增產出路徑卻忘了加入清單，同樣是縮窄，因此清單本身要被檢視。
    const src = readFileSync(path.join(SRC, 'components/zeroCitationNotice.test.ts'), 'utf8');
    const 目標 = [...src.matchAll(/'([^']+\.tsx?)'/g)].map(m => m[1]);
    expect(目標.length, '明確清單不得為空').toBeGreaterThan(0);
    // 四個產出路徑：法律工具台、爭點表、防禦流程、上訴狀助理
    expect(目標.length, "四個產出路徑都必須列入").toBeGreaterThanOrEqual(4);
  });
});
