import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * 備援結果不得被呈現為「已提煉完成」。
 *
 * 實測：以民事判決全文（明確載明匯款 50 萬元、民法第 474 條）執行分析，
 * 畫面顯示的「案件事實故事」卻是本機規則產生的固定範本，
 * 且內含未填入的佔位詞：
 *
 *   「整起事件發生於 案發當日，地點位於 特定現場。涉案當事人 與相對人間就…」
 *
 * 同時標示「✓ 智慧剖析完成」。
 *
 * 伺服器確實回傳了 `isLocalFallback: true` 與 `fallbackNotice`，
 * `fallbacksStoryFidelity.test.ts` 也只驗證函式有產出該欄位——
 * 但畫面從未讀取它。缺口在「欄位產生了，卻沒有任何 consumer」。
 */
const SRC = path.resolve(__dirname, '..');

describe('備援結果的揭露', () => {
  it('提煉流程必須把備援狀態寫入狀態', () => {
    const src = readFileSync(path.join(SRC, 'hooks/useSmartAppealAssistant.ts'), 'utf8');
    expect(src, 'handleAnalyzeJudgment 未讀取 isLocalFallback').toMatch(/data\.isLocalFallback/);
    expect(src, '備援說明未寫入使用者可見的警告').toMatch(/fallbackNotice/);
  });

  it('備援揭露必須由狀態直接驅動，不依賴 ctx 傳遞', () => {
    // 揭露是最關鍵的一環，不能建立在 ctx 傳遞正確的前提上：
    // 實測顯示 ctx 會在傳遞時丟棄欄位，導致揭露文字從未出現。
    const src = readFileSync(path.join(SRC, 'components/appeal/AppealStep1.tsx'), 'utf8');
    expect(src, '備援揭露未由 isLocalFallbackResult 直接驅動')
      .toMatch(/judgmentSummary && isLocalFallbackResult && \(\s*<div[\s\S]{0,400}role="alert"/);
    expect(src, '備援揭露必須說明不得作為案件事實引用')
      .toMatch(/不得作為案件事實引用/);
  });

  it('備援結果不得顯示「智慧剖析完成」', () => {
    const src = readFileSync(path.join(SRC, 'components/appeal/AppealStep1.tsx'), 'utf8');
    expect(src, '完成標記未加上備援判斷').toMatch(/judgmentSummary && !isLocalFallbackResult/);
    expect(src, '缺少備援的明確標示').toMatch(/本機規則備援範本/);
  });

  it('狀態必須實際傳入情境物件，否則元件永遠拿不到', () => {
    // 實測：groundingWarning 狀態存在、元件也有解構，卻沒有被放進 ctx。
    // 傳遞時被丟棄，導致備援與核對警告從未真正顯示——
    // 「有狀態、有元件、有渲染區塊」三者在，畫面上卻什麼都沒有。
    const src = readFileSync(path.join(SRC, 'hooks/useSmartAppealAssistant.ts'), 'utf8');
    const ctxStart = src.indexOf('const ctx = {');
    expect(ctxStart, '找不到 ctx 定義').toBeGreaterThan(-1);
    const ctxBlock = src.slice(ctxStart, src.indexOf('};', ctxStart));
    expect(ctxBlock, 'ctx 未傳遞 groundingWarning')
      .toMatch(/groundingWarning,/);
    expect(ctxBlock, 'ctx 未傳遞 isLocalFallbackResult，備援標記無法顯示')
      .toMatch(/isLocalFallbackResult,/);
  });

  it('步驟情境必須提供備援狀態', () => {
    const src = readFileSync(path.join(SRC, 'components/appeal/appealStepContext.ts'), 'utf8');
    expect(src, '情境型別缺少 isLocalFallbackResult').toMatch(/isLocalFallbackResult:\s*boolean/);
  });

  it('伺服器端仍須提供揭露欄位', () => {
    const src = readFileSync(path.join(SRC, 'utils/fallbacks.ts'), 'utf8');
    expect(src, '備援結果未提供 isLocalFallback').toMatch(/isLocalFallback:\s*true/);
    expect(src, '備援結果未提供 fallbackNotice').toMatch(/fallbackNotice:/);
  });

  it('佔位詞不得被當成提煉結果呈現', () => {
    // 這兩個字串是抽取失敗時的預設值，會直接出現在「案件事實」中。
    const 佔位詞 = ['案發當日', '特定現場'];
    const src = readFileSync(path.join(SRC, 'utils/fallbacks.ts'), 'utf8');
    for (const 詞 of 佔位詞) {
      expect(src, `${詞} 應只出現在抽取失敗的預設值分支`).toContain(`"${詞}"`);
    }
  });
});
