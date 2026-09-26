import type { AppealWorkflowContext } from '../../store/useAppealStore';
import type { CrossFeatureContext } from '../../lib/crossFeatureContext';
import type { RouteHandoff } from '../../types/navigation';

export function buildAppealContext(
  handoff: RouteHandoff | undefined,
  crossContext: CrossFeatureContext | null
): AppealWorkflowContext | null {
  const hasData = Boolean(
    handoff?.domain || handoff?.cause || handoff?.facts || handoff?.issuesSummary || handoff?.scenarioKeywords ||
    crossContext?.domain || crossContext?.cause || crossContext?.facts || crossContext?.issuesSummary || crossContext?.scenarioKeywords
  );
  if (!hasData) return null;

  return {
    scenarioKeywords: handoff?.scenarioKeywords || crossContext?.scenarioKeywords,
    domain: handoff?.domain || crossContext?.domain,
    cause: handoff?.cause || crossContext?.cause,
    facts: handoff?.facts || crossContext?.facts,
    issuesSummary: handoff?.issuesSummary || crossContext?.issuesSummary
  };
}
