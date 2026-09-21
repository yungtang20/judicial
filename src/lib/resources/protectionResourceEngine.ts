export interface ProtectionResource {
  id: string;
  name: string;
  contact: string;
  note: string;
}

export const PROTECTION_RESOURCES: ProtectionResource[] = [
  { id: 'POLICE_110', name: '警察報案／即時危險', contact: '110', note: '有人身立即危險時優先求助。' },
  { id: 'DOMESTIC_VIOLENCE_113', name: '家庭暴力及性侵害保護專線', contact: '113', note: '可詢問保護、安置與通報資源。' },
  { id: 'LIFELINE_1925', name: '安心專線', contact: '1925', note: '情緒危機時可尋求支持；緊急危險仍請先聯絡110。' }
];

const HIGH_RISK_TERMS = ['家暴', '家庭暴力', '性侵', '性騷', '跟蹤', '恐嚇', '要殺', '自殺', '立即危險'];

export function detectHighRiskCase(narrative: string): boolean {
  return HIGH_RISK_TERMS.some(term => narrative.includes(term));
}

export function getProtectionResources(narrative: string): ProtectionResource[] {
  return detectHighRiskCase(narrative) ? [...PROTECTION_RESOURCES] : [];
}

export function buildAntiFraudWarning(narrative: string): string | undefined {
  const hasContact = /電話|LINE|加好友|私訊/.test(narrative);
  const requestsAction = /匯款|付款|提供帳戶|主動聯繫|點擊連結/.test(narrative);
  return hasContact && requestsAction ? '請先透過官方電話或正式管道查證身分，不要依通知內容匯款、提供帳戶或點擊不明連結。' : undefined;
}

export function redactPII(text: string): string {
  return text
    .replace(/[A-Z]\d{8,10}/gi, '個資代號')
    .replace(/\b\d{10}\b/g, '個資代號')
    .replace(/\b09\d{8}\b/g, '聯絡方式代號')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '電子郵件代號');
}
