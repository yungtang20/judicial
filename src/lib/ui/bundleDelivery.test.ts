import { describe, expect, it, vi } from 'vitest';
import { generateBundleDocument } from './bundleDelivery';
import { apiClient } from '../apiClient';

describe('bundleDelivery', () => {
  it('sends the narrative through the existing toolbox request shape', async () => {
    const generate = vi.fn().mockResolvedValue({
      documentText: 'ready document',
      pleadingDeliveryAuthorization: undefined
    });
    await expect(generateBundleDocument('CIVIL_COMPLAINT_GENERAL', '案情', '草稿', generate))
      .rejects.toThrow('P9_FINAL_GATE_REQUIRED');
    expect(generate).toHaveBeenCalledWith({
      toolCategory: 'CIVIL_COMPLAINT_GENERAL',
      params: { incidentDetails: '案情', facts: '案情', caseContext: '案情', pleadingText: '草稿' }
    });
  });

  it('does not return a document for a non-ready P9 response', async () => {
    const generate = vi.fn().mockResolvedValue({ documentText: 'blocked' });
    await expect(generateBundleDocument('PAYMENT_ORDER_PETITION', '案情', '', generate))
      .rejects.toThrow('P9_FINAL_GATE_REQUIRED');
  });

  it('uses the real api client request and serializes the bundle payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ documentText: 'blocked' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(generateBundleDocument('CIVIL_COMPLAINT_GENERAL', '完整案情', '', apiClient.toolboxGenerate))
      .rejects.toThrow('P9_FINAL_GATE_REQUIRED');
    expect(fetchMock).toHaveBeenCalledWith('/api/toolbox/generate', expect.objectContaining({
      body: JSON.stringify({
        toolCategory: 'CIVIL_COMPLAINT_GENERAL',
        params: { incidentDetails: '完整案情', facts: '完整案情', caseContext: '完整案情', pleadingText: '' }
      })
    }));
    vi.unstubAllGlobals();
  });
});
