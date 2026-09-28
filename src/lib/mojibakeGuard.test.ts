import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 原始碼不得含 U+FFFD 替換字元（亂碼）。
 *
 * 實測掃描發現 4 處，其中一處在 AI 提示詞內
 * （src/prompts/analyze-judgment.ts 的「案號或年份」被寫成「年\u{FFFD}」），
 * 損毀的文字會直接送給模型，屬於會影響產出品質的缺陷。
 *
 * 另有兩處刻意使用 U+FFFD 作為測試標記（用來驗證偵測器本身有效），
 * 那些檔案不在此檢查範圍。
 */

/** 刻意以 U+FFFD 作為測試素材的檔案。 */
const 測試素材檔 = ['qualityScorecardIntegrity.test.ts', 'simplifiedTableVariantChars.test.ts', 'mojibakeGuard.test.ts'];

const 跳過目錄: Record<string, true> = {
  'node_modules': true, '.git': true, dist: true, build: true, coverage: true, tmp: true,
};
const 檢查副檔名 = /\.(ts|tsx|js|jsx|mjs|cjs|md|json|ya?ml)$/;

function* 走訪(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (跳過目錄[entry.name]) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* 走訪(full);
    else if (檢查副檔名.test(entry.name) && !測試素材檔.some(f => entry.name.endsWith(f))) {
      yield full;
    }
  }
}

describe('原始碼亂碼防護', () => {
  it('不得含 U+FFFD 替換字元', () => {
    const 問題: string[] = [];
    for (const file of 走訪(process.cwd())) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (line.includes('\u{FFFD}')) {
          問題.push(`${relative(process.cwd(), file)}:${i + 1}`);
        }
      });
    }
    expect(問題, `以下檔案含亂碼，文字可能已損毀：\n${問題.join('\n')}`).toEqual([]);
  });

  it('AI 提示詞不得含亂碼', () => {
    // 提示詞的損毀文字會直接影響模型產出，影響面比一般程式碼更大。
    const 提示詞檔 = readdirSync(join(process.cwd(), 'src', 'prompts'))
      .filter(f => f.endsWith('.ts'));
    const 問題: string[] = [];
    for (const f of 提示詞檔) {
      const s = readFileSync(join(process.cwd(), 'src', 'prompts', f), 'utf8');
      if (s.includes('\u{FFFD}')) 問題.push(f);
    }
    expect(問題, `提示詞含亂碼：\n${問題.join('\n')}`).toEqual([]);
  });
});
