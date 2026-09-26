import type { EvidenceRow, IssueRow, PrecedentItem } from '../types';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null ? value as UnknownRecord : {};
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function issueStrength(value: unknown): IssueRow['legalStrength'] {
  return value === 'MEDIUM' || value === 'NEED_SUPPLEMENT' || value === 'HIGH' ? value : 'HIGH';
}

export function mapSuggestedIssues(value: unknown): IssueRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const record = asRecord(item);
    return {
      id: String(index + 1),
      issueType: text(record.issueType, '事實認定瑕疵'),
      title: text(record.title, `爭點${index + 1}`),
      originalHolding: text(record.originalHolding),
      appealArgument: text(record.appealArgument),
      relatedEvidenceCodes: text(record.relatedEvidenceCodes, String(index + 1)),
      legalBasis: text(record.legalBasis),
      legalStrength: issueStrength(record.legalStrength)
    };
  });
}

export function mapSuggestedEvidences(value: unknown): EvidenceRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const record = asRecord(item);
    const investigationItem = text(record.investigationItem, text(record.method, '訊問證人 / 函調資料'));
    const investigationTarget = text(record.investigationTarget, text(record.target, '證人 / 權責單位'));
    const targetAddress = text(record.targetAddress, text(record.holder, '詳卷內住址 / 卷備地址'));
    return {
      id: String(index + 1),
      code: text(record.index, text(record.code, String(index + 1))),
      relatedIssue: text(record.relatedIssue, text(record.relatedIssueTitle, `爭點${index + 1}`)),
      investigationItem,
      investigationTarget,
      targetAddress,
      provenFact: text(record.provenFact, '證明本案關鍵事實'),
      type: text(record.type, '書證'),
      target: investigationTarget,
      method: investigationItem,
      holder: targetAddress
    };
  });
}

export function mapSuggestedPrecedents(value: unknown, timestamp = Date.now()): PrecedentItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const record = asRecord(item);
    return {
      id: `p_auto_${timestamp}_${index}`,
      type: text(record.type, '權威實務'),
      citation: text(record.citation),
      summary: text(record.summary),
      applicationReason: text(record.applicationReason),
      selected: true
    };
  });
}

export function mapRecommendedKeywords(value: unknown): string {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string').join(' ');
  return text(value);
}

export function parseAppealCaseNumber(value: unknown): { year: string; word: string; number: string } | null {
  const caseNumber = text(value);
  const match = caseNumber.match(/(\d+)年度?([^\d]+?)字?第?(\d+)號/);
  return match ? { year: match[1], word: match[2], number: match[3] } : null;
}
