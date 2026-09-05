/**
 * Unified Case Analysis Service
 *
 * Consolidates: apiClient (analyzeJudgment, defenseTriage, defenseScanMines, defenseGeneratePleading)
 *               + universalTriage (buildIntelligentRuleBasedTriage)
 * Provides a single entry point for all case analysis workflows.
 */

import type { DefenseTriageResult, MineScanResult, GeneratedPleadingResult } from '../../types';
import { apiClient } from '../apiClient';
import { buildIntelligentRuleBasedTriage } from '../universalTriage';

// ── Re-export low-level helpers ───────────────────────────────────────────────
export { buildIntelligentRuleBasedTriage as triageByRules };

// ── Unified high-level APIs ───────────────────────────────────────────────────

/**
 * Analyze a judicial judgment via the Gemini API.
 */
export async function analyzeJudgment(
  judgmentText: string,
  secondText?: string,
  caseType?: string
): Promise<any> {
  return apiClient.analyzeJudgment(judgmentText, secondText, caseType);
}

/**
 * Run defense triage (B-Point decision) on a case description.
 */
export async function triageDefense(payload: {
  clientInput: string;
  caseType?: string;
  caseBackground?: string;
  courtName?: string;
  caseNo?: string;
}): Promise<DefenseTriageResult> {
  return apiClient.defenseTriage(payload);
}

/**
 * Scan for admission mines in text.
 */
export async function scanAdmissionMines(payload: {
  clientInput: string;
  triageResult?: DefenseTriageResult;
  caseType?: string;
}): Promise<MineScanResult> {
  return apiClient.defenseScanMines(payload);
}

/**
 * Generate a pleading or personal report.
 */
export async function generatePleading(payload: {
  clientInput: string;
  pleadingType: 'LAWYER_PLEADING' | 'CLIENT_PERSONAL_REPORT';
  triageData?: any;
  mineData?: any;
  caseInfo?: any;
}): Promise<GeneratedPleadingResult> {
  return apiClient.defenseGeneratePleading(payload);
}

/**
 * Intelligent triage: run rule-based analysis first, fall back to API if needed.
 * Returns the triage result regardless of source (rule-based or API).
 */
export async function intelligentTriage(
  query: string,
  opts?: {
    useApi?: boolean;
    caseType?: string;
    caseBackground?: string;
    courtName?: string;
    caseNo?: string;
  }
): Promise<{
  source: 'rules' | 'api';
  result: any;
}> {
  const ruleBasedResult = buildIntelligentRuleBasedTriage(query);

  if (!opts?.useApi || ruleBasedResult?.category !== 'UNKNOWN') {
    return { source: 'rules', result: ruleBasedResult };
  }

  try {
    const apiResult = await apiClient.defenseTriage({
      clientInput: query,
      caseType: opts?.caseType,
      caseBackground: opts?.caseBackground,
      courtName: opts?.courtName,
      caseNo: opts?.caseNo,
    });
    return { source: 'api', result: apiResult };
  } catch {
    return { source: 'rules', result: ruleBasedResult };
  }
}
