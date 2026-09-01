/**
 * Unified API Client for Backend Services
 * Handles network requests, error parsing, and type definitions.
 */

class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function fetchWithHandler(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let errData: any = {};
    try {
      errData = await res.json();
    } catch (e) {
      // Not JSON
    }
    throw new ApiError(errData.error || `HTTP Error ${res.status}`, errData.code);
  }
  return res.json();
}

export const apiClient = {
  fetchUrl: async (url: string) => {
    return fetchWithHandler('/api/fetch-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
  },
  
  analyzeJudgment: async (rawText: string, secondText?: string, caseType: string = 'civil') => {
    return fetchWithHandler('/api/analyze-judgment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        judgmentText: rawText,
        secondJudgmentText: secondText,
        caseType
      })
    });
  },
  
  generatePetition: async (payload: any) => {
    return fetchWithHandler('/api/generate-appeal-petition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },
  
  searchTlr: async (query: string, searchType: string) => {
    return fetchWithHandler('/api/tlr/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, searchType })
    });
  },
  
  fetchTlrFulltext: async (docId: string, system: string) => {
    return fetchWithHandler('/api/tlr/fulltext', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId, system })
    });
  },
  
  ocr: async (images: string[]) => {
    return fetchWithHandler('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images })
    });
  },

  searchPrecedents: async (keywords: string, categoryName: string, courtName: string, reason: string) => {
    return fetchWithHandler('/api/search-precedents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords, categoryName, courtName, reason })
    });
  },

  judicialAuth: async (account: string, password: string) => {
     return fetchWithHandler('/api/judicial/jdg/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, password }) // the backend routes map it to 'user' or 'account'
    });
  },

  judicialFetchDoc: async (token: string, jid: string) => {
    return fetchWithHandler('/api/judicial/jdg/jdoc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, jid })
    });
  },
  
  judicialFetchList: async (token: string, dateStart: string, dateEnd: string, court: string, sys: string) => {
    return fetchWithHandler('/api/judicial/jdg/jlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, dateStart, dateEnd, court, sys })
    });
  },

  // Defense Workflow APIs
  defenseTriage: async (payload: {
    clientInput: string;
    caseType?: string;
    caseBackground?: string;
    courtName?: string;
    caseNo?: string;
  }) => {
    return fetchWithHandler('/api/defense/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  defenseScanMines: async (payload: {
    clientInput: string;
    caseType?: string;
    caseBackground?: string;
  }) => {
    return fetchWithHandler('/api/defense/scan-mines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  defenseGeneratePleading: async (payload: {
    pleadingType: 'LAWYER_PLEADING' | 'CLIENT_PERSONAL_REPORT';
    clientInput: string;
    triageData?: any;
    mineData?: any;
    caseInfo?: any;
  }) => {
    return fetchWithHandler('/api/defense/generate-pleading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  toolboxGenerate: async (payload: {
    toolCategory: string;
    params: Record<string, any>;
  }) => {
    return fetchWithHandler('/api/toolbox/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  toolboxVerifyCitations: async (payload: {
    documentText: string;
  }) => {
    return fetchWithHandler('/api/toolbox/verify-citations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  // AI 原生 SDLC (6 階段交付引擎)
  sdlcGetProject: async (projectId: string, title?: string, legalDomain?: string) => {
    return fetchWithHandler('/api/sdlc/project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, title, legalDomain })
    });
  },

  sdlcExecuteStage: async (payload: {
    projectId: string;
    stageId: string;
    contextData?: any;
    humanInput?: string;
  }) => {
    return fetchWithHandler('/api/sdlc/execute-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  sdlcAdvanceGate: async (payload: {
    projectId: string;
    stageId: string;
    decidedBy?: string;
    decisionNote?: string;
  }) => {
    return fetchWithHandler('/api/sdlc/advance-gate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  sdlcFeedbackLoop: async (payload: {
    projectId: string;
    fromStage: string;
    targetStage: string;
    reason: string;
    suggestedAdjustments: string;
  }) => {
    return fetchWithHandler('/api/sdlc/feedback-loop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
};

