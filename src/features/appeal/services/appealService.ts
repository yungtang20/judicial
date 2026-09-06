import { parsePdfFile } from "../../../lib/pdfUtils";
import { scrubPersonalInfo } from "../../../lib/deidentifier";
import { IssueRow, EvidenceRow, PrecedentItem } from "../types";

export interface AppealAnalysisParams {
  rawText: string;
  secondText?: string;
  isDualMode?: boolean;
  userAppealedIssues?: string;
  userNewEvidences?: string;
  userSpecificClaims?: string;
  issueRows?: IssueRow[];
  evidenceRows?: EvidenceRow[];
  precedents?: PrecedentItem[];
}

export class AppealService {
  /**
   * PDF 檔案解析（取得純文字與內嵌圖片）
   */
  public static async parsePdf(file: File): Promise<{ text: string; images: string[] }> {
    return await parsePdfFile(file);
  }

  /**
   * 個資預先遮蔽
   */
  public static anonymizeText(text: string): string {
    return scrubPersonalInfo(text);
  }

  /**
   * 發起判決分析 API 呼叫
   */
  public static async analyzeJudgment(judgmentText: string, courtName?: string) {
    const res = await fetch('/api/analyze-judgment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ judgmentText, targetCourt: courtName })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || '判決分析失敗');
    }
    return await res.json();
  }

  /**
   * 發起上訴理由書產製 API 呼叫
   */
  public static async generatePetition(params: Record<string, unknown>) {
    const res = await fetch('/api/generate-appeal-petition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || '上訴理由書生成失敗');
    }
    return await res.json();
  }
}
