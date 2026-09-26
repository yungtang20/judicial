import { describe, expect, it } from 'vitest';
import { SDLC_STAGES } from '../sdlc/types';
import { addSdlcArtifact, createInitialSdlcProject } from './sdlcState';

describe('canonical SDLC state helpers', () => {
  it('creates the six-stage project with plan as the only active stage', () => {
    const project = createInitialSdlcProject('proj_state_01', '借款不還案件');

    expect(SDLC_STAGES).toHaveLength(6);
    expect(project.currentStageId).toBe('01_plan');
    expect(project.stageStatuses['01_plan']).toBe('in_progress');
    expect(project.stageStatuses['02_design']).toBe('pending');
    expect(project.gates['01_plan'].passed).toBe(false);
  });

  it('versions artifacts without mutating the previous project state', () => {
    const initial = createInitialSdlcProject('proj_state_02', '租賃違約案件');
    const first = addSdlcArtifact(initial, '01_plan', {
      name: '立項意圖文件',
      category: 'intent',
      content: '確認請求權與爭點',
      summary: '完成案件目標確認'
    });
    const second = addSdlcArtifact(first, '01_plan', {
      name: '立項意圖文件 v2',
      category: 'intent',
      content: '補充管轄與時效',
      summary: '補充程序風險'
    });

    expect(initial.artifacts['01_plan']).toHaveLength(0);
    expect(first.artifacts['01_plan']).toHaveLength(1);
    expect(second.artifacts['01_plan']).toHaveLength(2);
    expect(second.artifacts['01_plan'].map(artifact => artifact.version)).toEqual([1, 2]);
  });
});
