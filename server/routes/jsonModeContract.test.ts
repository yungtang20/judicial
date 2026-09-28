import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 要求 JSON 輸出的呼叫必須同時啟用供應商的 JSON 模式。
 *
 * 實測（正式站）：
 *   defense-triage      20256ms  isFallback=true  summary 32 字
 *   agent-chat          11016ms  reply 618 字        ← 正常
 *   triage-universal    11778ms  4578 字            ← 正常
 *
 * 同樣呼叫 AI、其他端點都正常，只有 defense 靜默降級成規則輸出。
 * 差異在於 defense 的提示詞要求「嚴格輸出標準 JSON」，
 * 但呼叫時沒有帶 responseMimeType，供應商因此不會設定
 * response_format: json_object，模型便可能夾帶說明文字或 markdown，
 * 導致 JSON.parse 失敗而靜默退回規則備援。
 *
 * 使用者看到的是一份外觀正常、實則完全沒有 AI 參與的分析，
 * 這對法律工具是最不能接受的失敗型態。
 */

const SERVER_DIR = join(process.cwd(), 'server', 'routes');

describe('要求 JSON 的 AI 呼叫必須啟用 JSON 模式', () => {
  it('defense 端點的 AI 呼叫都帶上 responseMimeType', () => {
    const source = readFileSync(join(SERVER_DIR, 'defense.ts'), 'utf8');
    const 呼叫 = [...source.matchAll(/configuredAIProvider\.generate\(([^;]+?)\);/g)].map((m) => m[1]);
    expect(呼叫.length, 'defense.ts 應有 AI 呼叫').toBeGreaterThan(0);

    for (const 參數 of 呼叫) {
      expect(
        參數,
        `AI 呼叫未啟用 JSON 模式：configuredAIProvider.generate(${參數})`,
      ).toContain("responseMimeType: 'application/json'");
    }
  });

  it('提示詞要求 JSON 的端點不得漏掉 JSON 模式', () => {
    // 逐檔檢查：凡是提示詞內含「輸出…JSON」字樣的端點，
    // 其 AI 呼叫都必須帶 responseMimeType。
    const 端點檔 = ['defense.ts', 'triage.ts', 'unifiedWorkflow.ts'];
    const 漏掉: string[] = [];

    for (const 檔 of 端點檔) {
      const source = readFileSync(join(SERVER_DIR, 檔), 'utf8');
      // 這個提示詞確實要求 JSON 的端點才需要檢查。
      // 用明確的「輸出…JSON」型態比對，避免誤判只提到 JSON 的註解。
      if (!/輸出[^。\n]{0,20}JSON/.test(source)) continue;

      const 呼叫 = [...source.matchAll(/(?:configuredAIProvider|defaultAIProvider|defaultLegalGenerationPipeline)[^;]*?\.generate\(([^;]+?)\);/g)];
      for (const m of 呼叫) {
        // pipeline.execute 走的是 parseResponse 契約，不在本次範圍。
        if (!/\.generate\(/.test(m[0])) continue;
        if (!m[1].includes('responseMimeType')) {
          漏掉.push(`${檔}: generate(${m[1].trim().slice(0, 60)}…)`);
        }
      }
    }
    expect(漏掉, `以下呼叫要求 JSON 輸出卻未啟用 JSON 模式：\n${漏掉.join('\n')}`).toEqual([]);
  });
});
