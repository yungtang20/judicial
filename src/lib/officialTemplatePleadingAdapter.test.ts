import { describe, expect, it } from 'vitest';
import type { OfficialTemplate } from '../types/officialTemplate';
import { adaptOfficialTemplateToCaseInput, adaptOfficialTemplateToStructuredDraft, OfficialTemplateAdapterError } from './officialTemplatePleadingAdapter';

const template = (fields: OfficialTemplate['fields']): OfficialTemplate => ({
  id: 'judicial-0202-1',
  category: '刑事',
  code: '0202',
  name: '答辯狀',
  sourcePageUrl: 'https://example.test/source',
  editableFileUrl: null,
  pdfFileUrl: null,
  officialUpdatedAt: '110-12-23',
  localFilePath: 'data/official-templates/files/judicial-0202-1.odt',
  localFileHash: 'hash',
  templateStatus: 'READY_FOR_MERGE',
  p9Status: 'P9_BLOCKED',
  fields,
  downloadedAt: '2026-09-21T00:00:00.000Z'
});

const fields: OfficialTemplate['fields'] = [
  { key: 'caseNumber', label: '案號', type: 'text', required: true },
  { key: 'defendantName', label: '被告姓名', type: 'text', required: true },
  { key: 'gender', label: '性別', type: 'select', required: true },
  { key: 'defenseFacts', label: '答辯要旨', type: 'textarea', required: true },
  { key: 'documentDate', label: '日期', type: 'date', required: true },
  { key: 'signature', label: '簽名', type: 'text', required: true }
];

const values = {
  caseNumber: '113年度訴字第123號',
  defendantName: '王小明',
  gender: '男',
  defenseFacts: '本人就起訴內容提出答辯。',
  documentDate: '2026-09-21',
  signature: '王小明'
};

describe('officialTemplatePleadingAdapter', () => {
  it('converts only supplied official fields into canonical input', () => {
    const input = adaptOfficialTemplateToCaseInput({ template: template(fields), values });
    expect(input.caseNumber).toBe(values.caseNumber);
    expect(input.parties[0].name).toBe(values.defendantName);
    expect(input.facts[0]).toMatchObject({ content: values.defenseFacts, sourceLevel: 'USER_PROVIDED_FACT' });
    expect(input.claims[0].statement).toBe(values.defenseFacts);
    expect(input.court).toBeUndefined();
  });

  it('builds a traceable draft and marks AI fabrication as false', () => {
    const draft = adaptOfficialTemplateToStructuredDraft({ template: template(fields), values });
    expect(draft.missingInputs?.filter(item => item.severity === 'BLOCKING')).toEqual([]);
    expect(draft.generationMetadata).toMatchObject({ ruleProfileId: 'OFFICIAL_CRIMINAL_ANSWER_PILOT_RULE_PROFILE' });
    expect(draft.generationMetadata).toMatchObject({
      fieldSource: 'OFFICIAL_TEMPLATE_MANIFEST_VALUES_ONLY',
      aiFabrication: false,
      templateId: 'judicial-0202-1'
    });
  });

  it('fails closed when the manifest has not completed mapping or a required value is absent', () => {
    expect(() => adaptOfficialTemplateToCaseInput({
      template: { ...template(fields), templateStatus: 'NEEDS_FIELD_MAPPING' },
      values
    })).toThrowError(OfficialTemplateAdapterError);
    try {
      adaptOfficialTemplateToCaseInput({
        template: template(fields.filter(field => field.key !== 'signature')),
        values
      });
      throw new Error('expected adapter to reject missing signature');
    } catch (error) {
      expect(error).toMatchObject({ code: 'REQUIRED_FIELD_MISSING', fields: ['signature'] });
    }
  });
});
