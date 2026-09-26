export type LitigationSection = 'guide' | 'toolbox' | 'defense' | 'issues' | 'evidence';
export type AppealSection = 'analysis' | 'defense' | 'issues' | 'evidence' | 'deadline';
export type CheckerSection = 'anti-ghost' | 'open-data' | 'local-search';
export type WorkspaceRoot = 'litigation' | 'appeal';

export type AppRoute =
  | { view: 'analysis' }
  | { view: 'litigation'; section: LitigationSection }
  | { view: 'appeal'; section: AppealSection }
  | { view: 'process-guide' }
  | { view: 'sdlc' }
  | { view: 'agent-chat' }
  | { view: 'checker'; section: CheckerSection };

export interface RouteHandoff {
  facts?: string;
  toolId?: string;
  formSeed?: Record<string, string>;
  source?: string;
  sourceTool?: string;
  domain?: string;
  cause?: string;
  scenarioKeywords?: string;
  issuesSummary?: string;
  documentType?: string;
}

export interface LegacyToolSelectionData extends RouteHandoff {
  initialTab?: LitigationSection | AppealSection | 'appeal';
  preselectedToolId?: string;
  prefilledData?: {
    incidentDetails?: string;
    pleadingText?: string;
  };
}
export function isAppRoute(value: unknown): value is AppRoute {
  if (typeof value !== 'object' || value === null || !('view' in value)) return false;
  const view = value.view;
  if (view === 'analysis' || view === 'process-guide' || view === 'sdlc' || view === 'agent-chat') return true;
  if (!('section' in value)) return false;
  const section = value.section;
  if (view === 'litigation') return section === 'guide' || section === 'toolbox' || section === 'defense' || section === 'issues' || section === 'evidence';
  if (view === 'appeal') return section === 'analysis' || section === 'defense' || section === 'issues' || section === 'evidence' || section === 'deadline';
  return view === 'checker' && (section === 'anti-ghost' || section === 'open-data' || section === 'local-search');
}

export function canonicalizeRoute(
  toolId: string,
  subTab?: string,
  data: LegacyToolSelectionData = {}
): { route: AppRoute; handoff: RouteHandoff } {
  const facts = data.facts || data.prefilledData?.incidentDetails;
  const toolIdFromData = data.toolId || data.preselectedToolId;
  const formSeed = data.formSeed || (data.prefilledData
    ? Object.fromEntries(Object.entries(data.prefilledData).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    : undefined);
  const handoff: RouteHandoff = {
    ...(facts ? { facts } : {}),
    ...(toolIdFromData ? { toolId: toolIdFromData } : {}),
    ...(formSeed ? { formSeed } : {}),
    ...(data.sourceTool ? { sourceTool: data.sourceTool } : {}),
    ...(data.source ? { source: data.source } : {}),
    ...(data.domain ? { domain: data.domain } : {}),
    ...(data.cause ? { cause: data.cause } : {}),
    ...(data.scenarioKeywords ? { scenarioKeywords: data.scenarioKeywords } : {}),
    ...(data.issuesSummary ? { issuesSummary: data.issuesSummary } : {}),
    ...(data.documentType ? { documentType: data.documentType } : {})
  };

  if (toolId === 'unified') return { route: { view: 'analysis' }, handoff };
  if (toolId === 'processGuide' || toolId === 'process-guide') return { route: { view: 'process-guide' }, handoff };
  if (toolId === 'sdlc') return { route: { view: 'sdlc' }, handoff };
  if (toolId === 'agent-chat') return { route: { view: 'agent-chat' }, handoff };
  if (toolId === 'checker' || toolId === 'docAiChecker' || toolId === 'judicialOpenData' || toolId === 'judgmentSearch') {
    const section: CheckerSection = toolId === 'judicialOpenData'
      ? 'open-data'
      : toolId === 'judgmentSearch'
        ? 'local-search'
        : 'anti-ghost';
    return { route: { view: 'checker', section }, handoff };
  }
  if (toolId === 'appeal' || toolId === 'smartAppeal' || toolId === 'appealDeadline') {
    const requestedTab = subTab || data.initialTab;
    const section: AppealSection = toolId === 'appealDeadline' || requestedTab === 'deadline'
      ? 'deadline'
      : requestedTab === 'defense' ? 'defense'
        : requestedTab === 'issues' ? 'issues'
          : requestedTab === 'evidence' ? 'evidence'
            : 'analysis';
    return { route: { view: 'appeal', section }, handoff };
  }
  if (toolId === 'litigation' || toolId === 'guide' || toolId === 'legalToolbox') {
    const requestedSection = toolId === 'guide' ? 'guide' : subTab || data.initialTab;
    const section: LitigationSection = requestedSection === 'guide' || requestedSection === 'defense' || requestedSection === 'issues' || requestedSection === 'evidence'
      ? requestedSection
      : 'toolbox';
    return { route: { view: 'litigation', section }, handoff };
  }
  return { route: { view: 'analysis' }, handoff };
}
