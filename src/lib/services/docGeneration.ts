/**
 * Unified Document Generation Service
 *
 * Consolidates: generatedDocumentPipeline (verification wrapper)
 *               + apiClient (generatePetition, defenseGeneratePleading, toolboxGenerate)
 *               + apiClient.toolboxVerifyCitations (post-generation verification)
 * Provides a single entry point for all document generation workflows.
 */

import type { LegalToolboxResult, GeneratedPleadingResult } from '../../types';

// GeneratePetitionPayload is defined in apiClient.ts, not types.ts
type GeneratePetitionPayload = Parameters<typeof apiClient.generatePetition>[0];
import {
  type GeneratedDocumentVerification,
  assertGeneratedDocumentVerified as _assertGeneratedDocumentVerified,
  verifyGeneratedDocument as _verifyGeneratedDocument,
  type VerifyDocumentOptions,
} from '../generatedDocumentPipeline';
import { apiClient } from '../apiClient';

// ── Re-export low-level helpers ───────────────────────────────────────────────
export { type GeneratedDocumentVerification, type VerifyDocumentOptions };
export { _assertGeneratedDocumentVerified as assertGeneratedDocumentVerified };

// ── Unified high-level APIs ───────────────────────────────────────────────────

/**
 * Generate a petition (起訴狀/答辯狀) via the backend API.
 */
export async function generatePetition(
  payload: GeneratePetitionPayload
): Promise<{ success: boolean; content?: string; error?: string }> {
  return apiClient.generatePetition(payload);
}

/**
 * Generate a defense pleading via the backend API.
 */
export async function generateDefensePleading(payload: {
  clientInput: string;
  pleadingType: 'LAWYER_PLEADING' | 'CLIENT_PERSONAL_REPORT';
  triageData?: any;
  mineData?: any;
  caseInfo?: any;
}): Promise<GeneratedPleadingResult> {
  return apiClient.defenseGeneratePleading(payload);
}

/**
 * Generate a legal toolbox document (context-aware, best-tool selection).
 */
export async function generateToolboxDocument(
  toolCategory: string,
  params: Record<string, any>
): Promise<LegalToolboxResult> {
  return apiClient.toolboxGenerate({ toolCategory, params });
}

/**
 * Verify citations in a generated toolbox document.
 */
export async function verifyToolboxDocument(
  documentText: string
): Promise<any> {
  return apiClient.toolboxVerifyCitations({ documentText });
}

/**
 * Verify a generated document's citations using the pipeline's verifier.
 * Wraps the generatedDocumentPipeline verification step.
 */
export function verifyAfterGeneration(
  documentText: string,
  options?: VerifyDocumentOptions
): GeneratedDocumentVerification {
  return _verifyGeneratedDocument(documentText, options);
}

/**
 * Full document generation + verification pipeline:
 * 1. Generate document via generator function
 * 2. Verify citations in generated text
 * 3. Return document with verification result attached
 */
export async function generateAndVerify(
  generatorFn: () => Promise<string> | string,
  verifier?: (text: string, options?: any) => any
): Promise<GeneratedDocumentVerification> {
  const { generateVerifiedDocument } = await import('../generatedDocumentPipeline');
  return generateVerifiedDocument(generatorFn, verifier);
}
