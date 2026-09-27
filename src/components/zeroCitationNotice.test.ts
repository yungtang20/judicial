import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

/**
 * 產出零引用的書狀時，介面不得顯示成「檢查完成、隨時可匯出」。
 *
 * 實測：民事起訴狀產出後全文引用檢核為 0 處，畫面卻顯示
 * 「全篇引用檢查完成：共核對 0 處法律引用」，與「100% 完成」並列。
 * 使用者會誤以為這份沒有任何法律依據的書狀可以直接遞交法院。
 *
 * 系統不應代為填入請求權基礎——那等同替使用者捏造法律主張——
 * 但必須明確告知這份書狀尚未載明任何法律依據。
 */
const SRC = path.resolve(__dirname, '..');

const 目標檔案 = [
  'components/LegalToolbox.tsx',
  'components/IssueTableGenerator.tsx',
  'components/DefenseWorkflowTool.tsx',
  'hooks/useSmartAppealAssistant.ts'
];

describe('零引用的產出文件必須明確提示', () => {
  it.each(目標檔案)('%s 在零引用時不得只顯示「檢查完成」', 檔 => {
    const 完整路徑 = path.join(SRC, 檔);
    const src = readFileSync(完整路徑, 'utf8');
    expect(src, `${檔} 缺少零引用的分支`).toMatch(/totalCitationsChecked\s*===\s*0/);
    expect(src, `${檔} 的零引用提示必須說明文件尚未引用任何法條`).toMatch(/尚未引用任何法條或裁判|共核對 0 處法律引用/);
  });

  it('提示內容必須聲明系統不會代為填入法律主張', () => {
    for (const 檔 of 目標檔案) {
      const src = readFileSync(path.join(SRC, 檔), 'utf8');
      expect(src, `${檔} 未說明系統不會代填法律主張`).toMatch(/不會代為填入法律主張|自行載明請求權基礎/);
    }
  });
});
