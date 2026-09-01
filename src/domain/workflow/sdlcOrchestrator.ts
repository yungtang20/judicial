/**
 * SDLC Workflow Orchestrator
 * 核心工作流編排引擎：由 Engine 控制、由 Validator 驗證、由 Gate 放行
 */

import { AIProvider } from '../../ai/providers/AIProvider';
import { defaultGeminiProvider } from '../../ai/providers/GeminiProvider';
import {
  SdlcStageId,
  SdlcProjectState,
  SdlcArtifact,
  ExecutionMode
} from '../sdlc/types';
import { createInitialSdlcProject, addSdlcArtifact } from '../sdlc/sdlcEngine';
import { SdlcProjectRepository, defaultSdlcRepository } from './repository';
import { AppError } from './errors';
import { AuthorizationPolicy, ApprovalContext } from './authorization';
import { canTransition, assertTransition } from './stageTransitions';
import { FeedbackPolicy, FeedbackArtifact } from './feedbackPolicy';
import { STAGE_CONTRACTS } from './stageContracts';
import { stageExecutorsMap } from './stageExecutors';
import { AuditLogRepository, defaultAuditLogger } from './auditEvent';

export class SdlcOrchestrator {
  constructor(
    private repository: SdlcProjectRepository = defaultSdlcRepository,
    private aiProvider: AIProvider = defaultGeminiProvider,
    private auditLogger: AuditLogRepository = defaultAuditLogger
  ) {}

  /**
   * 1. 取得或初始化專案狀態
   */
  public async getOrCreateProject(
    projectId: string,
    title: string = '民商事爭議訴訟 AI 原生交付流程',
    legalDomain: string = 'CIVIL',
    executionMode: ExecutionMode = 'REAL'
  ): Promise<SdlcProjectState> {
    let project = await this.repository.get(projectId);
    if (!project) {
      project = createInitialSdlcProject(projectId, title, legalDomain);
      project.executionMode = executionMode;
      await this.repository.create(project);

      this.auditLogger.log({
        workflowId: projectId,
        stageId: '01_plan',
        actorType: 'SYSTEM',
        actorId: 'system_init',
        eventType: 'STAGE_STARTED',
        result: 'SUCCESS',
        metadata: { title, legalDomain, executionMode }
      });
    }
    return project;
  }

  /**
   * 2. 執行特定 Stage 生成與驗證 (Execute Stage)
   */
  public async executeStage(
    projectId: string,
    stageId: SdlcStageId,
    humanInput: string,
    context: ApprovalContext,
    customAiProvider?: AIProvider
  ): Promise<{ project: SdlcProjectState; artifact: SdlcArtifact; executionResult: any }> {
    // 1. 權限檢驗：必須具備 GENERATE 權限
    AuthorizationPolicy.assertPermission(context, 'GENERATE', `執行階段 [${stageId}] 生成`);

    const project = await this.getOrCreateProject(projectId);
    const executor = stageExecutorsMap[stageId];
    if (!executor) {
      throw new AppError('INTERNAL_ERROR', `未找到階段 [${stageId}] 對應之執行器。`, 500);
    }

    this.auditLogger.log({
      workflowId: projectId,
      stageId,
      actorType: context.actorType,
      actorId: context.actorId,
      eventType: 'AI_GENERATION_STARTED',
      result: 'SUCCESS',
      metadata: { inputLength: humanInput?.length || 0 }
    });

    const activeAi = customAiProvider || this.aiProvider;
    const executionMode = project.executionMode || 'REAL';

    // 收集前置階段工件作為上下文
    const previousArtifacts = Object.values(project.artifacts).flat();

    const result = await executor.execute(
      humanInput,
      { legalDomain: project.legalDomain, previousArtifacts },
      activeAi,
      executionMode
    );

    this.auditLogger.log({
      workflowId: projectId,
      stageId,
      actorType: context.actorType,
      actorId: context.actorId,
      eventType: 'AI_GENERATION_COMPLETED',
      result: result.verificationResult.status === 'FAIL' ? 'FAILURE' : 'SUCCESS',
      metadata: { status: result.verificationResult.status, errors: result.verificationResult.errors }
    });

    // 記錄驗證日誌
    this.auditLogger.log({
      workflowId: projectId,
      stageId,
      actorType: 'SYSTEM',
      actorId: 'validator_pipeline',
      eventType: result.verificationResult.status === 'FAIL' ? 'VALIDATION_FAILED' : 'VALIDATION_PASSED',
      result: result.verificationResult.status === 'FAIL' ? 'FAILURE' : 'SUCCESS',
      metadata: { checksCount: result.verificationResult.checks.length }
    });

    // 新增 Artifact 至專案狀態
    const updatedProject = addSdlcArtifact(project, stageId, {
      name: `${stageId.toUpperCase()} 交付工件 (Artifact)`,
      category: result.artifactCategory,
      content: result.artifactContent,
      summary: result.summary,
      executionMode: result.executionMode,
      metadata: { verification: result.verificationResult }
    });

    await this.repository.save(updatedProject);

    this.auditLogger.log({
      workflowId: projectId,
      stageId,
      actorType: context.actorType,
      actorId: context.actorId,
      eventType: 'ARTIFACT_CREATED',
      result: 'SUCCESS',
      metadata: { category: result.artifactCategory, version: updatedProject.artifacts[stageId]?.length }
    });

    return {
      project: updatedProject,
      artifact: updatedProject.artifacts[stageId]![updatedProject.artifacts[stageId]!.length - 1]!,
      executionResult: result
    };
  }

  /**
   * 3. 人工決策 Gate 審核與推進 (Approve Gate & Advance)
   */
  public async advanceGate(
    projectId: string,
    stageId: SdlcStageId,
    context: ApprovalContext,
    decisionNote?: string
  ): Promise<SdlcProjectState> {
    // 規則 1：嚴格禁止 AI 簽核 Human Gate
    AuthorizationPolicy.assertHumanGateApprover(context, `階段門閥 ${stageId}`);

    const project = await this.repository.get(projectId);
    if (!project) {
      throw new AppError('PROJECT_NOT_FOUND', `找不到 SDLC 專案 [${projectId}]`, 404);
    }

    // 規則 2：必須為當前或合法審批階段
    if (project.currentStageId !== stageId && project.stageStatuses[stageId] !== 'in_progress') {
      throw new AppError(
        'GATE_NOT_READY',
        `階段門閥未就緒：目前專案處於 [${project.currentStageId}]，無法審批 [${stageId}]。`,
        409
      );
    }

    // 規則 3：檢查 StageContract 前置工件是否齊全
    const contract = STAGE_CONTRACTS[stageId];
    const stageArtifacts = project.artifacts[stageId] || [];
    if (stageArtifacts.length === 0) {
      throw new AppError(
        'MISSING_ARTIFACT',
        `門閥拒絕放行：階段 [${stageId}] 尚未產出任何必要工件，無法放行。`,
        422,
        { requiredCategories: contract.requiredArtifactCategories }
      );
    }

    // 規則 4：檢查工件最後一次驗證結果（Fail-Closed 阻擋）
    const latestArtifact = stageArtifacts[stageArtifacts.length - 1]!;
    const verification = latestArtifact.metadata?.verification as any;
    if (verification && verification.status === 'FAIL') {
      this.auditLogger.log({
        workflowId: projectId,
        stageId,
        actorType: context.actorType,
        actorId: context.actorId,
        eventType: 'GATE_REJECTED',
        result: 'BLOCKED',
        metadata: { reason: '工件驗證失敗未通過', errors: verification.errors }
      });

      throw new AppError(
        'VERIFICATION_FAILED',
        `門閥拒絕放行：階段 [${stageId}] 最新工件未通過驗證檢核 (${verification.errors?.join('; ') || '驗證失敗'})。`,
        422,
        { verification }
      );
    }

    // 規則 5：計算下一個階段並檢查 Deterministic State Machine
    const stageOrder: SdlcStageId[] = ['01_plan', '02_design', '03_build', '04_test', '05_deploy', '06_maintain'];
    const currentIndex = stageOrder.indexOf(stageId);
    const nextStage = stageOrder[currentIndex + 1];

    if (nextStage) {
      assertTransition(stageId, nextStage, { reason: decisionNote });
    }

    // 推進狀態
    project.stageStatuses[stageId] = 'completed';
    project.gates[stageId] = {
      ...project.gates[stageId],
      stageId,
      gateName: project.gates[stageId]?.gateName || `${stageId} Gate`,
      riskDescription: project.gates[stageId]?.riskDescription || '人工決策放行',
      requiredCheckpoints: project.gates[stageId]?.requiredCheckpoints || [],
      passed: true,
      decidedBy: `${context.name} (${context.role})`,
      decidedAt: new Date().toISOString(),
      decisionNote: decisionNote || '已由授權人員完成合規審查並放行'
    };

    if (nextStage) {
      project.currentStageId = nextStage;
      project.stageStatuses[nextStage] = 'in_progress';
    }

    project.updatedAt = new Date().toISOString();
    await this.repository.save(project);

    this.auditLogger.log({
      workflowId: projectId,
      stageId,
      actorType: context.actorType,
      actorId: context.actorId,
      eventType: 'GATE_APPROVED',
      result: 'SUCCESS',
      metadata: { decidedBy: context.name, nextStage }
    });

    if (nextStage) {
      this.auditLogger.log({
        workflowId: projectId,
        stageId: nextStage,
        actorType: 'SYSTEM',
        actorId: 'workflow_orchestrator',
        eventType: 'TRANSITION_COMPLETED',
        result: 'SUCCESS',
        metadata: { from: stageId, to: nextStage }
      });
    }

    return project;
  }

  /**
   * 4. 觸發持續反饋閉環回流 (Trigger Feedback Loop)
   */
  public async triggerFeedbackLoop(
    projectId: string,
    fromStage: SdlcStageId,
    targetStage: SdlcStageId,
    reason: string,
    suggestedAdjustments: string,
    context: ApprovalContext
  ): Promise<{ project: SdlcProjectState; feedbackArtifact: FeedbackArtifact }> {
    const project = await this.repository.get(projectId);
    if (!project) {
      throw new AppError('PROJECT_NOT_FOUND', `找不到 SDLC 專案 [${projectId}]`, 404);
    }

    // 透過 FeedbackPolicy 強制驗證合法路徑與實體型態
    const feedbackArtifact = FeedbackPolicy.createFeedbackArtifact(
      projectId,
      fromStage,
      targetStage,
      reason,
      suggestedAdjustments,
      {
        actorId: context.actorId,
        actorType: context.actorType === 'AI' ? 'HUMAN' : context.actorType,
        role: context.role
      }
    );

    project.currentStageId = targetStage;
    project.stageStatuses[fromStage] = 'iterating';
    project.stageStatuses[targetStage] = 'in_progress';
    project.iterationsCount += 1;
    project.feedbackHistory.unshift({
      timestamp: new Date().toISOString(),
      fromStage,
      targetStage,
      reason,
      suggestedAdjustments
    });
    project.updatedAt = new Date().toISOString();

    await this.repository.save(project);

    this.auditLogger.log({
      workflowId: projectId,
      stageId: fromStage,
      actorType: context.actorType,
      actorId: context.actorId,
      eventType: 'FEEDBACK_CREATED',
      result: 'SUCCESS',
      metadata: { targetStage, reason, feedbackId: feedbackArtifact.id }
    });

    return { project, feedbackArtifact };
  }
}

export const defaultSdlcOrchestrator = new SdlcOrchestrator();
