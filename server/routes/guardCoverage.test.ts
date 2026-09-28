import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 守門規則必須涵蓋所有產出路徑。
 *
 * 本專案接連抓到兩次同型缺陷，根因都是把守門放在單一路徑上：
 *
 * 1. 詐欺分類 — enforceTriageConsistency 只掛在管線的 parseResponse，
 *    AI 失敗時走 fallback → buildIntelligentRuleBasedTriage 完全不同路徑，
 *    規則被跳過，詐欺案件被判為純民事，UI 顯示「無刑事責任」。
 * 2. 舊稱改寫 — normalizeObsoleteOffenseNamesInPayload 同樣只在 AI 路徑。
 *
 * 共同成因：守門分散在各產出分支裡，新增分支時很容易漏掉。
 * 修正方式是把守門移到「payload 取回後」統一套用，
 * 本測試守住這個結構不被回退。
 */

const ROUTES_DIR = join(process.cwd(), 'server', 'routes');
const 路由檔 = readdirSync(ROUTES_DIR).filter(f => f.endsWith('.ts') && !f.includes('.test.'));

/** 必須在最終 payload 上統一套用的守門函式。 */
const 必須統一套用 = ['enforceTriageConsistency', 'normalizeObsoleteOffenseNamesInPayload'];

describe('守門規則涵蓋所有產出路徑', () => {
  it('triage 端點的守門必須在取回 payload 後統一套用', () => {
    const source = readFileSync(join(ROUTES_DIR, 'triage.ts'), 'utf8');

    for (const 守門 of 必須統一套用) {
      // 必須出現在 pipelineResult 取得之後的統一位置，
      // 而不只是 parseResponse 內。
      const 統一位置 = new RegExp(`${守門}\\s*\\(\\s*(finalPayload|pipelineResult\\.payload)`);
      expect(source, `${守門} 必須在最終 payload 上套用，而非只在 parseResponse 內`).toMatch(統一位置);
    }
  });

  it('任何使用 parseResponse 與 fallback 的端點都必須有統一守門點', () => {
    const 可疑: string[] = [];
    for (const 檔 of 路由檔) {
      const source = readFileSync(join(ROUTES_DIR, 檔), 'utf8');
      if (!source.includes('parseResponse') || !source.includes('fallback:')) continue;

      const parseIdx = source.indexOf('parseResponse:');
      const fallbackIdx = source.indexOf('fallback:');
      const parse區塊 = source.slice(parseIdx, fallbackIdx > parseIdx ? fallbackIdx : parseIdx + 900);
      const fallback區塊 = source.slice(fallbackIdx, fallbackIdx + 600);

      const 守門 = [...new Set(
        [...parse區塊.matchAll(/\b(enforce\w+|normalize\w+|convert\w+|toTraditional\w*)\s*\(/g)]
          .map(m => m[1]),
      )];

      for (const fn of 守門) {
        // 已在最終 payload 統一套用者不算落差
        if (new RegExp(`${fn}\\s*\\(\\s*finalPayload`).test(source)) continue;
        if (!fallback區塊.includes(fn)) {
          可疑.push(`${檔}: parseResponse 有 ${fn}，fallback 未見，且未在最終 payload 統一套用`);
        }
      }
    }
    expect(可疑, `守門只套用在單一產出路徑：\n${可疑.join('\n')}`).toEqual([]);
  });

  it('unifiedWorkflow 的分流必須在規則之後', () => {
    const source = readFileSync(join(ROUTES_DIR, 'unifiedWorkflow.ts'), 'utf8');
    const 分流位置 = source.indexOf('buildIntelligentRuleBasedTriage(');
    const 規則位置 = source.indexOf('enforceTriageConsistency(');
    expect(分流位置).toBeGreaterThan(-1);
    expect(規則位置).toBeGreaterThan(-1);
    expect(規則位置, 'enforceTriageConsistency 必須在分流之後套用').toBeGreaterThan(分流位置);
  });
});
