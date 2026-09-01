import { describe, expect, it } from 'vitest';
import { generateVerifiedDocument } from '../../lib/generatedDocumentPipeline';
import { canTransitionCase } from './workflow';

describe('case lifecycle flow', () => {
  it('runs ingest through verified document generation and human gate prerequisites', async () => {
    const stages = ['INGEST', 'DEIDENTIFIED', 'TRIAGED', 'ANALYZED', 'RETRIEVED', 'DRAFTED', 'VERIFIED', 'HUMAN_APPROVED'] as const;
    stages.slice(0, -1).forEach((stage, index) => expect(canTransitionCase(stage, stages[index + 1])).toBe(true));
    const result = await generateVerifiedDocument(() => '依民法第184條第1項前段規定，請求損害賠償。');
    expect(result.antiGhostVerification.verificationPassed).toBe(true);
    expect(result.documentText).toContain('民法第184條');
  });
});
