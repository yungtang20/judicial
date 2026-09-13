import { describe, expect, it } from 'vitest';

import { LEGAL_TOOLS } from './legalToolRegistry';
import { TOOL_FIELD_SCHEMAS } from './toolFieldSchemas';
import { buildActiveCaseFormInputs } from './toolFormDefaults';

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

    for (const toolId of registeredIds) {
      expect(TOOL_FIELD_SCHEMAS[toolId], `${toolId} must render at least one field`).toBeDefined();
      expect(TOOL_FIELD_SCHEMAS[toolId].length).toBeGreaterThan(0);
    }
  });

  it.each([
    ['CIVIL_COMPLAINT_GENERAL', [
      'courtName', 'plaintiffName', 'plaintiffAddress', 'defendantName', 'defendantAddress',
      'proceeding', 'claimStatement', 'incidentDetails', 'evidenceList', 'documentDate', 'signature'
    ]],
    ['CIVIL_TORT_GENERAL', [
      'courtName', 'complainantName', 'complainantAddress', 'accusedName', 'accusedAddress',
      'proceeding', 'claimStatement', 'incidentDetails', 'evidenceList', 'documentDate', 'signature'
    ]],
    ['SPOUSAL_RIGHT_INFRINGEMENT', [
      'courtName', 'plaintiffName', 'plaintiffAddress', 'defendant1Name', 'defendant1Address',
      'proceeding', 'claimStatement', 'incidentDetails', 'evidenceList', 'documentDate', 'signature'
    ]],
    ['PAYMENT_ORDER_PETITION', [
      'courtName', 'creditorName', 'creditorAddress', 'debtorName', 'debtorAddress', 'proceeding',
      'debtAmount', 'evidenceList', 'documentDate', 'signature'
    ]],
    ['CRIMINAL_SUPPLEMENTARY_CIVIL', [
      'courtName', 'proceeding', 'plaintiffName', 'plaintiffAddress', 'defendantName', 'defendantAddress',
      'claimStatement', 'incidentDetails', 'evidenceList', 'documentDate', 'signature'
    ]]
  ])('collects every canonical required input for %s without AI factual suggestions', (toolId, requiredKeys) => {
    const fields = TOOL_FIELD_SCHEMAS[toolId as string];
    const requiredFields = fields.filter(field => field.required);

    expect(requiredFields.map(field => field.key).sort()).toEqual([...(requiredKeys as string[])].sort());
    expect(fields.every(field => !field.showAiSuggest)).toBe(true);
    expect(fields.find(field => field.key === 'documentDate')?.type).toBe('date');
  });

  it('seeds active-case evidence from evidence descriptions, not proven facts alone', () => {
    expect(buildActiveCaseFormInputs({
      evidences: [{
        id: 'E1', code: '原證一', relatedIssue: '', investigationItem: '', investigationTarget: '',
        targetAddress: '', provenFact: '只有待證事實'
      }]
    })).not.toHaveProperty('evidenceList');

    expect(buildActiveCaseFormInputs({
      evidences: [{
        id: 'E2', code: '原證二', relatedIssue: '', investigationItem: '匯款紀錄', investigationTarget: '',
        targetAddress: '', provenFact: '借款已交付'
      }]
    }).evidenceList).toBe('原證二：匯款紀錄（待證事實：借款已交付）');
  });
});
