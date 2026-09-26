import { describe, expect, it } from 'vitest';
import { createInitialWorkflowState } from '../../lib/workflow/unifiedStateGraph';
import { projectUnifiedWorkflowToCase } from './projection';

describe('Unified workflow to CaseContext projection', () => {
  it('keeps unresolved citations unread after a completed analysis', () => {
    const state = createInitialWorkflowState('房東未退還押金');
    state.currentStep = 'COMPLETED';
    state.router = {
      domain: '民事',
      chapter: '債務',
      cause: '租賃押金',
      is_sensitive: false,
      is_complete: true,
      missing_elements: [],
      caseType: 'CIVIL'
    };
    state.rag = {
      searchQuery: '租賃押金',
      legalElements: '租賃契約與押金返还',
      statuteCitations: ['民法第449條'],
      precedents: [{
        caseNumber: '最高法院112年度台上字第9號',
        courtName: '最高法院',
        summary: '租賃契約爭議摘要',
        sourceUrl: 'https://judgment.judicial.gov.tw/example'
      }]
    };
    state.syllogism = {
      majorPremise: '租賃契約與押金規定',
      minorPremise: '房東未退還押金',
      subsumption: '依契約與押金規定判斷',
      conclusion: '應先保全租約與匯款資料',
      fullAnalysis: '分析內容'
    };

    const projection = projectUnifiedWorkflowToCase(state);

    expect(projection.facts).toBe('房東未退還押金');
    expect(projection.workflowStateId).toBe(state.id);
    expect(projection.caseType).toBe('CIVIL');
    expect(projection.workflowStage).toBe('ANALYZED');
    expect(projection.candidateCitations[0]?.sourceStatus).toBe('RETRIEVED_UNREAD');
    expect(projection.analysisResult).toMatchObject({ workflowStateId: state.id });
  });

  it('projects an incomplete analysis as triaged without pretending it is complete', () => {
    const state = createInitialWorkflowState('需要補充日期');
    state.currentStep = 'QUESTIONING';
    state.router = {
      domain: '民事',
      chapter: '債務',
      cause: '借貸',
      is_sensitive: false,
      is_complete: false,
      missing_elements: ['契約成立日期']
    };

    const projection = projectUnifiedWorkflowToCase(state);

    expect(projection.workflowStage).toBe('TRIAGED');
    expect(projection.analysisResult).toBeNull();
    expect(projection.candidateCitations).toEqual([]);
  });
});
