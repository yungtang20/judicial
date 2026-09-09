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

  it.each(demandLetterToolIds)('defines the four demand-letter fields for %s', (toolId) => {
    expect(TOOL_FIELD_SCHEMAS[toolId]).toEqual([
      { key: 'senderName', label: '寄件人', type: 'text', showAiSuggest: true },
      { key: 'recipientName', label: '收件人', type: 'text', showAiSuggest: true },
      { key: 'amount', label: '催告金額', type: 'text', showAiSuggest: true },
      {
        key: 'incidentDetails',
        label: '催告事由經過',
        type: 'textarea',
        rows: 5,
        showAiSuggest: true
      }
    ]);
  });

  it('keeps every registered tool mapped to exactly one field schema', () => {
    const registeredIds = LEGAL_TOOLS.map((tool) => tool.id).sort();
    const schemaIds = Object.keys(TOOL_FIELD_SCHEMAS).sort();

    expect(schemaIds).toEqual(registeredIds);
    for (const toolId of registeredIds) {
      expect(TOOL_FIELD_SCHEMAS[toolId], `${toolId} must render at least one field`).not.toHaveLength(0);
    }
  });
});
