import { describe, expect, it, vi } from 'vitest';
import { LegalWorkflowEngine, LegalWorkflowState } from './LegalWorkflowState';

describe('LegalWorkflowEngine', () => {
  it('runs the guarded workflow to completion', async () => {
    const engine = new LegalWorkflowEngine('case-1', 'input');

    await engine.runPrecheck(() => true);
    await engine.runClassification(() => ({ query: 'classified query' }));
    await engine.runRetrieval((query) => [{ query }]);
    await engine.runAnalysis((context) => ({ state: context.state }));
    await engine.runGeneration(async () => 'draft');
    await engine.runVerification((draft) => ({ draft, passed: true }));
    await engine.runApproval(() => true);

    expect(engine.complete()).toMatchObject({
      id: 'case-1',
      state: LegalWorkflowState.COMPLETED,
      generatedDraft: 'draft'
    });
  });

  it('fails closed when precheck rejects and records the error', async () => {
    const engine = new LegalWorkflowEngine('case-2', 'input');
    const error = new Error('rejected');

    await expect(engine.runPrecheck(() => { throw error; })).rejects.toBe(error);
    expect(engine.getContext()).toMatchObject({ state: LegalWorkflowState.FAILED, error });
  });

  it('rejects invalid order and failed approval', async () => {
    const engine = new LegalWorkflowEngine('case-3', 'input');

    await expect(engine.runGeneration(async () => 'draft')).rejects.toThrow('Expected ANALYZED');
    await engine.runPrecheck(() => true);
    await engine.runClassification(() => ({}));
    await engine.runRetrieval(() => []);
    await engine.runAnalysis(() => ({}));
    await engine.runGeneration(async () => 'draft');
    await engine.runVerification(() => ({ passed: false }));
    await expect(engine.runApproval(() => false)).rejects.toThrow('Document rejected');
    expect(engine.getState()).toBe(LegalWorkflowState.FAILED);
  });

  it('supports async callbacks and exposes a defensive context copy', async () => {
    const engine = new LegalWorkflowEngine('case-4', 'input');
    await engine.runPrecheck(async () => true);
    await engine.runClassification(async () => ({ query: 'q' }));
    await engine.runRetrieval(async () => []);
    await engine.runAnalysis(async () => ({}));
    await engine.runGeneration(async () => 'draft');
    await engine.runVerification(async () => ({ passed: true }));
    await engine.runApproval(vi.fn().mockResolvedValue(true));

    const context = engine.getContext();
    context.metadata!.tampered = true;
    expect(engine.getContext().metadata).not.toHaveProperty('tampered');
  });
});
