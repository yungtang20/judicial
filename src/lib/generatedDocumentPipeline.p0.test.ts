import { describe, expect, it } from 'vitest';
import { generateVerifiedDocument } from './generatedDocumentPipeline';

describe('P0 ghost citation delivery boundary', () => {
  it('blocks a generated draft containing a non-whitelisted citation', async () => {
    await expect(generateVerifiedDocument(
      () => '草稿引用民法第999條。',
      () => ({
        sanitizedText: '草稿引用民法第999條。',
        totalChecked: 1,
        ghostCount: 1,
        results: [{ citationText: '民法第999條', verified: false, isGhostOrFake: true }] as any
      })
    )).rejects.toThrow('GHOST_CITATION_BLOCKED');
  });
});
