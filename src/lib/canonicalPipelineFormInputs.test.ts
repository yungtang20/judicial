import { describe, it, expect } from 'vitest';
import { executeCanonicalPleadingPipeline, CanonicalPleadingInputError } from '../../server/services/canonicalPleadingPipeline';
import { TOOL_FIELD_SCHEMAS } from './toolFieldSchemas';
import { getCourtPleadingConfig } from './rules/courtPleadingRuleProfiles';

/**
 * 確定性管線類別的表單必須提供管線所需的輸入。
 *
 * 實測：CRIMINAL_SUPPLEMENTARY_CIVIL（刑事附帶民事訴訟起訴狀）需要
 * evidence（證據）與 subject_and_facts（訴訟標的及原因事實），
 * 但表單 11 個欄位都沒有對應項目，使用者永遠產不出這份書狀。
 *
 * 這與「模板欄位多於表單欄位」是同一類問題的另一個方向：
 * 管線需要的輸入，表單沒有讓使用者填。
 */
// 只涵蓋同時是「使用者可見的工具」且「有確定性管線設定」的類別。
// CIVIL_TORT_GENERAL 雖受 P9 保護但無管線設定、也非工具清單中的項目；
// CRIMINAL_SUPPLEMENTARY_CIVIL 有管線但不在使用者工具清單中。
const CANONICAL_IDS = [
  'CIVIL_COMPLAINT_GENERAL',
  'SPOUSAL_RIGHT_INFRINGEMENT',
  'PAYMENT_ORDER_PETITION'
];

const fillFromSchema = (toolId: string) => {
  const schema = TOOL_FIELD_SCHEMAS[toolId] || [];
  return Object.fromEntries(schema.map(f => [
    f.key,
    /Address/.test(f.key) ? '測試地址100號'
      : /Date|Start|End/.test(f.key) ? '113年5月1日'
      : /Amount|Total|Expense|Loss|Solatium|Support|Rent/.test(f.key) ? '250,000'
      : '測試內容'
  ]));
};

describe('確定性管線類別的輸入可從表單取得', () => {
  it.each(CANONICAL_IDS)('%s 填滿表單後應能產製', async (toolId) => {
    expect(getCourtPleadingConfig(toolId), `${toolId} 應有確定性管線設定`).not.toBeNull();
    let missing: string[] = [];
    try {
      await executeCanonicalPleadingPipeline(toolId, fillFromSchema(toolId));
    } catch (error) {
      if (error instanceof CanonicalPleadingInputError) {
        missing = (error as unknown as { missingInputs: Array<{ field: string }> }).missingInputs.map(m => m.field);
      } else {
        throw error;
      }
    }
    expect(
      missing,
      `${toolId} 填滿表單欄位後，管線仍缺少：${missing.join('、')}。表單必須提供對應欄位讓使用者填寫。`
    ).toEqual([]);
  });
});
