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
});
