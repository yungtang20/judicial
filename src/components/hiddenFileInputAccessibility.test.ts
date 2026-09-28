import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 隱藏但可聚焦的輸入必須有可存取名稱。
 *
 * 實測正式站：55 個可聚焦元素中，有 1 個
 * `<input type="file" class="hidden">` 沒有 aria-label，
 * 而它仍可被 Tab 聚焦——鍵盤與螢幕閱讀器使用者會聚焦到一個
 * 沒有任何說明的控制項，聽不到「這是什麼」。
 *
 * 視覺上隱藏不等於對輔助科技隱藏。要真正移出焦點順序，
 * 應該用隱藏的 <label> 觸發可見按鈕，而不是放一個可聚焦的隱藏 input。
 */

const SRC = join(process.cwd(), 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (/\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name)) out.push(f);
  }
  return out;
}

/** 取出檔案輸入的 JSX 片段（含跨行寫法）。 */
function 檔案輸入片段(原始碼: string): string[] {
  const 片段: string[] = [];
  // 涵蓋單行與多行兩種寫法
  for (const m of 原始碼.matchAll(/<input\b[^>]*?type="file"[^>]*?>/g)) 片段.push(m[0]);
  for (const m of 原始碼.matchAll(/<input\b[^>]*?type="file"[\s\S]{0,300}?\/>/g)) 片段.push(m[0]);
  return 片段;
}

describe('隱藏檔案輸入的可存取名稱', () => {
  const 檔案 = walk(SRC);
  const 問題: string[] = [];

  for (const f of 檔案) {
    const s = readFileSync(f, 'utf8');
    for (const 片段 of 檔案輸入片段(s)) {
      // 視覺上隱藏且可被 Tab 聚焦者，必須有可存取名稱
      const 視覺隱藏 = /class(Name)?="[^"]*\bhidden\b/.test(片段);
      const 隱藏於容器 = /class(Name)?="[^"]*sr-only[^"]*"/.test(片段);
      const 有名字 = /aria-label=/.test(片段)
        || /\baria-labelledby=/.test(片段)
        || /id="[^"]+"/.test(片段) && /label[^\n]*for="/.test(s);
      if (視覺隱藏 && !隱藏於容器 && !有名字) {
        問題.push(`${f.replace(SRC + '\\', '')}: ${片段.replace(/\s+/g, ' ').slice(0, 90)}`);
      }
    }
  }

  it('視覺隱藏的檔案輸入都必須有可存取名稱', () => {
    expect(問題, `以下隱藏檔案輸入缺少可存取名稱，鍵盤與螢幕閱讀器使用者會聚焦到無說明的控制項：\n${問題.join('\n')}`).toEqual([]);
  });

  it('確實存在檔案輸入（避免測試因搜尋失效而空轉）', () => {
    const 總數 = 檔案.reduce((n, f) => n + 檔案輸入片段(readFileSync(f, 'utf8')).length, 0);
    expect(總數, '未找到任何檔案輸入，測試可能已失效').toBeGreaterThan(0);
  });
});
