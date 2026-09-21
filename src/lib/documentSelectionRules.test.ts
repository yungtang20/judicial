import { describe, expect, it } from 'vitest';
import { resolveDocumentTool } from './documentSelectionRules';

describe('resolveDocumentTool', () => {
  it('prioritizes judgment input and routes to appeal', () => {
    expect(resolveDocumentTool({
      inputType: 'judgment_document',
      domain: '刑事',
      recommendedToolId: 'CRIMINAL_COMPLAINT_TRAFFIC'
    })).toMatchObject({ destination: 'appeal', source: 'inputType' });
  });

  it('prioritizes explicit intent over structured domain rules', () => {
    expect(resolveDocumentTool({
      explicitIntent: 'criminal_supplementary_civil',
      domain: '刑事'
    })).toMatchObject({ toolId: 'CRIMINAL_SUPPLEMENTARY_CIVIL', source: 'explicitIntent' });
  });

  it.each([
    ['民事', 'CIVIL_COMPLAINT_GENERAL'],
    ['刑事', 'CRIMINAL_COMPLAINT_TRAFFIC'],
    ['行政', 'JUDICIAL_ADMIN_TEMPLATE']
  ])('resolves %s domain to %s', (domain, toolId) => {
    expect(resolveDocumentTool({ domain })).toMatchObject({ toolId, source: 'structured' });
  });

  it('uses a valid AI recommendation only after structured rules', () => {
    expect(resolveDocumentTool({ recommendedToolId: 'DEMAND_LETTER_GENERAL' })).toMatchObject({
      toolId: 'DEMAND_LETTER_GENERAL',
      source: 'ai'
    });
  });

  it('falls back when no rule matches', () => {
    expect(resolveDocumentTool({})).toMatchObject({
      toolId: 'CIVIL_COMPLAINT_GENERAL',
      source: 'default'
    });
  });
});
