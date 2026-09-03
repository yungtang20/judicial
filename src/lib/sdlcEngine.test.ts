import { describe, expect, it } from 'vitest';
import {
  createInitialSdlcProject,
  advanceSdlcStage,
  triggerSdlcFeedbackLoop,
  addSdlcArtifact
} from '../domain/sdlc/sdlcEngine';
import { SDLC_STAGES } from '../domain/sdlc/types';

describe('AI-Native SDLC Delivery Lifecycle Engine', () => {
  it('initializes with all 6 stages defined in the architecture image', () => {
    expect(SDLC_STAGES).toHaveLength(6);
    expect(SDLC_STAGES.map(s => s.englishName)).toEqual([
      'Plan',
      'Design',
      'Build',
      'Test',
      'Deploy',
      'Maintain'
    ]);
  });

  it('initializes project state with stage 01 in progress and others pending', () => {
    const project = createInitialSdlcProject('proj_test_01', '借款不還訴訟交付專案');
    expect(project.currentStageId).toBe('01_plan');
    expect(project.stageStatuses['01_plan']).toBe('in_progress');
    expect(project.stageStatuses['02_design']).toBe('pending');
    expect(project.stageStatuses['06_maintain']).toBe('pending');
    expect(project.iterationsCount).toBe(0);
  });

  it('stores and version-controls traceable artifacts (Intent, Spec, Code/Doc, Report, Log)', () => {
    let project = createInitialSdlcProject('proj_test_02', '租賃違約專案');
    project = addSdlcArtifact(project, '01_plan', {
      name: '立項意圖文件 (Intent)',
      category: 'intent',
      content: '當事人訴求：請求遷讓房屋並給付積欠租金20萬元',
      summary: '明確訴訟意圖與消滅時效計算'
    });

    expect(project.artifacts['01_plan']).toHaveLength(1);
    expect(project.artifacts['01_plan'][0]?.category).toBe('intent');
    expect(project.artifacts['01_plan'][0]?.version).toBe(1);

    // 新增第二版工件
    project = addSdlcArtifact(project, '01_plan', {
      name: '立項意圖文件 (Intent v2)',
      category: 'intent',
      content: '補充違約金與管轄約定',
      summary: '補充特約約定'
    });
    expect(project.artifacts['01_plan']).toHaveLength(2);
    expect(project.artifacts['01_plan'][1]?.version).toBe(2);
  });

  it('enforces Human Decision Gate before advancing to next stage', () => {
    let project = createInitialSdlcProject('proj_test_03', '侵權賠償專案');
    expect(project.gates['01_plan'].passed).toBe(false);

    project = advanceSdlcStage(project, '01_plan', '王牌主辦律師', '已核對侵權要件與除斥期間，核准推進至設計階段');
    expect(project.gates['01_plan'].passed).toBe(true);
    expect(project.gates['01_plan'].decidedBy).toBe('王牌主辦律師');
    expect(project.stageStatuses['01_plan']).toBe('completed');
    expect(project.currentStageId).toBe('02_design');
    expect(project.stageStatuses['02_design']).toBe('in_progress');
  });

  it('supports continuous feedback loop iteration back to previous stages', () => {
    let project = createInitialSdlcProject('proj_test_04', '勞資爭議專案');
    project = advanceSdlcStage(project, '01_plan');
    project = advanceSdlcStage(project, '02_design');
    project = advanceSdlcStage(project, '03_build');
    project = advanceSdlcStage(project, '04_test');
    project = advanceSdlcStage(project, '05_deploy'); // 到達 Maintain 階段

    expect(project.currentStageId).toBe('06_maintain');

    // 在 Maintain 階段發現裁判事故/新爭點，觸發回流迭代至 Design 階段
    project = triggerSdlcFeedbackLoop(
      project,
      '06_maintain',
      '02_design',
      '一審判決認定雇主資遣合法，需於二審重新設計勞基法第14條自請離職之請求權基礎',
      '重構爭點契約，補充未給付加班費作為終止契約之主要法條'
    );

    expect(project.currentStageId).toBe('02_design');
    expect(project.stageStatuses['06_maintain']).toBe('iterating');
    expect(project.stageStatuses['02_design']).toBe('in_progress');
    expect(project.iterationsCount).toBe(1);
    expect(project.feedbackHistory).toHaveLength(1);
    expect(project.feedbackHistory[0]?.targetStage).toBe('02_design');
  });
});
