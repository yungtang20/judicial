/**
 * Unified API Client for Backend Services
 * Handles network requests, error parsing, and type definitions.
 */

import { EvidenceRow, IssueRow, PrecedentItem } from '../types';
import { withJudgmentCache } from './cache/judgmentCache';

export interface GeneratePetitionPayload {
  caseType: string;
  courtName: string;
  appealCourtName?: string;
  caseNo: string;
  sectionCode?: string;
  claimAmount?: string;
  judgmentDeliveryDate?: string;
  appellantRole?: string;
  appellantName: string;
  appellantId?: string;
  appellantAddress?: string;
  appellantPhone?: string;
  appellantLegalRep?: string;
  appelleeRole?: string;
  appelleeName: string;
  appelleeId?: string;
  appelleeAddress?: string;
  deliveryAgent?: string;
  deliveryAddress?: string;
  claims?: string;
  judgmentSummary?: string;
  issues: IssueRow[];
  evidences: EvidenceRow[];
  selectedPrecedents: PrecedentItem[];
}

class ApiError extends Error {
  code?: string;
  data?: any;
  constructor(message: string, code?: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.data = data;
  }
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  const guestToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('judicial_guest_token') : null;
  if (guestToken) headers.set('Authorization', `Bearer ${guestToken}`);
  let res = await fetch(url, { ...options, headers });
  if (res.status === 401 && !url.startsWith('/api/auth/guest')) {
    const guestRes = await fetch('/api/auth/guest', { method: 'POST' });
    if (guestRes.ok) {
      const guestData = await guestRes.json() as { token?: string };
      if (guestData.token) {
        sessionStorage.setItem('judicial_guest_token', guestData.token);
        headers.set('Authorization', `Bearer ${guestData.token}`);
        res = await fetch(url, { ...options, headers });
      }
    }
  }
  return res;
}

async function fetchWithHandler(url: string, options: RequestInit) {
  const res = await fetchWithAuth(url, options);
  if (!res.ok) {
    let errData: any = {};
    try {
      errData = await res.json();
    } catch (e) {
      // Not JSON
    }
    throw new ApiError(errData.error || `HTTP Error ${res.status}`, errData.code, errData);
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
  
  generatePetition: async (payload: GeneratePetitionPayload) => {
    return fetchWithHandler('/api/generate-appeal-petition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },
  
  searchTlr: async (query: string, searchType: string = 'all', bypassCache: boolean = false) => {
    const res = await withJudgmentCache(
      `api_searchTlr_${searchType}_${query}`,
      () => fetchWithHandler('/api/tlr/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, searchType })
      }),
      { bypassCache, ttlMs: 24 * 60 * 60 * 1000, namespace: 'tlr_search' }
    );
    return res.data;
  },
  
  fetchTlrFulltext: async (docId: string, system: string = 'judgment', bypassCache: boolean = false) => {
    const res = await withJudgmentCache(
      `api_fetchTlrFulltext_${system}_${docId}`,
      () => fetchWithHandler('/api/tlr/fulltext', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, system })
      }),
      { bypassCache, ttlMs: 7 * 24 * 60 * 60 * 1000, namespace: 'tlr_fulltext' }
    );
    return res.data;
  },
  
  ocr: async (images: string[]) => {
    return fetchWithHandler('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images })
    });
  },

  searchPrecedents: async (keywords: string, categoryName: string, courtName: string, reason: string, bypassCache: boolean = false) => {
    const res = await withJudgmentCache(
      `api_searchPrecedents_${keywords}_${categoryName}_${courtName}`,
      () => fetchWithHandler('/api/search-precedents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, categoryName, courtName, reason })
      }),
      { bypassCache, ttlMs: 24 * 60 * 60 * 1000, namespace: 'precedents' }
    );
    return res.data;
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
    answerDisposition?: string;
    answerFactsAndReasons?: string;
    opponentPosition?: string;
    evidenceList?: string;
    attachments?: string;
    documentaryEvidenceCopies?: string;
    directNotice?: string;
    documentDate?: string;
    signature?: string;
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
  },

  // Agent Chat API
  agentChat: async (userInput: string, history?: Array<{ role: string; content: string; timestamp: string }>) => {
    return fetchWithHandler('/api/agent-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userInput, history })
    });
  },
};
