import type { CaseType, ComplianceFinding, FormatProfile } from '../../types/compliance';
import { FORMAT_PROFILES } from '../rules/civilPleadingRuleProfile';

function profileSignature(profile: FormatProfile): unknown[] {
  return [
    profile.caseType,
    profile.formatRuleSource,
    profile.formatConfirmed,
    profile.paperSize,
    profile.writingDirection,
    profile.marginsCm?.top ?? null,
    profile.marginsCm?.bottom ?? null,
    profile.marginsCm?.left ?? null,
    profile.marginsCm?.right ?? null,
    profile.fontSizePt?.min ?? null,
    profile.fontSizePt?.max ?? null,
    profile.lineSpacingPt?.mode ?? null,
    profile.lineSpacingPt?.min ?? null,
    profile.lineSpacingPt?.max ?? null,
    profile.pageNumbering,
    profile.tocThresholdPages ?? null,
    profile.doubleSidedPrint
  ];
}

export function verifyGenerationTemplate(
  caseType: CaseType,
  appliedProfile: FormatProfile
): ComplianceFinding {
  const expected = FORMAT_PROFILES[caseType];
  if (!expected.formatConfirmed || !appliedProfile.formatConfirmed) {
    return {
      ruleId: `FORMAT_PROFILE.${caseType}`,
      status: 'UNVERIFIED',
      note: '格式範本尚未確認。'
    };
  }
  const matches = JSON.stringify(profileSignature(appliedProfile)) === JSON.stringify(profileSignature(expected));
  return {
    ruleId: `FORMAT_PROFILE.${caseType}`,
    status: matches ? 'COMPLIANT' : 'CONFLICT',
    evidenceLocation: `formatProfile.${appliedProfile.caseType}`,
    note: matches ? '自行生成流程使用核准的 FormatProfile。' : '套用的 FormatProfile 與案件類型不符。'
  };
}
