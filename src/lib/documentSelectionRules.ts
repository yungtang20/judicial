import { LEGAL_TOOLS, type CategoryGroupId } from './legalToolRegistry';
import { DEFAULT_DOCUMENT_TOOL_ID, DOCUMENT_IDS } from './documentCatalog';

export type DocumentSelectionDestination = 'appeal' | 'toolbox';

export interface DocumentSelectionContext {
  inputType?: 'facts' | 'judgment_document';
  explicitIntent?: string;
  explicitToolId?: string;
  domain?: string;
  caseType?: string;
  sensitive?: boolean;
  recommendedToolId?: string;
  fallbackToolId?: string;
}

export interface DocumentSelectionResult {
  destination: DocumentSelectionDestination;
  toolId?: string;
  categoryGroup?: CategoryGroupId;
  source: 'inputType' | 'explicitIntent' | 'explicitToolId' | 'structured' | 'ai' | 'default';
}

const toolById = new Map(LEGAL_TOOLS.map(tool => [tool.id, tool]));

const EXPLICIT_INTENT_TO_TOOL: Record<string, string | undefined> = {
  appeal: undefined,
  demand_letter: 'DEMAND_LETTER_GENERAL',
  civil_complaint: DOCUMENT_IDS.civilComplaint,
  criminal_complaint: DOCUMENT_IDS.criminalComplaint,
  criminal_supplementary_civil: DOCUMENT_IDS.criminalSupplementaryCivil
};

const structuredRules: Array<{
  matches: (context: DocumentSelectionContext) => boolean;
  toolId: string;
}> = [
  {
    matches: context => context.domain === '刑事' || context.caseType?.startsWith('CRIMINAL') || context.sensitive === true,
    toolId: DOCUMENT_IDS.criminalComplaint
  },
  {
    matches: context => context.domain === '行政' || context.caseType === 'ADMINISTRATIVE',
    toolId: DOCUMENT_IDS.judicialAdminTemplate
  },
  {
    matches: context => context.domain === '民事' || context.caseType === 'CIVIL',
    toolId: DOCUMENT_IDS.civilComplaint
  }
];

function resultForTool(toolId: string, source: DocumentSelectionResult['source']): DocumentSelectionResult | null {
  const tool = toolById.get(toolId);
  if (!tool) return null;
  return {
    destination: 'toolbox',
    toolId: tool.id,
    categoryGroup: tool.categoryGroup,
    source
  };
}

export function resolveDocumentTool(context: DocumentSelectionContext = {}): DocumentSelectionResult {
  if (context.inputType === 'judgment_document') {
    return { destination: 'appeal', source: 'inputType' };
  }

  if (context.explicitIntent === 'appeal') {
    return { destination: 'appeal', source: 'explicitIntent' };
  }

  const intentToolId = context.explicitIntent ? EXPLICIT_INTENT_TO_TOOL[context.explicitIntent] : undefined;
  if (intentToolId) {
    const result = resultForTool(intentToolId, 'explicitIntent');
    if (result) return result;
  }

  if (context.explicitToolId) {
    const result = resultForTool(context.explicitToolId, 'explicitToolId');
    if (result) return result;
  }

  for (const rule of structuredRules) {
    if (rule.matches(context)) {
      const result = resultForTool(rule.toolId, 'structured');
      if (result) return result;
    }
  }

  if (context.recommendedToolId) {
    const result = resultForTool(context.recommendedToolId, 'ai');
    if (result) return result;
  }

  return resultForTool(context.fallbackToolId || DEFAULT_DOCUMENT_TOOL_ID, 'default')!;
}
