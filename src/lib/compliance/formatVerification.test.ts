import { describe, expect, it } from 'vitest';
import { FORMAT_PROFILES } from '../rules/civilPleadingRuleProfile';
import { verifyExternalDocument } from './externalDocumentVerifier';
import { verifyGenerationTemplate } from './generationTemplateVerifier';

describe('format verification boundaries', () => {
  it('verifies the applied generation profile without parsing a document', () => {
    expect(verifyGenerationTemplate('civil', { ...FORMAT_PROFILES.civil }).status).toBe('COMPLIANT');
    expect(verifyGenerationTemplate('civil', {
      ...FORMAT_PROFILES.civil,
      marginsCm: { top: 1, bottom: 1, left: 1, right: 1 }
    }).status).toBe('CONFLICT');
    expect(verifyGenerationTemplate('civil', {
      ...FORMAT_PROFILES.civil,
      formatConfirmed: false
    }).status).toBe('UNVERIFIED');
    const reordered = {
      doubleSidedPrint: FORMAT_PROFILES.civil.doubleSidedPrint,
      ...FORMAT_PROFILES.civil
    };
    expect(verifyGenerationTemplate('civil', reordered).status).toBe('COMPLIANT');
  });

  it('keeps external binary verification separate and fail-closed', () => {
    const findings = verifyExternalDocument({ fileType: 'PDF', bytes: new Uint8Array([1, 2, 3]) });

    expect(findings).toEqual([
      expect.objectContaining({ ruleId: 'EXTERNAL_DOCUMENT_FORMAT', status: 'UNVERIFIED' })
    ]);
  });
});
