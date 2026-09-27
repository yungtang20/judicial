import { describe, expect, it } from 'vitest';

import { LEGAL_TOOLS } from './legalToolRegistry';
import { TOOL_FIELD_SCHEMAS } from './toolFieldSchemas';

describe('TOOL_FIELD_SCHEMAS demand letters', () => {
  const demandLetterToolIds = [
    'DEMAND_LETTER_DEBT',
    'DEMAND_LETTER_DEFECT',
    'DEMAND_LETTER_LABOR',
    'DEMAND_LETTER_RENT_DEFAULT'
  ];

  it.each(demandLetterToolIds)('defines the required demand-letter fields for %s', (toolId) => {
    // 驗證必要欄位存在，而非釘死欄位清單。
    // 欄位數曾由 4 個增加到 10 個：模板需要寄件人／收件人地址與借貸、清償日期，
    // 表單未收集時使用者永遠無法產出可交付的書狀（被「（待填寫）」阻擋）。
    // 這個測試原本斷言「剛好四個欄位」，會在合理擴充時阻擋修正。
    const keys = TOOL_FIELD_SCHEMAS[toolId].map((field) => field.key);
    for (const required of ['senderName', 'recipientName', 'amount', 'incidentDetails']) {
      expect(keys, `${toolId} 缺少必要欄位 ${required}`).toContain(required);
    }
    // 欄位定義必須有中文標籤與型別，供使用者理解與填寫
    for (const field of TOOL_FIELD_SCHEMAS[toolId]) {
      expect(field.label, `${toolId}.${field.key} 缺少標籤`).toBeTruthy();
      expect(['text', 'textarea', 'number', 'checkbox', 'select']).toContain(field.type);
    }
  });

  it('keeps every registered tool mapped to exactly one field schema', () => {
    const registeredIds = LEGAL_TOOLS.map((tool) => tool.id).sort();

    for (const toolId of registeredIds) {
      expect(TOOL_FIELD_SCHEMAS[toolId], `${toolId} must render at least one field`).toBeDefined();
      expect(TOOL_FIELD_SCHEMAS[toolId].length).toBeGreaterThan(0);
    }
  });
});
