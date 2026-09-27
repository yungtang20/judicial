import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import type { DefenseTriageResult } from '../../types';

/**
 * 防禦分流結果的欄位存取必須與實際回應一致。
 *
 * 實測：`Stage2Triage` 存取 `triageResult.extractedFacts` 與
 * `triageResult.evidenceRequirements`，但這兩個欄位在
 * `DefenseTriageResult` 型別與 API 回應中**都不存在**
 * （實際欄位是 `concreteFacts` 與 `unfruitfulPoints`）。
 *
 * 對 undefined 取 `.length`／`.map` 會在 render 時拋出例外；
 * 專案沒有錯誤邊界，React 會卸載整棵樹，
 * **整個應用變成空白畫面**且沒有任何錯誤訊息。
 */
const SRC = path.resolve(__dirname, '..');

function 收集(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (['node_modules', 'dist'].includes(entry) || entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) 收集(full, acc);
    else if (/\.tsx?$/.test(entry) && !entry.includes('.test.')) acc.push(full);
  }
  return acc;
}

const 剝除註解 = (src: string): string =>
  src
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(line => line.replace(/\/\/.*$/, ''))
    .join('\n');

describe('防禦分流結果的欄位存取', () => {
  it('不得存取 DefenseTriageResult 上不存在的欄位', () => {
    // 以實際回應樣本作為權威：這些欄位確定存在
    const 樣本: DefenseTriageResult = {
      decision: 'PHASE_2_COMMUNICATION',
      confidenceScore: 85,
      decisionReason: '理由',
      summaryOverview: '摘要',
      concreteFacts: [{
        id: 'f1', category: 'ACTION', factDescription: '事實描述',
        involvedParties: '房東', timeframe: '', location: '',
        evidenceClues: '匯款紀錄', pendingProof: '租賃契約', strategicValue: 'HIGH' as const
      }],
      unfruitfulPoints: [{
        id: 'u1', point: '主觀否認', issueType: 'EMOTIONAL_VENT',
        whyUnfruitful: '缺乏具體事實', judgePerspectiveRisk: '易被認定自認'
      }]
    };
    const 合法欄位 = Object.keys(樣本);
    expect(合法欄位).toContain('concreteFacts');
    expect(合法欄位).not.toContain('extractedFacts');
    expect(合法欄位).not.toContain('evidenceRequirements');
  });

  it('掃描原始碼，不得對分流結果存取不存在的欄位', () => {
    const 違規: string[] = [];
    const 不存在 = ['extractedFacts', 'evidenceRequirements', 'legalSources', 'isExternalRetrievalUsed', 'retrievalStatusMessage'];
    for (const 檔 of 收集(SRC)) {
      const code = 剝除註解(readFileSync(檔, 'utf8'));
      for (const 欄位 of 不存在) {
        const re = new RegExp(`triageResult\\s*\\.\\s*${欄位}\\b`, 'g');
        const 命中 = [...code.matchAll(re)];
        if (命中.length > 0) {
          違規.push(`${path.relative(SRC, 檔)}  →  triageResult.${欄位} (${命中.length} 處)`);
        }
      }
    }
    expect(違規, `以下欄位不存在於 DefenseTriageResult，存取時會使整個應用崩潰：\n${違規.join('\n')}`).toEqual([]);
  });

  it('Stage2Triage 不得對可能為 undefined 的值直接取長度', () => {
    const src = 剝除註解(readFileSync(path.join(SRC, 'defense/Stage2Triage.tsx'), 'utf8'));
    // 每個 .length 與 .map 都必須有前置的陣列檢查
    const 直接使用 = [...src.matchAll(/triageResult\.(\w+)\.(length|map|filter)\b/g)];
    for (const m of 直接使用) {
      const 欄位 = m[1];
      const 有檢查 = new RegExp(`triageResult\\.${欄位}\\s*(\\?|&&|\\.length\\s*>\\s*0)`).test(src);
      expect(有檢查, `triageResult.${欄位}.${m[2]} 前缺少存在性檢查`).toBe(true);
    }
  });

  it('應用必須有錯誤邊界，避免單一元件例外使整頁空白', () => {
    const 檔案 = 收集(SRC);
    const 有邊界 = 檔案.some(f =>
      /componentDidCatch|getDerivedStateFromError|ErrorBoundary/.test(readFileSync(f, 'utf8'))
    );
    expect(有邊界, '缺少錯誤邊界：任一元件在 render 時拋出例外都會使整個應用變成空白畫面').toBe(true);
  });
});
