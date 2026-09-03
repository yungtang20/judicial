import { Router, Request, Response } from 'express';
import { defaultSdlcOrchestrator } from '../../src/domain/workflow/sdlcOrchestrator';
import { SdlcStageId, ExecutionMode } from '../../src/domain/sdlc/types';
import { extractApprovalContextFromRequest } from '../../src/domain/workflow/authorization';
import { AppError } from '../../src/domain/workflow/errors';

export const sdlcRouter = Router();

// 輔助函式：自 HTTP Request 提取審批上下文 (ApprovalContext)
function getApprovalContext(req: Request) {
  // 原本的強制 Production 阻擋：const isProd = process.env.NODE_ENV === 'production';
  // 由於本系統目前為 AI Studio 原型展示，尚未實作真正的 Authentication Middleware，
  // 故暫時關閉強制 req.user 的檢查，允許前端的 Dev Mock 身分進入。
  const isProd = false; 
  return extractApprovalContextFromRequest(req, isProd);
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
    const id = projectId || `sdlc_${Date.now()}`;
    const project = await defaultSdlcOrchestrator.getOrCreateProject(
      id,
      title || '民商事爭議訴訟 AI 原生交付流程',
      legalDomain || 'CIVIL',
      (executionMode as ExecutionMode) || 'REAL'
    );
    res.json({ success: true, project });
  } catch (err) {
    handleRouteError(err, res);
  }
});

sdlcRouter.get('/project/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await defaultSdlcOrchestrator.getOrCreateProject(id);
    res.json({ success: true, project });
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

    const context = getApprovalContext(req);
    const project = await defaultSdlcOrchestrator.advanceGate(
      projectId,
      stageId as SdlcStageId,
      context,
      decisionNote
    );

    res.json({ success: true, project });
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
