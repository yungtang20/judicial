import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isToolProducible } from '../lib/documentCatalog';
import { TOOL_FIELD_SCHEMAS } from '../lib/toolFieldSchemas';

/**
 * 未開放產製的工具必須在填表前就告知。
 *
 * 實測：52 個工具中有 19 個（多為刑事告訴狀、保護令等法院書狀）
 * 尚未取得經核准的格式結構，伺服器一律以 P9_FINAL_GATE_FAILED 擋下。
 * 介面先前沒有任何事前標示，使用者得把整張表單填完、
 * 按下產製才被告知產製不出來——與表單欄位缺漏是同一種
 * 浪費使用者時間的失敗型態。
 *
 * 本測試守住：介面使用與伺服器同一份真相來源（documentCatalog），
 * 避免兩邊判斷不一致。
 */

const LegalToolbox = readFileSync(join(process.cwd(), 'src/components/LegalToolbox.tsx'), 'utf8');

describe('工具產製的可用性提示', () => {
  it('產製表單必須依 documentCatalog 判斷可用性', () => {
    // 兩邊若各用各的判斷，介面會顯示可用但伺服器擋下（或反過來）。
    expect(LegalToolbox).toContain('isToolProducible');
  });

  it('不可用的工具必須在填表區顯示說明', () => {
    expect(LegalToolbox).toContain('此類書狀尚未開放產製');
  });

  it('不可用時不得暗示可以產製', () => {
    // 有提示但按鈕仍寫「一鍵生成專業法律書狀」會造成誤導。
    const 有提示 = LegalToolbox.includes('此類書狀尚未開放產製');
    if (有提示) {
      const 區段 = LegalToolbox.slice(LegalToolbox.indexOf('此類書狀尚未開放產製'), LegalToolbox.indexOf('一鍵生成專業法律書狀'));
      expect(區段).toContain('isToolProducible');
    }
  });

  it('可選工具中確實有不可用者（避免測試因資料為空而空轉）', () => {
    const 不可用 = Object.keys(TOOL_FIELD_SCHEMAS || {}).filter((id) => !isToolProducible(id));
    expect(不可用.length, '找不到不可用工具，資料或判斷可能有問題').toBeGreaterThan(0);
  });

  it('已開放的工具不得被誤標為不可用', () => {
    // 誤標會讓可用功能看起來不能用。
    const 可用 = ['DEMAND_LETTER_RENT_DEFAULT', 'LOAN_AGREEMENT', 'DEMAND_LETTER_DEBT'];
    for (const id of 可用) {
      if (!(TOOL_FIELD_SCHEMAS || {})[id]) continue;
      expect(isToolProducible(id), `${id} 應為可用`).toBe(true);
    }
  });
});
