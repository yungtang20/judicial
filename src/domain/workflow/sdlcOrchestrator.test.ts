import { describe, expect, it } from 'vitest';
import { SdlcOrchestrator } from './sdlcOrchestrator';
import { MemorySdlcProjectRepository } from './repository';
import { AIProvider, AIProviderResponse } from '../../ai/providers/AIProvider';
import { ApprovalContext } from './authorization';
import { AppError } from './errors';
import { AuditLogRepository } from './auditEvent';

class MockAIProvider implements AIProvider {
  public name = 'MockAIProvider';
  public responseText = '按民法第184條第1項前段規定，侵權行為損害賠償請求權成立要件完備，本件事實清楚無疑。';

  async generate(): Promise<AIProviderResponse> {
    return { text: this.responseText };
  }
  async generateStructured<T = any>(): Promise<T> {
    return {} as T;
  }
  async healthCheck() {
    return { ok: true, message: 'Mock ready', model: 'mock-model' };
  }
}

describe('SdlcOrchestrator Lifecycle & Governance Integration', () => {
  const repo = new MemorySdlcProjectRepository();
  const mockAi = new MockAIProvider();
  const auditLogger = new AuditLogRepository();
  const orchestrator = new SdlcOrchestrator(repo, mockAi, auditLogger);

  const lawyerContext: ApprovalContext = {
    actorId: 'attorney_001',
    actorType: 'HUMAN',
    role: 'APPROVER',
    name: '張律師',
    source: 'INTEGRATION_TEST',
    timestamp: new Date().toISOString()
  };

  const aiContext: ApprovalContext = {
    actorId: 'gemini_agent_002',
    actorType: 'AI',
    role: 'GENERATOR',
    name: 'Gemini Auto Agent',
    source: 'INTEGRATION_TEST',
    timestamp: new Date().toISOString()
  };

  it('runs complete 6-stage lifecycle sequentially with deterministic gates and audit events', async () => {
    const projectId = 'proj_lifecycle_test';

    // 01 Plan
    await orchestrator.executeStage(projectId, '01_plan', '確認委託人請求返還借款100萬', lawyerContext);
    let project = await orchestrator.advanceGate(projectId, '01_plan', lawyerContext, '核定立項意圖');
    expect(project.currentStageId).toBe('02_design');
    expect(project.gates['01_plan'].passed).toBe(true);

    // 02 Design
    await orchestrator.executeStage(projectId, '02_design', '民法第474條消費借貸爭點契約', lawyerContext);
    project = await orchestrator.advanceGate(projectId, '02_design', lawyerContext, '核定三段論架構');
    expect(project.currentStageId).toBe('03_build');

    // 03 Build
    await orchestrator.executeStage(projectId, '03_build', '編撰起訴狀與甲證一號借據', lawyerContext);
    project = await orchestrator.advanceGate(projectId, '03_build', lawyerContext, '文稿核實無誤');
    expect(project.currentStageId).toBe('04_test');

    // 04 Test
    await orchestrator.executeStage(projectId, '04_test', '防幽靈引註掃描', lawyerContext);
    project = await orchestrator.advanceGate(projectId, '04_test', lawyerContext, '測試通過');
    expect(project.currentStageId).toBe('05_deploy');

    // 05 Deploy (需 DEPLOYER 權限)
    const deployerContext: ApprovalContext = { ...lawyerContext, role: 'DEPLOYER' };
    await orchestrator.executeStage(projectId, '05_deploy', '產出定版狀紙與印鑑核定卡', deployerContext);
    project = await orchestrator.advanceGate(projectId, '05_deploy', deployerContext, '律師用印送達法院');
    expect(project.currentStageId).toBe('06_maintain');

    // 驗證 Audit Log 完整留存
    const events = auditLogger.getByWorkflow(projectId);
    expect(events.length).toBeGreaterThan(10);
    expect(events.some(e => e.eventType === 'GATE_APPROVED')).toBe(true);
    expect(events.some(e => e.eventType === 'ARTIFACT_CREATED')).toBe(true);
  });

  it('blocks Gate advance if required artifact is missing (Fail Closed)', async () => {
    const projectId = 'proj_missing_art_test';
    await orchestrator.getOrCreateProject(projectId);

    // 尚未 executeStage 產生工件，直接嘗試 advanceGate
    await expect(
      orchestrator.advanceGate(projectId, '01_plan', lawyerContext)
    ).rejects.toThrowError(/尚未產出任何必要工件/);
  });

  it('blocks Gate advance if required validator is missing (Fail Closed)', async () => {
    const projectId = 'proj_missing_val_test';
    const proj = await orchestrator.getOrCreateProject(projectId);
    proj.stageStatuses['01_plan'] = 'in_progress';
    
    // 手工塞一個沒有完整驗證器的工件
    proj.artifacts['01_plan'] = [
      {
        id: 'art-001',
        stageId: '01_plan',
        version: 1,
        name: 'test',
        category: 'intent',
        content: 'test',
        executionMode: 'REAL',
        summary: 'test',
        metadata: {
          verification: {
            status: 'PASS',
            checks: [
              { name: 'SchemaValidator', category: 'SCHEMA', status: 'PASS' }
            ],
            errors: [],
            warnings: [],
            verifiedAt: new Date().toISOString(),
            verifierVersion: '1.0'
          }
        },
        createdAt: new Date().toISOString()
      }
    ];
    await repo.save(proj);

    await expect(
      orchestrator.advanceGate(projectId, '01_plan', lawyerContext)
    ).rejects.toThrowError(/契約要求之驗證器未全數通過/);
  });

  it('blocks Production Deploy Gate if execution mode is FALLBACK', async () => {
    const projectId = 'proj_fallback_deploy_test';
    const proj = await orchestrator.getOrCreateProject(projectId);
    proj.stageStatuses['05_deploy'] = 'in_progress';
    
    proj.artifacts['05_deploy'] = [
      {
        id: 'art-002',
        stageId: '05_deploy',
        version: 1,
        name: 'test',
        category: 'release_record',
        content: 'test',
        executionMode: 'FALLBACK',
        summary: 'test',
        metadata: {
          verification: {
            status: 'PASS',
            checks: [
              { name: 'PrivacyValidator', category: 'PRIVACY', status: 'PASS' },
              { name: 'SecurityValidator', category: 'SECURITY', status: 'PASS' },
              { name: 'CitationValidator', category: 'CITATION', status: 'PASS' }
            ],
            errors: [],
            warnings: [],
            verifiedAt: new Date().toISOString(),
            verifierVersion: '1.0'
          }
        },
        createdAt: new Date().toISOString()
      }
    ];
    await repo.save(proj);

    await expect(
      orchestrator.advanceGate(projectId, '05_deploy', { ...lawyerContext, role: 'DEPLOYER' })
    ).rejects.toThrowError(/正式上線交付 \(Deploy\) 嚴禁使用模擬或離線備援工件/);
  });

  it('blocks AI from approving human gate', async () => {
    const projectId = 'proj_ai_gate_test';
    await orchestrator.executeStage(projectId, '01_plan', '立項事實', lawyerContext);

    await expect(
      orchestrator.advanceGate(projectId, '01_plan', aiContext)
    ).rejects.toThrowError(/必須由人類審查員/);
  });

  it('blocks Gate advance if artifact verification failed (Fail Closed)', async () => {
    const badAi = new MockAIProvider();
    badAi.responseText = '當事人身分證字號 A123456789，無權處分直接有效。'; // 觸發 Privacy 與 Legal 驗證 FAIL

    const failOrchestrator = new SdlcOrchestrator(repo, badAi, auditLogger);
    const projectId = 'proj_verify_fail_test';

    await failOrchestrator.executeStage(projectId, '01_plan', '有問題的輸入', lawyerContext);

    await expect(
      failOrchestrator.advanceGate(projectId, '01_plan', lawyerContext)
    ).rejects.toThrowError(/最新工件未通過驗證檢核/);
  });

  it('ensures REAL AI failure sets Verification FAIL and prevents advance', async () => {
    class FailingAI implements AIProvider {
      public name = 'FailingAI';
      async generate(): Promise<AIProviderResponse> { throw new Error('Network Error'); }
      async generateStructured<T>() { return {} as T; }
      async healthCheck() { return { ok: false, message: 'down', model: 'fail-model' }; }
    }
    
    const failOrchestrator = new SdlcOrchestrator(repo, new FailingAI(), auditLogger);
    const projectId = 'proj_real_fail_test';
    
    const result = await failOrchestrator.executeStage(projectId, '01_plan', '測試輸入', lawyerContext);
    
    expect(result.artifact.executionMode).toBe('FALLBACK');
    expect(result.executionResult.verificationResult.status).toBe('FAIL');
    
    await expect(
      failOrchestrator.advanceGate(projectId, '01_plan', lawyerContext)
    ).rejects.toThrowError(/最新工件未通過驗證檢核/);
  });
});
