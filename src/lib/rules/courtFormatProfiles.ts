export interface CourtFormatProfile {
  id: string;
  paper: 'A4';
  requiredSections: string[];
  disclaimerRequired: boolean;
}

export const COURT_FORMAT_PROFILES: Record<string, CourtFormatProfile> = {
  CIVIL: { id: 'CIVIL', paper: 'A4', requiredSections: ['當事人', '訴之聲明', '事實及理由', '證據'], disclaimerRequired: true },
  CRIMINAL: { id: 'CRIMINAL', paper: 'A4', requiredSections: ['告訴人或被告', '犯罪事實', '證據'], disclaimerRequired: true },
  ADMINISTRATIVE: { id: 'ADMINISTRATIVE', paper: 'A4', requiredSections: ['當事人', '聲明', '事實及理由'], disclaimerRequired: true }
};

export function verifyCourtFormat(text: string, caseType: string): { passed: boolean; missingSections: string[]; disclaimerPresent: boolean } {
  const profile = COURT_FORMAT_PROFILES[caseType] || COURT_FORMAT_PROFILES.CIVIL;
  const missingSections = profile.requiredSections.filter(section => !text.includes(section));
  const disclaimerPresent = text.includes('非正式法律意見') || text.includes('法律資訊與草稿輔助');
  return { passed: missingSections.length === 0 && (!profile.disclaimerRequired || disclaimerPresent), missingSections, disclaimerPresent };
}
