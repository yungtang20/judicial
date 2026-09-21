export interface StrategyIssue {
  issue: string;
  facts?: string[];
  evidence?: string[];
}

export interface StrategyFinding {
  issue: string;
  burdenOfProof: '待確認' | '提出主張者原則負擔';
  evidenceGaps: string[];
  warnings: string[];
}

export function assessProceduralStrategy(issues: StrategyIssue[]): StrategyFinding[] {
  return issues.map(issue => ({
    issue: issue.issue,
    burdenOfProof: issue.evidence?.length ? '待確認' : '提出主張者原則負擔',
    evidenceGaps: issue.evidence?.length ? [] : ['請具體列出文件、證人、原始檔案或可調取紀錄'],
    warnings: ['本結果是證據整理提示，不等於法院對舉證責任或證據能力的最終判斷。']
  }));
}
