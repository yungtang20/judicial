import type { EvidenceRow, IssueRow } from '../types';

export type IssueEditorRow = Omit<IssueRow, 'relatedEvidenceCodes'> & { relatedEvidences: string };
export type EvidenceEditorRow = EvidenceRow;

/** 取出字串值；空白視為缺漏，才讓備援值接手（避免空字串擋掉舊別名的回溯）。 */
function text(value: unknown, fallback = ''): string {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return value;
}

export function normalizeEvidenceRow(value: unknown, index = 0): EvidenceRow {
  const record = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  // 正規欄位為唯一真實來源；舊別名僅供舊資料回溯，正規欄位缺漏時才作為備援。
  const relatedIssue = text(record.relatedIssue, text(record.relatedIssueTitle));
  const investigationItem = text(record.investigationItem, text(record.method));
  const investigationTarget = text(record.investigationTarget, text(record.target));
  const targetAddress = text(record.targetAddress, text(record.holder));
  return {
    id: text(record.id, String(index + 1)),
    code: text(record.code, String(index + 1)),
    relatedIssue,
    investigationItem,
    investigationTarget,
    targetAddress,
    provenFact: text(record.provenFact),
    type: text(record.type) || undefined,
    // 舊別名一律由正規欄位推導，否則每次 round-trip 都會把使用者編輯後的值
    // 覆寫回種子階段的別名快照（target/method/holder/relatedIssueTitle 四者同構）。
    target: investigationTarget || undefined,
    method: investigationItem || undefined,
    holder: targetAddress || undefined,
    necessity: text(record.necessity) || undefined,
    note: text(record.note) || undefined,
    relatedIssueTitle: relatedIssue || undefined
  };
}

/** 附表二（調查證據聲請表）各欄位的顯示值。 */
export interface EvidenceTableCells {
  code: string;
  relatedIssue: string;
  investigationItem: string;
  investigationTarget: string;
  targetAddress: string;
  provenFact: string;
  type: string;
  necessity: string;
  note: string;
}

function cell(value: string | undefined, fallback = '-'): string {
  return value && value.trim() ? value : fallback;
}

/**
 * 附表二欄位解析的唯一來源，複製匯出與列印表格都必須走這裡，
 * 避免兩條輸出路徑各自挑欄位而產生內容不一致。
 */
export function evidenceTableCells(row: EvidenceRow | undefined, index = 0): EvidenceTableCells {
  return {
    code: row?.code || String(index + 1),
    relatedIssue: cell(row?.relatedIssue || row?.relatedIssueTitle),
    investigationItem: cell(row?.investigationItem || row?.method),
    investigationTarget: cell(row?.investigationTarget || row?.target),
    targetAddress: cell(row?.targetAddress || row?.holder),
    provenFact: cell(row?.provenFact),
    type: row?.type || '書證',
    necessity: cell(row?.necessity),
    note: cell(row?.note)
  };
}

const EVIDENCE_TABLE_MARKDOWN_HEADER = '| 聲調編號 | 證據標的與名稱 | 種類 | 待證事實 | 對應爭點 | 保管機關/占有人 | 調查方法 | 聲請調查必要性(民訴286/刑訴163Ⅱ) | 備註 |';

/** 附表二的 Markdown 匯出，欄位值與列印表格共用 evidenceTableCells。 */
export function buildEvidenceTableMarkdown(evidences: readonly (EvidenceRow | undefined)[]): string {
  const rows = evidences.map((row, index) => {
    const cells = evidenceTableCells(row, index);
    return `| ${cells.code} | ${cells.investigationTarget} | ${cells.type} | ${cells.provenFact} | ${cells.relatedIssue} | ${cells.targetAddress} | ${cells.investigationItem} | ${cells.necessity} | ${cells.note} |`;
  });
  return [EVIDENCE_TABLE_MARKDOWN_HEADER, '|---|---|---|---|---|---|---|---|---|', ...rows].join('\n');
}

export function issueRowsFromCase(issues: IssueRow[] | undefined): IssueEditorRow[] {
  return (issues || []).map(issue => ({
    id: issue.id,
    issueType: issue.issueType,
    title: issue.title,
    originalHolding: issue.originalHolding,
    appealArgument: issue.appealArgument,
    relatedEvidences: issue.relatedEvidenceCodes || '',
    legalBasis: issue.legalBasis || '',
    legalStrength: issue.legalStrength || 'NEED_SUPPLEMENT'
  }));
}

export function issueRowsToCase(rows: IssueEditorRow[]): IssueRow[] {
  return rows.map(row => ({
    id: row.id,
    issueType: row.issueType,
    title: row.title,
    originalHolding: row.originalHolding,
    appealArgument: row.appealArgument,
    relatedEvidenceCodes: row.relatedEvidences,
    legalBasis: row.legalBasis,
    legalStrength: row.legalStrength
  }));
}

export function evidenceRowsFromCase(evidences: EvidenceRow[] | undefined): EvidenceEditorRow[] {
  return (evidences || []).map((item, index) => normalizeEvidenceRow(item, index));
}

export function evidenceRowsToCase(rows: EvidenceEditorRow[]): EvidenceRow[] {
  return rows.map((row, index) => normalizeEvidenceRow(row, index));
}
