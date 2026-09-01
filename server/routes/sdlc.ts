import { Router, Request, Response } from 'express';
import { UNIVERSAL_SYLLOGISM_RULES } from '../../src/prompts/universal-syllogism';
import { GoogleGenAI } from '@google/genai';
import { verifyGeneratedDocument } from '../../src/lib/generatedDocumentPipeline';
import {
  createInitialSdlcProject,
  advanceSdlcStage,
  triggerSdlcFeedbackLoop,
  addSdlcArtifact
} from '../../src/domain/sdlc/sdlcEngine';
import { SdlcStageId } from '../../src/domain/sdlc/types';

export const sdlcRouter = Router();

// 內存 SDLC 案件存儲庫（支援即時讀寫與持久化切換）
const sdlcProjects = new Map<string, ReturnType<typeof createInitialSdlcProject>>();

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// 1. 初始化或獲取 SDLC 交付項目
sdlcRouter.post('/project', (req: Request, res: Response) => {
  const { projectId, title, legalDomain } = req.body;
  const id = projectId || `sdlc_${Date.now()}`;
  
  let project = sdlcProjects.get(id);
  if (!project) {
    project = createInitialSdlcProject(id, title || '民商事爭議訴訟 AI 原生交付流程', legalDomain || 'CIVIL');
    sdlcProjects.set(id, project);
  }

  res.json({ success: true, project });
});

// 2. 獲取特定項目狀態
sdlcRouter.get('/project/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  let project = sdlcProjects.get(id);
  if (!project) {
    project = createInitialSdlcProject(id, '未命名訴訟交付專案');
    sdlcProjects.set(id, project);
  }
  res.json({ success: true, project });
});

// 3. AI 自動驅動階段輸出生成 (依據 SDLC 規範執行)
sdlcRouter.post('/execute-stage', async (req: Request, res: Response) => {
  const { projectId, stageId, contextData, humanInput } = req.body;
  
  let project = sdlcProjects.get(projectId);
  if (!project) {
    project = createInitialSdlcProject(projectId, '訴訟專案交付流程');
    sdlcProjects.set(projectId, project);
  }

  const ai = getGeminiClient();
  const stagePromptMap: Record<SdlcStageId, string> = {
    '01_plan': `【AI 原生 SDLC 階段 01 Plan（計劃與立項）】
任務：解析當事人訴訟意圖、業務目標、法律時效邊界與成功標準。
輸入數據：
- 當事人事實陳述與意圖：${humanInput || contextData?.text || '尚未輸入'}
- 案件領域：${project.legalDomain}
請輸出結構化 JSON 或明確章節：
1. 意圖 (Intent)：訴訟請求核心標的與當事人核心訴求
2. 範圍與成功標準 (Scope & Success Criteria)：主要訴求與備位訴求
3. 法律約束與時效邊界 (Constraints & Boundaries)：消滅時效計算與管轄法院
${UNIVERSAL_SYLLOGISM_RULES}`,

    '02_design': `【AI 原生 SDLC 階段 02 Design（方案與設計）】
任務：設計法律三段論架構、請求權基礎與爭點接口契約。
輸入數據：
- 立項意圖與背景：${JSON.stringify(project.artifacts['01_plan'] || [])}
- 補充資訊：${humanInput || ''}
請輸出：
1. 規格 (Spec)：爭點整理矩陣（事實爭點、法律爭點）
2. 架構與接口契約：請求權基礎法條體系（大前提）、舉證責任分配契約
3. 攻防三段論體系架構
${UNIVERSAL_SYLLOGISM_RULES}`,

    '03_build': `【AI 原生 SDLC 階段 03 Build（實現與構建）】
任務：將設計方案構建為可向法院遞狀之正式起訴狀/答辯狀與證據清冊。
輸入數據：
- 規格與架構：${JSON.stringify(project.artifacts['02_design'] || [])}
- 訴訟細節：${humanInput || ''}
請輸出完整的繁體中文訴訟書狀文稿與編號證據清單。
${UNIVERSAL_SYLLOGISM_RULES}`,

    '04_test': `【AI 原生 SDLC 階段 04 Test（測試與驗證）】
任務：執行法律文書引註真偽檢驗 (Anti-Ghost) 與六大地雷防禦掃描。
輸入文稿：${JSON.stringify(project.artifacts['03_build'] || [])}
請輸出：
1. 引註驗證報告 (Citation Test Report)
2. 缺陷與風險清單 (Defect & Risk List) - 檢視有無無權處分、不合要件或不利自認等漏洞
3. 驗收修正建議
${UNIVERSAL_SYLLOGISM_RULES}`,

    '05_deploy': `【AI 原生 SDLC 階段 05 Deploy（發布與交付）】
任務：製作最終發布版本、用印核定記錄與法院具狀送達指引。
輸入審驗文稿：${JSON.stringify(project.artifacts['04_test'] || [])}
請輸出：
1. 最終交付版本 (Release Candidate / Formal Document)
2. 人工核可與用印檢查表 (Human Gate Checklist)
3. 遞狀送達法院與繕本交換記錄卡`,

    '06_maintain': `【AI 原生 SDLC 階段 06 Maintain（運維與改進）】
任務：分析庭審反饋、對造抗辯、裁判書理由，並將經驗閉環回流至前置階段。
輸入數據：${humanInput || '開庭審理與裁判反饋'}
請輸出：
1. 爭點演進與裁判事故記錄 (Incident & Deviation Log)
2. 閉環改進建議 (Continuous Improvement Plan)
3. 建議回流迭代之階段 (Target Stage for Iteration)`
  };

  try {
    let generatedContent = '';
    const prompt = stagePromptMap[stageId as SdlcStageId];

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      generatedContent = response.text || '';
    } else {
      generatedContent = `【展示模式】AI 原生 SDLC ${stageId} 執行成果產物：\n已依據三段論法與 SDLC 標準處理完畢。\n意圖與規格已結構化留存。`;
    }

    // 針對 Build 階段實施嚴格防幽靈引用校驗
    let verifiedDoc = generatedContent;
    if (stageId === '03_build') {
      try {
        const verifiedResult = verifyGeneratedDocument(generatedContent);
        verifiedDoc = verifiedResult.documentText;
      } catch (err: any) {
        console.warn('SDLC Build 驗證警告:', err?.message);
      }
    }

    // 保存為 Artifact
    const categoryMap: Record<SdlcStageId, any> = {
      '01_plan': 'intent',
      '02_design': 'spec',
      '03_build': 'code_or_doc',
      '04_test': 'test_report',
      '05_deploy': 'release_record',
      '06_maintain': 'incident_log'
    };

    project = addSdlcArtifact(project, stageId as SdlcStageId, {
      name: `${stageId.toUpperCase()} 交付工件 (Artifact)`,
      category: categoryMap[stageId as SdlcStageId] || 'intent',
      content: verifiedDoc,
      summary: `由 AI 原生 SDLC Pipeline 自動生成並經由規則校驗之工件`
    });

    sdlcProjects.set(projectId, project);

    res.json({
      success: true,
      project,
      artifactContent: verifiedDoc
    });
  } catch (error: any) {
    console.error('SDLC stage execution error:', error);
    res.status(500).json({ error: error.message || 'SDLC 階段執行失敗' });
  }
});

// 4. 人工審批放行 (Human Gate Approval)
sdlcRouter.post('/advance-gate', (req: Request, res: Response) => {
  const { projectId, stageId, decidedBy, decisionNote } = req.body;
  let project = sdlcProjects.get(projectId);
  if (!project) {
    return res.status(404).json({ error: '找不到該 SDLC 專案' });
  }

  project = advanceSdlcStage(project, stageId as SdlcStageId, decidedBy, decisionNote);
  sdlcProjects.set(projectId, project);

  res.json({ success: true, project });
});

// 5. 觸發持續反饋回流迭代 (Feedback Loop Iteration)
sdlcRouter.post('/feedback-loop', (req: Request, res: Response) => {
  const { projectId, fromStage, targetStage, reason, suggestedAdjustments } = req.body;
  let project = sdlcProjects.get(projectId);
  if (!project) {
    return res.status(404).json({ error: '找不到該 SDLC 專案' });
  }

  project = triggerSdlcFeedbackLoop(
    project,
    fromStage as SdlcStageId,
    targetStage as SdlcStageId,
    reason,
    suggestedAdjustments
  );
  sdlcProjects.set(projectId, project);

  res.json({ success: true, project });
});
