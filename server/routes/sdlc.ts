import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { defaultSdlcOrchestrator } from '../../src/domain/workflow/sdlcOrchestrator';
import { SdlcStageId, ExecutionMode, SdlcProjectState } from '../../src/domain/sdlc/types';
import {
  extractSandboxAwareApprovalContext,
  isSandboxApprovalGrant,
  ApprovalContext
} from '../../src/domain/workflow/authorization';
import { AppError } from '../../src/domain/workflow/errors';
import { defaultAuditLogger } from '../../src/domain/workflow/auditEvent';
import { verifyTenantOwnership } from '../middleware/tenantScope.js';

export const sdlcRouter = Router();

// 輔助函式：自 HTTP Request 提取審批上下文 (ApprovalContext)
// 於 REQUIRE_AUTH=true 且非 production 的沙盒環境中，guest 訪客會被降級為 SANDBOX 角色
// 並取得明確的「沙盒核准」授予書：可執行 SDLC 階段與推進階段門閥，但絕不具備 APPROVE 權限。
function getApprovalContext(req: Request): ApprovalContext {
  return extractSandboxAwareApprovalContext(req);
}

// 輔助函式：沙盒核准之稽核留痕
// 沙盒放行必須在稽核紀錄中可被明確辨識為「沙盒核准」而非人工審批，故額外記錄核准路徑與授予書。
function logSandboxGateAudit(
  context: ApprovalContext,
  workflowId: string,
  stageId: SdlcStageId,
  eventType: 'GATE_REQUESTED' | 'GATE_REJECTED',
  metadata: Record<string, unknown>
): void {
  if (!isSandboxApprovalGrant(context.sandboxGrant)) return;
  defaultAuditLogger.log({
    workflowId,
    stageId,
    actorType: context.actorType,
    actorId: context.actorId,
    eventType,
    result: eventType === 'GATE_REJECTED' ? 'BLOCKED' : 'SUCCESS',
    metadata: {
      approvalPath: 'SANDBOX_GUEST',
      decidedBy: context.name,
      sandboxGrant: context.sandboxGrant,
      ...metadata
    }
  });
}

// 輔助函式：強制核實資源所有權與租戶隔離
function assertProjectTenantOwnership(req: Request, project: { tenantId?: string; ownerId?: string }) {
  const check = verifyTenantOwnership(req, project);
  if (!check.allowed) {
    throw new AppError(
      'PERMISSION_DENIED',
      check.reason || '禁止跨租戶存取案件或文件資源',
      403
    );
  }
}

// 統一錯誤響應處理器
function handleRouteError(err: any, res: Response) {
  if (err instanceof AppError) {
    return res.status(err.status).json(err.toJSON());
  }
  console.error('SDLC Route Unexpected Error:', err);
  return res.status(500).json({
    error: err.message || '內部伺服器錯誤',
    code: 'INTERNAL_ERROR',
    status: 500
  });
}

// 1. 初始化或獲取 SDLC 交付項目 (GET / POST)
sdlcRouter.post('/project', async (req: Request, res: Response) => {
  try {
    const { projectId, title, legalDomain, executionMode } = req.body;
    const id = projectId || `sdlc_${randomUUID()}`;
    const tenantId = req.tenantContext?.tenantId;
    const ownerId = req.tenantContext?.userId;

    const existing = await defaultSdlcOrchestrator.getProject(id);
    if (existing) {
      assertProjectTenantOwnership(req, existing);
    }

    const project = await defaultSdlcOrchestrator.getOrCreateProject(
      id,
      title || '民商事爭議訴訟 AI 原生交付流程',
      legalDomain || 'CIVIL',
      (executionMode as ExecutionMode) || 'REAL',
      tenantId,
      ownerId
    );
    assertProjectTenantOwnership(req, project);
    res.json({ success: true, project });
  } catch (err) {
    handleRouteError(err, res);
  }
});

sdlcRouter.get('/project/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await defaultSdlcOrchestrator.getProject(id);
    if (!project) {
      return res.status(404).json({
        error: `找不到 ID 為 [${id}] 之 SDLC 專案`,
        code: 'NOT_FOUND',
        status: 404
      });
    }

    assertProjectTenantOwnership(req, project);
    res.json({ success: true, project });
  } catch (err) {
    handleRouteError(err, res);
  }
});

// 修改專案屬性 (PATCH /project/:id)
sdlcRouter.patch('/project/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await defaultSdlcOrchestrator.getProject(id);
    if (!project) {
      return res.status(404).json({
        error: `找不到 ID 為 [${id}] 之 SDLC 專案`,
        code: 'NOT_FOUND',
        status: 404
      });
    }

    assertProjectTenantOwnership(req, project);

    // Mass Assignment 防禦：僅允許更新合法業務欄位，嚴禁竄改 tenantId, ownerId, projectId
    const { title, legalDomain } = req.body;
    const updated = await defaultSdlcOrchestrator.updateProject(id, { title, legalDomain });
    res.json({ success: true, project: updated });
  } catch (err) {
    handleRouteError(err, res);
  }
});

// 刪除專案 (DELETE /project/:id)
sdlcRouter.delete('/project/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await defaultSdlcOrchestrator.getProject(id);
    if (!project) {
      return res.status(404).json({
        error: `找不到 ID 為 [${id}] 之 SDLC 專案`,
        code: 'NOT_FOUND',
        status: 404
      });
    }

    assertProjectTenantOwnership(req, project);

    await defaultSdlcOrchestrator.deleteProject(id);
    res.json({ success: true, message: `專案 [${id}] 已成功刪除` });
  } catch (err) {
    handleRouteError(err, res);
  }
});

// 查詢專案內特定書狀/工件 (GET /project/:projectId/artifact/:artifactId)
sdlcRouter.get('/project/:projectId/artifact/:artifactId', async (req: Request, res: Response) => {
  try {
    const { projectId, artifactId } = req.params;
    const project = await defaultSdlcOrchestrator.getProject(projectId);
    if (!project) {
      return res.status(404).json({
        error: `找不到 ID 為 [${projectId}] 之專案`,
        code: 'NOT_FOUND',
        status: 404
      });
    }

    assertProjectTenantOwnership(req, project);

    const artifact = await defaultSdlcOrchestrator.getArtifact(projectId, artifactId);
    if (!artifact) {
      return res.status(404).json({
        error: `找不到 ID 為 [${artifactId}] 之書狀或工件`,
        code: 'NOT_FOUND',
        status: 404
      });
    }

    res.json({ success: true, artifact });
  } catch (err) {
    handleRouteError(err, res);
  }
});

// 修改專案內特定書狀/工件 (PATCH /project/:projectId/artifact/:artifactId)
sdlcRouter.patch('/project/:projectId/artifact/:artifactId', async (req: Request, res: Response) => {
  try {
    const { projectId, artifactId } = req.params;
    const project = await defaultSdlcOrchestrator.getProject(projectId);
    if (!project) {
      return res.status(404).json({
        error: `找不到 ID 為 [${projectId}] 之專案`,
        code: 'NOT_FOUND',
        status: 404
      });
    }

    assertProjectTenantOwnership(req, project);

    const { content, summary } = req.body;
    const updatedArtifact = await defaultSdlcOrchestrator.updateArtifact(projectId, artifactId, { content, summary });
    if (!updatedArtifact) {
      return res.status(404).json({
        error: `找不到 ID 為 [${artifactId}] 之書狀或工件`,
        code: 'NOT_FOUND',
        status: 404
      });
    }

    res.json({ success: true, artifact: updatedArtifact });
  } catch (err) {
    handleRouteError(err, res);
  }
});

// 刪除專案內特定書狀/工件 (DELETE /project/:projectId/artifact/:artifactId)
sdlcRouter.delete('/project/:projectId/artifact/:artifactId', async (req: Request, res: Response) => {
  try {
    const { projectId, artifactId } = req.params;
    const project = await defaultSdlcOrchestrator.getProject(projectId);
    if (!project) {
      return res.status(404).json({
        error: `找不到 ID 為 [${projectId}] 之專案`,
        code: 'NOT_FOUND',
        status: 404
      });
    }

    assertProjectTenantOwnership(req, project);

    const deleted = await defaultSdlcOrchestrator.deleteArtifact(projectId, artifactId);
    if (!deleted) {
      return res.status(404).json({
        error: `找不到 ID 為 [${artifactId}] 之書狀或工件`,
        code: 'NOT_FOUND',
        status: 404
      });
    }

    res.json({ success: true, message: `書狀/工件 [${artifactId}] 已成功刪除` });
  } catch (err) {
    handleRouteError(err, res);
  }
});

// 2. 委派 Orchestrator 執行特定階段 (POST /execute-stage)
sdlcRouter.post('/execute-stage', async (req: Request, res: Response) => {
  try {
    const { projectId, stageId, humanInput } = req.body;
    if (!projectId || !stageId) {
      return res.status(400).json({
        error: '缺少必填參數 projectId 或 stageId',
        code: 'SCHEMA_VALIDATION_FAILED',
        status: 400
      });
    }

    const project = await defaultSdlcOrchestrator.getProject(projectId);
    if (!project) {
      return res.status(404).json({
        error: `找不到 ID 為 [${projectId}] 之 SDLC 專案`,
        code: 'NOT_FOUND',
        status: 404
      });
    }
    assertProjectTenantOwnership(req, project);

    const context = getApprovalContext(req);
    const result = await defaultSdlcOrchestrator.executeStage(
      projectId,
      stageId as SdlcStageId,
      humanInput || '',
      context
    );

    res.json({
      success: true,
      project: result.project,
      artifactContent: result.artifact.content,
      verificationResult: result.executionResult.verificationResult
    });
  } catch (err) {
    handleRouteError(err, res);
  }
});

// 3. 人工決策 Gate 審批放行 (POST /advance-gate)
sdlcRouter.post('/advance-gate', async (req: Request, res: Response) => {
  try {
    const { projectId, stageId, decisionNote } = req.body;
    if (!projectId || !stageId) {
      return res.status(400).json({
        error: '缺少必填參數 projectId 或 stageId',
        code: 'SCHEMA_VALIDATION_FAILED',
        status: 400
      });
    }

    const project = await defaultSdlcOrchestrator.getProject(projectId);
    if (!project) {
      return res.status(404).json({
        error: `找不到 ID 為 [${projectId}] 之 SDLC 專案`,
        code: 'NOT_FOUND',
        status: 404
      });
    }
    assertProjectTenantOwnership(req, project);
    const context = getApprovalContext(req);
    const targetStage = stageId as SdlcStageId;
    logSandboxGateAudit(context, projectId, targetStage, 'GATE_REQUESTED', { decisionNote: decisionNote || '' });

    let updatedProject: SdlcProjectState;
    try {
      updatedProject = await defaultSdlcOrchestrator.advanceGate(
        projectId,
        targetStage,
        context,
        decisionNote
      );
    } catch (err) {
      logSandboxGateAudit(context, projectId, targetStage, 'GATE_REJECTED', {
        reason: err instanceof AppError ? err.code : 'INTERNAL_ERROR'
      });
      throw err;
    }

    res.json({ success: true, project: updatedProject });
  } catch (err) {
    handleRouteError(err, res);
  }
});

// 4. 觸發持續反饋回流迭代 (POST /feedback-loop)
sdlcRouter.post('/feedback-loop', async (req: Request, res: Response) => {
  try {
    const { projectId, fromStage, targetStage, reason, suggestedAdjustments } = req.body;
    if (!projectId || !fromStage || !targetStage) {
      return res.status(400).json({
        error: '缺少必填參數 projectId, fromStage 或 targetStage',
        code: 'SCHEMA_VALIDATION_FAILED',
        status: 400
      });
    }

    const project = await defaultSdlcOrchestrator.getProject(projectId);
    if (!project) {
      return res.status(404).json({
        error: `找不到 ID 為 [${projectId}] 之 SDLC 專案`,
        code: 'NOT_FOUND',
        status: 404
      });
    }
    assertProjectTenantOwnership(req, project);

    const context = getApprovalContext(req);
    const result = await defaultSdlcOrchestrator.triggerFeedbackLoop(
      projectId,
      fromStage as SdlcStageId,
      targetStage as SdlcStageId,
      reason || '',
      suggestedAdjustments || '',
      context
    );

    res.json({
      success: true,
      project: result.project,
      feedbackArtifact: result.feedbackArtifact
    });
  } catch (err) {
    handleRouteError(err, res);
  }
});
