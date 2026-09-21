import { describe, expect, it } from 'vitest';
import { getTemplateById } from '../src/lib/officialTemplateManifest';
import { verifyOfficialTemplateP9 } from './verifyOfficialTemplateP9';

describe('verifyOfficialTemplateP9', () => {
  it('does not promote the real 0202 template while defenseFacts has no official mapping', async () => {
    const template = getTemplateById('judicial-0202-1');
    expect(template?.p9Status).not.toBe('P9_READY');
    await expect(verifyOfficialTemplateP9({
      templateId: 'judicial-0202-1',
      values: {
        caseNumber: '113年度訴字第123號',
        defendantName: '王小明',
        gender: '男',
        defenseFacts: '使用者提供之答辯事實',
      },
    })).rejects.toMatchObject({
      code: 'FIELD_MAPPING_INCOMPLETE',
    });
  });
});
