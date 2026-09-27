import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { containsSimplifiedChinese } from '../lib/traditionalChineseGuard';
import { refineVerifiedDraft, getRefinePrompt } from '../lib/generation/draftRefiner';

/**
 * 所有 AI 生成的產出都必須有繁體中文閘門。
 *
 * 背景：先前逐條路徑補防線（統一入口工作流、草稿精修、防線工作流、律師對話助理），
 * 但漏掉了共用管線與 /api/process/router、/api/process/question。
 * 漏網路徑只有在實際使用該功能時才會浮現。
 *
 * 這裡改成兩層：
 * 1. 逐端點檢查檔案是否含防護（防止再漏）。
 * 2. 行為測試：共用管線與草稿精修在遇到簡體輸出時必須拒絕交付。
 */
const SERVER = path.resolve(__dirname, '../../server');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (entry.endsWith('.ts') && !entry.includes('.test.')) acc.push(full);
  }
  return acc;
}

const AI_CALLERS = walk(SERVER).filter(f => {
  const src = readFileSync(f, 'utf8');
  return /defaultAIProvider\.|generateStructured\(|\.generate\(/.test(src) && !f.endsWith('types.ts');
});

describe('AI 生成端點的繁體中文防護', () => {
  it('每個把模型回覆指派給輸出欄位的地方都必須有繁體檢查', () => {
    // 檔案層級的檢查抓不到「同一檔案內只保護部分輸出」的情況。
    // 先前 unifiedWorkflow 只保護動態追問，涵攝分析（主要輸出）卻沒有，
    // 檔案層級檢查會誤判為已保護。
    const workflow = readFileSync(path.resolve(SERVER, 'routes/unifiedWorkflow.ts'), 'utf8');
    expect(workflow, '涵攝輸出 fullAnalysis 未受繁體檢查').toContain('containsSimplifiedChinese(fullAnalysis)');
  });

  it('呼叫 AI 供應器的檔案都必須含繁體中文防護（含經共用管線間接覆蓋）', () => {
    // 直接防護，或走共用管線（管線本身已有閘門），或委派給已有閘門的底層模組
    const GUARDED_LIB = ['lib/generation/draftRefiner', 'lib/traditionalChineseGuard'];
    const unprotected = AI_CALLERS.filter(f => {
      const src = readFileSync(f, 'utf8');
      if (src.includes('containsSimplifiedChinese')) return false;
      if (src.includes('defaultLegalGenerationPipeline')) return false;   // 管線已把關
      return !GUARDED_LIB.some(lib => src.includes(lib));
    });
    expect(
      unprotected.map(f => path.relative(SERVER, f)),
      '這些檔案會呼叫 AI 但沒有繁體中文防護，模型偶爾以簡體回覆時會直接送到使用者面前'
    ).toEqual([]);
  });
});

describe('每個模型輸出指派點都有對應的檢查', () => {
  // 把模型回覆指派給會顯示給使用者的變數，就必須在同一個函式內有檢查。
  // 逐一列出實測會顯示的輸出點，缺一個就失敗。
  const ASSIGNMENTS: Array<{ file: string; assignment: string; guard: string }> = [
    { file: 'routes/unifiedWorkflow.ts', assignment: 'fullAnalysis = response.text', guard: 'containsSimplifiedChinese(fullAnalysis)' },
    { file: 'routes/unifiedWorkflow.ts', assignment: 'rawMessage = response.text', guard: 'containsSimplifiedChinese(rawMessage)' },
    { file: 'routes/unifiedWorkflow.ts', assignment: 'const options = JSON.parse(jsonStr)', guard: 'containsSimplifiedChinese(String(option))' },
    { file: 'routes/legalProcess.ts', assignment: 'rawMessage = response.text', guard: 'containsSimplifiedChinese(rawMessage)' },
    { file: 'routes/legalProcess.ts', assignment: '路由 chapter/cause/missing_elements', guard: 'result.chapter, result.cause' },
    { file: 'routes/legalProcess.ts', assignment: 'analysis = response.text', guard: 'containsSimplifiedChinese(analysis)' },
    { file: 'routes/judicial.ts', assignment: 'Array.isArray(parsed.precedents)', guard: 'containsSimplifiedChinese([p.summary, p.relevance, p.keyTakeaway]' },
    { file: 'routes/defense.ts', assignment: 'parsed = JSON.parse(cleaned)', guard: 'containsSimplifiedChinese(JSON.stringify(parsed))' }
  ];

  it.each(ASSIGNMENTS)('$file 的「$assignment」必須有檢查', ({ file, assignment, guard }) => {
    const src = readFileSync(path.resolve(SERVER, file), 'utf8');
    expect(src, `${file} 缺少 ${assignment} 對應的繁體檢查`).toContain(guard);
  });
});

describe('繁體中文閘門的行為', () => {
  it('草稿精修遇到簡體輸出必須拒絕交付', async () => {
    await expect(
      refineVerifiedDraft('原始草稿', '請改得更正式', [], async () => '此时需考量不当得利。')
    ).rejects.toThrow(/簡體中文/);
  });

  it('繁體輸出的草稿精修不受影響', async () => {
    const result = await refineVerifiedDraft(
      '請求返還押金。', '請改得更正式', [], async () => '請求返還押金新臺幣五萬元，並按週年利率百分之三點五計算利息。'
    );
    expect(result.documentText).toContain('新臺幣五萬元');
  });

  it('精修提示詞要求繁體中文且不得轉為簡體', () => {
    const prompt = getRefinePrompt('原稿', '請調整', []);
    expect(prompt).toContain('繁體中文');
    expect(prompt).toContain('不得轉為簡體中文');
    expect(containsSimplifiedChinese(prompt)).toBe(false);
  });
});
