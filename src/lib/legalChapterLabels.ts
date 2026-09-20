/**
 * 法律罪章、領域與專節之標準中文標籤對照表
 * 杜絕任何英文列舉代碼（如 DOMESTIC_VIOLENCE_PROTECTION）直接洩漏至 UI
 */

export const LEGAL_CHAPTER_MAP: Record<string, string> = {
  DOMESTIC_VIOLENCE_PROTECTION: '家庭暴力防治法（民事保護令與家暴防治專章）',
  DOMESTIC_VIOLENCE_PROTECTION_ORDER: '家庭暴力防治法（民事保護令專章）',
  CRIMINAL_COMPLAINT_SEXUAL_ASSAULT: '刑法妨害性自主罪章',
  CIVIL_PET_DISPUTE: '民法動物占有人責任與侵權行為專節',
  CIVIL_TORT_GENERAL: '民法侵權行為損害賠償專節',
  UNIVERSAL_AI_PLEADING: '民刑事書狀請求權規範專節',
  LABOR_DISPUTE: '勞動基準法與勞資爭議處理法專章',
  RENTAL_DISPUTE: '租賃住宅市場發展及管理條例專章',
  CONSUMER_PROTECTION: '消費者保護法與物之瑕疵擔保專章',
  TRAFFIC_INCIDENT: '道路交通安全規則與過失侵權損害賠償專章',
  DIVORCE_SETTLEMENT: '民法親屬編夫妻財產與離婚專章',
  INHERITANCE_DISPUTE: '民法繼承編遺產分割與特留分專章',
  FRAUD_CRIME: '刑法詐欺背信及洗錢防制罪章',
  DEFAMATION_CRIME: '刑法妨害名譽及信用罪章',
  PUBLIC_HAZARD_CRIME: '刑法公共危險罪章',
  OFFICIAL_DOC_CRIME: '刑法偽造文書印文罪章',
};

/**
 * 將任何罪章代碼或文字格式化為標準繁體中文法律名稱
 */
export function formatLegalChapter(chapter?: string | null): string {
  if (!chapter || !chapter.trim()) {
    return '法律爭議實體法專章';
  }

  const trimmed = chapter.trim();
  if (LEGAL_CHAPTER_MAP[trimmed]) {
    return LEGAL_CHAPTER_MAP[trimmed];
  }

  // 若開頭為常見前綴但未完全命中
  if (trimmed.startsWith('DOMESTIC_VIOLENCE')) {
    return '家庭暴力防治法專章';
  }
  if (trimmed.startsWith('CRIMINAL')) {
    return '刑事法規與特別刑法專章';
  }
  if (trimmed.startsWith('CIVIL')) {
    return '民事法規與實體法專節';
  }
  if (trimmed.startsWith('LABOR')) {
    return '勞動法規專章';
  }

  return trimmed;
}

/**
 * 法律審查狀態代碼繁體中文化
 */
export function formatVerificationStatus(status?: string | null): string {
  if (!status) return '未檢核';
  const map: Record<string, string> = {
    PASS: '可以使用（已完成來源查驗）',
    PASSED: '檢核通過',
    NEEDS_REVIEW: '僅供參考（尚未確認適用）',
    FAIL: '不可使用（引用存在疑義）',
    FAILED: '檢核未通過',
    WARNING: '警示待查',
    BLOCKED: '安全封鎖',
  };
  return map[status] || status;
}
