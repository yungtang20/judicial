import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OfficialTemplateResultPanel, type OfficialTemplateRenderResult } from './OfficialTemplateResultPanel';

async function sha256(value: ArrayBuffer | string): Promise<string> {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function result(): Promise<OfficialTemplateRenderResult> {
  const bytes = new TextEncoder().encode('odt-binary');
  return {
    templateId: 'judicial-0202-1',
    documentBase64: btoa('odt-binary'),
    documentText: 'normalized text',
    fileName: 'judicial-0202-1.odt',
    mimeType: 'application/vnd.oasis.opendocument.text',
    artifactFingerprint: await sha256(bytes.buffer),
    authorization: {
      finalGateStatus: 'READY',
      exportPolicy: 'READY_ONLY',
      templateId: 'judicial-0202-1',
      templateSourceHash: '1'.repeat(64),
      artifactFingerprint: await sha256(bytes.buffer),
      artifactMimeType: 'application/vnd.oasis.opendocument.text',
      artifactFileName: 'judicial-0202-1.odt',
      documentFingerprint: await sha256(JSON.stringify('normalized text')),
    }
  };
}

describe('OfficialTemplateResultPanel', () => {
  it('downloads only after ODT and normalized text fingerprints match', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:odt');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<OfficialTemplateResultPanel result={await result()} onError={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /下載已授權 ODT/ }));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:odt');
  });

  it('rejects a mismatched artifact fingerprint', async () => {
    const onError = vi.fn();
    const invalid = await result();
    invalid.authorization.artifactFingerprint = '0'.repeat(64);
    render(<OfficialTemplateResultPanel result={invalid} onError={onError} />);

    fireEvent.click(screen.getByRole('button', { name: /下載已授權 ODT/ }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringContaining('fingerprint')));
  });
});

