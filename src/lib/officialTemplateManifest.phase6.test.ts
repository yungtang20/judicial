import { describe, expect, it } from 'vitest';
import type { OfficialTemplate } from '../types/officialTemplate';
import { synchronizeP9Statuses } from './officialTemplateManifest';

function ready(overrides: Partial<OfficialTemplate> = {}): OfficialTemplate {
  return {
    id: 'pilot', category: '刑事', code: '0000', name: 'pilot',
    sourcePageUrl: 'https://www.judicial.gov.tw/pilot', editableFileUrl: null, pdfFileUrl: null,
    officialUpdatedAt: '110-12-23', localFilePath: 'data/official-templates/files/pilot.odt',
    localFileHash: 'a'.repeat(64), templateStatus: 'READY_FOR_MERGE', p9Status: 'P9_READY',
    p9ProfileId: 'PROFILE', p9ProfileVersion: '1.0.0', p9SourceHash: 'a'.repeat(64),
    p9SourceOfficialUpdatedAt: '110-12-23', templateVersion: '110-12-23',
    p9VerifiedAt: '2026-09-21T00:00:00.000Z', fields: [], downloadedAt: null, ...overrides,
  };
}

describe('official template Phase 6 manifest integrity', () => {
  it('downgrades P9_READY when the manifest source hash drifts', () => {
    const templates = [ready({ localFileHash: 'b'.repeat(64) })];
    expect(synchronizeP9Statuses(templates, () => 'b'.repeat(64))).toBe(true);
    expect(templates[0].p9Status).toBe('P9_BLOCKED');
  });

  it('downgrades P9_READY when the template file is replaced', () => {
    const templates = [ready()];
    expect(synchronizeP9Statuses(templates, () => 'c'.repeat(64))).toBe(true);
    expect(templates[0].p9Status).toBe('P9_BLOCKED');
  });

  it('downgrades P9_READY when the official source version changes', () => {
    const templates = [ready({ officialUpdatedAt: '111-01-01' })];
    expect(synchronizeP9Statuses(templates, () => 'a'.repeat(64))).toBe(true);
    expect(templates[0].p9Status).toBe('P9_BLOCKED');
  });
});
