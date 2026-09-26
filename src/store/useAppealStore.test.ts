import { beforeEach, describe, expect, it } from 'vitest';
import {
  mapWorkflowDomainToCaseType,
  useAppealStore
} from './useAppealStore';

describe('appeal workflow context mapping', () => {
  beforeEach(() => {
    useAppealStore.setState({
      caseType: 'civil',
      deliveryDate: '2026-09-21',
      workflowContext: null
    });
  });

  it.each([
    ['刑事', 'criminal'],
    ['行政', 'administrative'],
    ['民事', 'civil'],
    ['其他', 'civil'],
    [undefined, 'civil']
  ])('maps %s to %s', (domain, expected) => {
    expect(mapWorkflowDomainToCaseType(domain)).toBe(expected);
  });

  it('keeps the current default when context has no domain', () => {
    useAppealStore.getState().initializeFromWorkflowContext({ facts: '案情摘要' });

    expect(useAppealStore.getState().caseType).toBe('civil');
    expect(useAppealStore.getState().workflowContext?.facts).toBe('案情摘要');
  });

  it('initializes case type and delivery date from workflow context', () => {
    useAppealStore.getState().initializeFromWorkflowContext({
      domain: '刑事',
      judgmentDeliveryDate: '2026-09-20'
    });

    expect(useAppealStore.getState().caseType).toBe('criminal');
    expect(useAppealStore.getState().deliveryDate).toBe('2026-09-20');
  });
  it('resets PII, drafts, tokens, and rows when the case or workflow changes', () => {
    const issueA = { id: 'issue-a', title: 'A 爭點', originalHolding: '', appealArgument: '' };
    const evidenceA = { id: 'evidence-a', code: 'A1', relatedIssue: 'A 爭點', investigationItem: '', investigationTarget: '', targetAddress: '', provenFact: '' };
    const issueB = { id: 'issue-b', title: 'B 爭點', originalHolding: '', appealArgument: '' };
    const evidenceB = { id: 'evidence-b', code: 'B1', relatedIssue: 'B 爭點', investigationItem: '', investigationTarget: '', targetAddress: '', provenFact: '' };

    useAppealStore.setState({
      caseId: 'case-a',
      workflowStateId: 'workflow-a',
      rawText: 'A 裁判全文',
      appellantName: 'A 當事人',
      appellantId: 'A-ID',
      appelleeName: 'A 相對人',
      judicialAccount: 'A-account',
      judicialPassword: 'A-password',
      judicialToken: 'A-token',
      generatedPetition: 'A 上訴書草稿',
      issues: [issueA],
      evidences: [evidenceA]
    });
    useAppealStore.getState().initializeFromWorkflowContext({
      caseId: 'case-a',
      workflowStateId: 'workflow-a',
      issues: [issueA],
      evidences: [evidenceA]
    });
    useAppealStore.setState({ issues: [], evidences: [] });
    useAppealStore.getState().initializeFromWorkflowContext({
      caseId: 'case-a',
      workflowStateId: 'workflow-a',
      issues: [issueA],
      evidences: [evidenceA]
    });
    expect(useAppealStore.getState().issues).toEqual([issueA]);
    expect(useAppealStore.getState().evidences).toEqual([evidenceA]);

    useAppealStore.getState().initializeFromWorkflowContext({
      caseId: 'case-b',
      workflowStateId: 'workflow-b',
      issues: [issueB],
      evidences: [evidenceB]
    });

    const state = useAppealStore.getState();
    expect(state.caseId).toBe('case-b');
    expect(state.workflowStateId).toBe('workflow-b');
    expect(state.rawText).toBe('');
    expect(state.appellantName).toBe('');
    expect(state.appellantId).toBe('');
    expect(state.appelleeName).toBe('');
    expect(state.judicialAccount).toBe('');
    expect(state.judicialPassword).toBe('');
    expect(state.judicialToken).toBe('');
    expect(state.generatedPetition).toBe('');
    expect(state.issues).toEqual([issueB]);
    expect(state.evidences).toEqual([evidenceB]);
  });
});
