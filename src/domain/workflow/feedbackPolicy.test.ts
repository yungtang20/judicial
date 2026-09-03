import { describe, expect, it } from 'vitest';
import { FeedbackPolicy } from './feedbackPolicy';
import { AppError } from './errors';

describe('FeedbackPolicy & Governance', () => {
  it('allows legally valid feedback loop paths', () => {
    expect(FeedbackPolicy.isAllowedFeedback('04_test', '03_build')).toBe(true);
    expect(FeedbackPolicy.isAllowedFeedback('04_test', '02_design')).toBe(true);
    expect(FeedbackPolicy.isAllowedFeedback('06_maintain', '01_plan')).toBe(true);
    expect(FeedbackPolicy.isAllowedFeedback('06_maintain', '02_design')).toBe(true);
  });

  it('rejects illegal feedback routes', () => {
    expect(FeedbackPolicy.isAllowedFeedback('01_plan', '06_maintain')).toBe(false);
    expect(FeedbackPolicy.isAllowedFeedback('02_design', '05_deploy')).toBe(false);
    expect(FeedbackPolicy.isAllowedFeedback('03_build', '05_deploy')).toBe(false);
  });

  it('prohibits AI from autonomously triggering feedback loop transitions', () => {
    expect(() => {
      FeedbackPolicy.assertFeedback('04_test', '03_build', '發現引註缺陷需重寫書狀', {
        actorId: 'ai_agent_01',
        actorType: 'AI',
        role: 'GENERATOR'
      });
    }).toThrowError(/AI Agent 禁止直接觸發/);
  });

  it('requires a substantive reason (at least 5 chars)', () => {
    expect(() => {
      FeedbackPolicy.assertFeedback('04_test', '03_build', '改', {
        actorId: 'lawyer_01',
        actorType: 'HUMAN',
        role: 'APPROVER'
      });
    }).toThrowError(/必須提供至少 5 字之具體裁判事故/);
  });

  it('creates immutable FeedbackArtifact with APPLIED status', () => {
    const artifact = FeedbackPolicy.createFeedbackArtifact(
      'proj_test_fb',
      '04_test',
      '03_build',
      '測試階段掃描發現消滅時效計算漏洞，需修正訴狀請求金額',
      '調整本金利息起算日',
      { actorId: 'lawyer_01', actorType: 'HUMAN', role: 'APPROVER' }
    );

    expect(artifact.id).toMatch(/^fb_/);
    expect(artifact.status).toBe('APPLIED');
    expect(artifact.fromStage).toBe('04_test');
    expect(artifact.targetStage).toBe('03_build');
    expect(artifact.requestedBy.actorType).toBe('HUMAN');
  });
});
