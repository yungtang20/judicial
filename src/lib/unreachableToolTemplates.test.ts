import { describe, expect, it } from 'vitest';
import { LEGAL_TOOLS } from '../lib/legalToolRegistry';
import { LEGAL_TOOL_TITLES } from '../lib/legalToolTitles';
import { getDocumentCatalogEntry, isSelectableDocument } from './documentCatalog';

/**
 * 工具箱範本中存在、但路由永遠到不了的類別。
 *
 * toolbox.ts 對未註冊的類別回 400 UNKNOWN_TOOLBOX_CATEGORY，
 * 因此即使 toolboxFallbacks.ts 內有對應的 `case`，也永遠不會執行。
 *
 * 這些範本是未開通文件的準備素材（documentCatalog 已將其列為
 * UNSUPPORTED / selectionEnabled: false），刻意保留，不視為死碼。
 * 但必須明確記錄其不可達性——否則日後有人把類別註冊進工具表，
 * 會誤以為「開通即可使用」，而實際上 P9 交付閘門仍會擋下，
 * 產出一份永遠送不出去的文件。
 *
 * 若日後要真正開通，必須同時補上 rule profile 與 P9 授權路徑。
 */
const 不可達類別 = [
  'CRIMINAL_COMPLAINT',
  'CRIMINAL_COMPLAINT_ASSAULT',
  'CIVIL_PET_DISPUTE',
  'DEMAND_LETTER',
];

describe('未開通文件的不可達性', () => {
  const 已註冊 = new Set<string>([
    ...LEGAL_TOOLS.map(t => t.id),
    ...Object.keys(LEGAL_TOOL_TITLES),
  ]);

  it.each(不可達類別)('%s 未註冊於工具表，因此路由會擋下', 類別 => {
    // 這是「不可達」的前提。若有人註冊了，本測試會失敗並提醒
    // 同步更新文件目錄與 P9 授權路徑。
    expect(已註冊.has(類別), `${類別} 已註冊，請確認 P9 交付閘門是否已就緒`).toBe(false);
  });

  it.each(不可達類別)('%s 在文件目錄中不可選取', 類別 => {
    // 這是「不可達」的第二道保證。即使有人繞過工具表直接呼叫產製端點，
    // 文件目錄也不會把它列為可選取。
    expect(isSelectableDocument(類別), `${類別} 不應可選取`).toBe(false);

    const 項目 = getDocumentCatalogEntry(類別);
    if (項目) {
      expect(項目.generationPath, `${類別} 不應宣告可產製`).toBe('UNSUPPORTED');
    }
  });
});
