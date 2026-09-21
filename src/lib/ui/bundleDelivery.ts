import { evaluatePleadingDelivery } from '../finalGate/pleadingExportGate';

export interface BundleGenerationPayload {
  toolCategory: string;
  params: Record<string, string>;
}

export type BundleGenerator = (payload: BundleGenerationPayload) => Promise<any>;

export async function generateBundleDocument(
  bundleId: string,
  narrative: string,
  draft: string,
  generate: BundleGenerator
): Promise<any> {
  const result = await generate({
    toolCategory: bundleId,
    params: {
      incidentDetails: narrative,
      facts: narrative,
      caseContext: narrative,
      pleadingText: draft
    }
  });
  const decision = evaluatePleadingDelivery(bundleId, result?.pleadingDeliveryAuthorization, 'DOWNLOAD_TEXT');
  if (!decision.allowed || !result?.documentText) throw new Error(`${decision.code}: ${decision.message}`);
  return result;
}
