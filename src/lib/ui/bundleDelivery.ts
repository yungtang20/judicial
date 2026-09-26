import { evaluatePleadingDelivery, verifyPleadingDeliveryAuthorization } from '../finalGate/pleadingDeliveryBrowser';

export interface BundleGenerationPayload {
  toolCategory: string;
  params: Record<string, string>;
}

export type BundleGenerator = (payload: BundleGenerationPayload) => Promise<any>;

export async function generateBundleDocument(
  bundleId: string,
  narrative: string,
  draft: string,
  generate: BundleGenerator,
  extraParams: Record<string, string> = {}
): Promise<any> {
  const result = await generate({
    toolCategory: bundleId,
    params: {
      ...extraParams,
      incidentDetails: narrative,
      facts: narrative,
      caseContext: narrative,
      pleadingText: draft
    }
  });
  if (!result?.documentText) {
    const decision = evaluatePleadingDelivery(bundleId, result?.pleadingDeliveryAuthorization, 'DOWNLOAD_TEXT');
    throw new Error(`${decision.code}: ${decision.message}`);
  }
  const decision = await verifyPleadingDeliveryAuthorization(bundleId, result.pleadingDeliveryAuthorization, 'DOWNLOAD_TEXT', result.documentText);
  if (!decision.allowed) throw new Error(`${decision.code}: ${decision.message}`);
  return result;
}
