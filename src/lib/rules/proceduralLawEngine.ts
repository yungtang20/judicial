export type ProceduralCaseType = 'CIVIL' | 'CRIMINAL' | 'ADMINISTRATIVE' | 'FAMILY' | 'OTHER';

export interface ProceduralRequirement {
  id: string;
  label: string;
  legalBasis: string;
  required: boolean;
}

export interface DeadlineCheck {
  dueDate?: string;
  daysRemaining?: number;
  overdue: boolean;
  status: 'KNOWN' | 'UNKNOWN';
}

export interface ProceduralAssessment {
  caseType: ProceduralCaseType;
  requirements: ProceduralRequirement[];
  deadline: DeadlineCheck;
  jurisdictionHint: string;
  warnings: string[];
}

const REQUIREMENTS: Record<ProceduralCaseType, ProceduralRequirement[]> = {
  CIVIL: [
    { id: 'PARTIES', label: '當事人與住所／居所', legalBasis: '民事訴訟法第244條', required: true },
    { id: 'CLAIM_AND_FACTS', label: '訴訟標的、原因事實及聲明', legalBasis: '民事訴訟法第244條', required: true },
    { id: 'EVIDENCE', label: '證據與附件清單', legalBasis: '既有書狀規則檔案', required: true }
  ],
  CRIMINAL: [
    { id: 'CRIMINAL_FACTS', label: '犯罪事實、時間、地點與證據', legalBasis: '刑事訴訟法相關書狀規範', required: true },
    { id: 'COMPLAINT_PERIOD', label: '告訴期間需人工確認', legalBasis: '刑事訴訟法第237條', required: false }
  ],
  ADMINISTRATIVE: [
    { id: 'ADMIN_ACTION', label: '行政處分及救濟標的', legalBasis: '行政訴訟法第57條', required: true },
    { id: 'ADMIN_PERIOD', label: '訴願／起訴期間需人工確認', legalBasis: '行政訴訟法相關規定', required: false }
  ],
  FAMILY: [
    { id: 'PARTIES', label: '當事人與身分關係', legalBasis: '家事事件程序規範', required: true },
    { id: 'CHILD_OR_SAFETY_FACTS', label: '子女或安全相關事實與證據', legalBasis: '家事事件程序規範', required: false }
  ],
  OTHER: [{ id: 'FACTS_AND_EVIDENCE', label: '事實與證據', legalBasis: '需依案件類型確認', required: true }]
};

export function assessProceduralRequirements(caseType: ProceduralCaseType, receivedDate?: string, periodDays?: number): ProceduralAssessment {
  const warnings: string[] = [];
  let deadline: DeadlineCheck = { overdue: false, status: 'UNKNOWN' };
  if (receivedDate && Number.isFinite(periodDays) && periodDays !== undefined) {
    const start = new Date(receivedDate);
    const due = new Date(start);
    due.setDate(due.getDate() + periodDays);
    const now = new Date();
    const daysRemaining = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
    deadline = { dueDate: due.toISOString().slice(0, 10), daysRemaining, overdue: daysRemaining < 0, status: 'KNOWN' };
    if (deadline.overdue) warnings.push('期限計算結果顯示可能逾期，請立即由專業人士確認起算日、送達日與假日規則。');
  } else {
    warnings.push('未提供完整收受／送達日期或期間，期限狀態維持 UNKNOWN。');
  }
  return { caseType, requirements: REQUIREMENTS[caseType], deadline, jurisdictionHint: '管轄法院須依當事人住所、義務履行地與事件特別規定人工確認。', warnings };
}
