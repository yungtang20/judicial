/**
 * Stage Executors Pattern
 * 統一管理各階段之執行、Prompt 裝配、AIProvider 呼叫與驗證管線
 */

import { AIProvider } from '../../ai/providers/AIProvider';
import { SdlcStageId, ExecutionMode, SdlcArtifact } from '../sdlc/types';
import { UNIVERSAL_SYLLOGISM_RULES } from '../../prompts/universal-syllogism';
import { ValidatorPipeline, VerificationResult } from './verification';

export interface StageExecutionResult {
  stageId: SdlcStageId;
  artifactContent: string;
  verificationResult: VerificationResult;
  artifactCategory: SdlcArtifact['category'];
  executionMode: ExecutionMode;
  summary: string;
}

export abstract class BaseStageExecutor {
  protected validatorPipeline = new ValidatorPipeline();

  abstract get stageId(): SdlcStageId;
  abstract get category(): SdlcArtifact['category'];
  abstract buildPrompt(input: string, context: Record<string, any>): string;

  public async execute(
    input: string,
    context: Record<string, any>,
    aiProvider: AIProvider,
    executionMode: ExecutionMode = 'REAL'
  ): Promise<StageExecutionResult> {
    const prompt = this.buildPrompt(input, context);
    let outputText = '';

    if (executionMode === 'REAL') {
      try {
        const aiRes = await aiProvider.generate(prompt);
        outputText = aiRes.text;
      } catch (err: any) {
        // REAL 模式下 AI 執行失敗：一律 Fail-Closed，不可偽裝為 REAL 成功或任意放行
        outputText = `【AI 執行失敗 / AI_EXECUTION_FAILED】階段 [${this.stageId}] 調用模型異常：${err.message}`;
        const failVerificationResult: VerificationResult = {
          status: 'FAIL',
          checks: [
            {
              name: 'AIExecutionValidator',
              category: 'SECURITY',
              status: 'FAIL',
              message: `AI Provider 呼叫失敗 (AI_EXECUTION_FAILED): ${err.message}`
            }
          ],
          errors: [`[SECURITY] AI Provider 呼叫失敗: ${err.message}`],
          warnings: [],
          verifiedAt: new Date().toISOString(),
          verifierVersion: 'v2.0-deterministic-fail-closed'
        };

        return {
          stageId: this.stageId,
          artifactContent: outputText,
          verificationResult: failVerificationResult,
          artifactCategory: this.category,
          executionMode: 'FALLBACK',
          summary: `StageExecutor (${this.stageId}) AI 執行失敗，已阻擋放行。`
        };
      }
    } else {
      outputText = `【${executionMode} 模擬模式】已依據三段論法與 SDLC 規範生成階段 [${this.stageId}] 之工件產物。`;
    }

    // 執行 Validator Pipeline
    const verificationResult = await this.validatorPipeline.runAll(outputText, {
      stageId: this.stageId,
      executionMode
    });

    return {
      stageId: this.stageId,
      artifactContent: outputText,
      verificationResult,
      artifactCategory: this.category,
      executionMode,
      summary: `由 StageExecutor (${this.stageId}) 於 ${executionMode} 模式產出，驗證狀態: ${verificationResult.status}`
    };
  }
}

export class PlanStageExecutor extends BaseStageExecutor {
  get stageId(): SdlcStageId { return '01_plan'; }
  get category(): SdlcArtifact['category'] { return 'intent'; }
  buildPrompt(input: string, context: Record<string, any>): string {
    return `【AI 原生 SDLC 階段 01 Plan（計劃與立項）】
任務：解析當事人訴訟意圖、業務目標、法律時效邊界與成功標準。
當事人事實陳述與意圖：${input || '無額外補充'}
案件領域：${context.legalDomain || 'CIVIL'}
請輸出結構化繁體中文章節：
1. 意圖 (Intent)：訴訟請求核心標的與當事人核心訴求
2. 範圍與成功標準 (Scope & Success Criteria)：主要訴求與備位訴求
3. 法律約束與時效邊界 (Constraints & Boundaries)：消滅時效計算與管轄法院
${UNIVERSAL_SYLLOGISM_RULES}`;
  }
}

export class DesignStageExecutor extends BaseStageExecutor {
  get stageId(): SdlcStageId { return '02_design'; }
  get category(): SdlcArtifact['category'] { return 'spec'; }
  buildPrompt(input: string, context: Record<string, any>): string {
    return `【AI 原生 SDLC 階段 02 Design（方案與設計）】
任務：設計法律三段論架構、請求權基礎與爭點接口契約。
前置立項意圖：${JSON.stringify(context.previousArtifacts || [])}
補充資訊：${input || '無'}
請輸出：
1. 規格 (Spec)：爭點整理矩陣（事實爭點、法律爭點）
2. 架構與接口契約：請求權基礎法條體系（大前提）、舉證責任分配契約
3. 攻防三段論體系架構
${UNIVERSAL_SYLLOGISM_RULES}`;
  }
}

export class BuildStageExecutor extends BaseStageExecutor {
  get stageId(): SdlcStageId { return '03_build'; }
  get category(): SdlcArtifact['category'] { return 'code_or_doc'; }
  buildPrompt(input: string, context: Record<string, any>): string {
    return `【AI 原生 SDLC 階段 03 Build（實現與構建）】
任務：將設計方案構建為可向法院遞狀之正式起訴狀/答辯狀與證據清冊。
設計規格：${JSON.stringify(context.previousArtifacts || [])}
補充細節：${input || '無'}
請輸出完整的繁體中文訴訟書狀文稿與編號證據清單。
${UNIVERSAL_SYLLOGISM_RULES}`;
  }
}

export class TestStageExecutor extends BaseStageExecutor {
  get stageId(): SdlcStageId { return '04_test'; }
  get category(): SdlcArtifact['category'] { return 'test_report'; }
  buildPrompt(input: string, context: Record<string, any>): string {
    return `【AI 原生 SDLC 階段 04 Test（測試與驗證）】
任務：執行法律文書引註真偽檢驗 (Anti-Ghost) 與六大地雷防禦掃描。
輸入待測文稿：${JSON.stringify(context.previousArtifacts || [])}
請輸出：
1. 引註驗證報告 (Citation Test Report)
2. 缺陷與風險清單 (Defect & Risk List) - 檢視有無無權處分、不合要件或不利自認等漏洞
3. 驗收修正建議
${UNIVERSAL_SYLLOGISM_RULES}`;
  }
}

export class DeployStageExecutor extends BaseStageExecutor {
  get stageId(): SdlcStageId { return '05_deploy'; }
  get category(): SdlcArtifact['category'] { return 'release_record'; }
  buildPrompt(input: string, context: Record<string, any>): string {
    return `【AI 原生 SDLC 階段 05 Deploy（發布與交付）】
任務：製作最終發布版本、用印核定記錄與法院具狀送達指引。
審驗後文稿：${JSON.stringify(context.previousArtifacts || [])}
請輸出：
1. 最終交付版本 (Release Candidate / Formal Document)
2. 人工核可與用印檢查表 (Human Gate Checklist)
3. 遞狀送達法院與繕本交換記錄卡`;
  }
}

export class MaintainStageExecutor extends BaseStageExecutor {
  get stageId(): SdlcStageId { return '06_maintain'; }
  get category(): SdlcArtifact['category'] { return 'incident_log'; }
  buildPrompt(input: string, context: Record<string, any>): string {
    return `【AI 原生 SDLC 階段 06 Maintain（運維與改進）】
任務：分析庭審反饋、對造抗辯、裁判書理由，並將經驗閉環回流至前置階段。
庭審或裁判輸入數據：${input || '開庭審理與裁判反饋'}
請輸出：
1. 爭點演進與裁判事故記錄 (Incident & Deviation Log)
2. 閉環改進建議 (Continuous Improvement Plan)
3. 建議回流迭代之階段 (Target Stage for Iteration)`;
  }
}

export const stageExecutorsMap: Record<SdlcStageId, BaseStageExecutor> = {
  '01_plan': new PlanStageExecutor(),
  '02_design': new DesignStageExecutor(),
  '03_build': new BuildStageExecutor(),
  '04_test': new TestStageExecutor(),
  '05_deploy': new DeployStageExecutor(),
  '06_maintain': new MaintainStageExecutor()
};
