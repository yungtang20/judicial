import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 未啟用的功能必須在使用者點下去之前說明。
 *
 * 實測正式站：按鈕寫「⚖️ 判決全文庫檢索載入 (2,250萬筆免帳密)」，
 * 使用者點下去才看到「進階 TW-Legal-RAG 尚未啟用；
 * 請設定 TLR_ENABLED=true 後重新部署」。
 *
 * 介面宣傳了一個開不起的功能，還用「2,250萬筆」這類具體數字
 * 加深使用者的期待——這與工具箱「填完表單才被告知產製不出來」
 * 是同一種失敗型態：介面先給出期待，使用者投入時間後才被否定。
 *
 * AppealStep4 原本就有正確做法（讀 /api/health 的 tlrStatus），
 * 這裡要求 AppealStep1 與其他出現該宣稱的位置同樣處理。
 */

/** 對使用者宣稱資料庫規模或功能的元件。 */
const 宣稱檔案 = [
  'src/components/appeal/AppealStep1.tsx',
  'src/components/appeal/AppealStep4.tsx',
];

const 健康處理 = ['tlrStatus', '/api/health'];

describe('未啟用功能的預先告知', () => {
  it('宣稱進階檢索的元件必須查詢其可用狀態', () => {
    for (const f of 宣稱檔案) {
      const s = readFileSync(join(process.cwd(), f), 'utf8');
      if (!/2,250萬|TW-Legal-RAG/.test(s)) continue;
      for (const 標記 of 健康處理) {
        expect(s, `${f} 宣稱進階檢索卻未查詢可用狀態（需 ${標記}）`).toContain(標記);
      }
    }
  });

  it('AppealStep4 仍保有既有的停用說明', () => {
    const s = readFileSync(join(process.cwd(), 'src/components/appeal/AppealStep4.tsx'), 'utf8');
    expect(s).toContain('尚未啟用');
  });

  it('未啟用時須提供替代做法', () => {
    // 只說「不可用」而不給下一步，使用者會卡住。
    const s = readFileSync(join(process.cwd(), 'src/components/appeal/AppealStep1.tsx'), 'utf8');
    const i = s.indexOf('尚未開通');
    expect(i, 'AppealStep1 未出現未開通說明').toBeGreaterThan(-1);
    const 段 = s.slice(i, i + 300);
    expect(段, '未開通說明未提供替代做法').toMatch(/官方|貼上|改用/);
  });

  it('掃描確實找到宣稱檔（避免測試因路徑失效而空轉）', () => {
    const 找到 = 宣稱檔案.filter((f) => /2,250萬|TW-Legal-RAG/.test(readFileSync(join(process.cwd(), f), 'utf8')));
    expect(找到.length, '未找到宣稱檔案，測試可能已失效').toBeGreaterThan(0);
  });
});
