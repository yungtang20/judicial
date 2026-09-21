export interface FilingGuide {
  courtHint: string;
  feeHint: string;
  copies: string;
  exhibits: string[];
  disclaimer: string;
}

export function buildFilingGuide(input: { court?: string; copyCount?: number; exhibitNames?: string[] }): FilingGuide {
  const exhibitNames = input.exhibitNames || [];
  return {
    courtHint: input.court || '請依當事人住所、義務履行地或事件專屬管轄規定確認法院。',
    feeHint: '裁判費／程序費用須依案件類型與訴訟標的重新試算；不可僅以本提示估算。',
    copies: `至少準備法院份及對造繕本；實際份數依對造人數與法院通知為準（目前輸入：${input.copyCount || '未提供'}）。`,
    exhibits: exhibitNames.map((name, index) => `證物${index + 1}：${name}`),
    disclaimer: '本指引為法律資訊與草稿輔助，非正式法律意見；送件前請向法院或律師確認。'
  };
}
