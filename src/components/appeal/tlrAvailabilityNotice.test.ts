import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 未啟用的功能必須在使用者點下去之前說明，且按鈕文字要反映實際狀態。
 *
 * 實測正式站：按鈕寫「⚖️ 判決全文庫檢索載入 (2,250萬筆免帳密)」，
 * 使用者點下去才看到「進階 TW-Legal-RAG 尚未啟用；
 * 請設定 TLR_ENABLED=true 後重新部署」。
 *
 * 介面用「2,250萬筆」這種具體數字宣傳一個開不起的功能，
 * 加深使用者期待——這與工具箱「填完表單才被告知產製不出來」
 * 是同一種失敗型態：介面先給出期待，使用者投入時間後才被否定。
 *
 * AppealStep4 原本就有正確做法（讀 /api/health 的 tlrStatus），
 * 這裡要求 AppealStep1 同樣處理，且按鈕文字本身也要反映狀態。
 */

const 宣稱檔案 = [
  'src/components/appeal/AppealStep1.tsx',
  'src/components/appeal/AppealStep4.tsx',
];

const 讀 = (f: string) => readFileSync(join(process.cwd(), f), 'utf8');

describe('未啟用功能的預先告知', () => {
  it('宣稱進階檢索的元件必須查詢其可用狀態', () => {
    for (const f of 宣稱檔案) {
      const s = 讀(f);
      if (!/2,250萬|TW-Legal-RAG/.test(s)) continue;
      for (const 標記 of ['tlrStatus', '/api/health']) {
        expect(s, `${f} 宣稱進階檢索卻未查詢可用狀態（需 ${標記}）`).toContain(標記);
      }
    }
  });

  it('AppealStep4 仍保有既有的停用說明', () => {
    expect(讀('src/components/appeal/AppealStep4.tsx')).toContain('尚未啟用');
  });

  it('未啟用時須提供替代做法', () => {
    // 只說「不可用」而不給下一步，使用者會卡住。
    const s = 讀('src/components/appeal/AppealStep1.tsx');
    const i = s.indexOf('尚未開通，點擊後無法載入');
    expect(i, 'AppealStep1 未出現含替代做法的未開通說明').toBeGreaterThan(-1);
    expect(s.slice(i, i + 200), '未開通說明未提供替代做法').toMatch(/官方|貼上|改用/);
  });

  it('按鈕文字必須反映實際狀態', () => {
    // 按鈕文字是用者最先讀到的。未啟用時仍寫「2,250萬筆免帳密」，
    // 等於宣傳一個開不起的功能。
    const s = 讀('src/components/appeal/AppealStep1.tsx');
    expect(s, '按鈕文字未依狀態切換').toMatch(/tlrStatus\s*===\s*'disabled'[\s\S]{0,300}尚未開通/);
    expect(s, '未啟用分支未處理筆數宣稱').toMatch(/尚未開通[\s\S]{0,400}2,250萬筆/);
  });

  it('掃描確實找到宣稱檔（避免測試因路徑失效而空轉）', () => {
    const 找到 = 宣稱檔案.filter((f) => /2,250萬|TW-Legal-RAG/.test(讀(f)));
    expect(找到.length, '未找到宣稱檔案，測試可能已失效').toBeGreaterThan(0);
  });
});
