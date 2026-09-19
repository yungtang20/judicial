export interface ToolFieldSchema {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'select';
  options?: Array<{ label: string; value: string }>;
  rows?: number;
  showAiSuggest?: boolean;
}

const COMMON_FIELDS: ToolFieldSchema[] = [
  { key: 'incidentDetails', label: '事實經過與主要爭點', type: 'textarea', rows: 6, showAiSuggest: true },
  { key: 'complainantName', label: '聲請人／原告／告訴人姓名', type: 'text' },
  { key: 'complainantId', label: '身分證字號', type: 'text' },
  { key: 'accusedName', label: '相對人／被告姓名', type: 'text' },
  { key: 'accusedAddress', label: '相對人／被告住居所', type: 'text' },
  { key: 'courtName', label: '管轄法院／地方檢察署', type: 'text' },
  { key: 'demandTerms', label: '請求事項／訴之聲明', type: 'textarea', rows: 4, showAiSuggest: true },
];

const BASE_SCHEMAS: Record<string, ToolFieldSchema[]> = {
  CRIMINAL_COMPLAINT_TRAFFIC: [
    { key: 'complainantName', label: '告訴人姓名', type: 'text' },
    { key: 'accusedName', label: '被告姓名', type: 'text' },
    { key: 'incidentDate', label: '事故發生日期', type: 'text' },
    { key: 'incidentLocation', label: '事故發生地點', type: 'text' },
    { key: 'incidentDetails', label: '犯罪事實與受傷情形', type: 'textarea', rows: 6, showAiSuggest: true },
    { key: 'prosecutorOffice', label: '管轄地方檢察署', type: 'text' },
  ],
  DIVORCE_AGREEMENT: [
    { key: 'complainantName', label: '夫方姓名', type: 'text' },
    { key: 'accusedName', label: '妻方姓名', type: 'text' },
    { key: 'incidentDetails', label: '子女親權、扶養費與財產分配協議', type: 'textarea', rows: 6, showAiSuggest: true },
  ],
  PAYMENT_ORDER_PETITION: [
    { key: 'complainantName', label: '債權人姓名', type: 'text' },
    { key: 'accusedName', label: '債務人姓名', type: 'text' },
    { key: 'claimAmount', label: '請求金額（元）', type: 'number' },
    { key: 'incidentDetails', label: '請求原因及事實', type: 'textarea', rows: 5, showAiSuggest: true },
    { key: 'courtName', label: '管轄地方法院', type: 'text' },
  ],
  CIVIL_COMPLAINT_GENERAL: [
    { key: 'complainantName', label: '原告姓名', type: 'text' },
    { key: 'accusedName', label: '被告姓名', type: 'text' },
    { key: 'claimAmount', label: '訴訟標的金額（元）', type: 'number' },
    { key: 'demandTerms', label: '訴之聲明', type: 'textarea', rows: 4, showAiSuggest: true },
    { key: 'incidentDetails', label: '事實及理由', type: 'textarea', rows: 6, showAiSuggest: true },
    { key: 'courtName', label: '管轄地方法院', type: 'text' },
  ],
  DEMAND_LETTER_DEBT: [
    { key: 'complainantName', label: '寄件人姓名', type: 'text' },
    { key: 'accusedName', label: '收件人姓名', type: 'text' },
    { key: 'debtAmount', label: '借款金額（元）', type: 'number' },
    { key: 'repaymentDeadline', label: '催告清償期限', type: 'text' },
    { key: 'incidentDetails', label: '借款過程與催告內容', type: 'textarea', rows: 5, showAiSuggest: true },
  ],
  DEMAND_LETTER_GENERAL: [
    { key: 'complainantName', label: '寄件人姓名', type: 'text' },
    { key: 'accusedName', label: '收件人姓名', type: 'text' },
    { key: 'incidentDetails', label: '通知與催告事實內容', type: 'textarea', rows: 6, showAiSuggest: true },
  ],
  TRAFFIC_SETTLEMENT_GENERATOR: [
    { key: 'complainantName', label: '甲方（賠償方/受害方）姓名', type: 'text' },
    { key: 'accusedName', label: '乙方姓名', type: 'text' },
    { key: 'claimAmount', label: '和解賠償金額（元）', type: 'number' },
    { key: 'incidentDetails', label: '和解條件與付款方式', type: 'textarea', rows: 5, showAiSuggest: true },
  ],
};

export const TOOL_FIELD_SCHEMAS: Record<string, ToolFieldSchema[]> = new Proxy(BASE_SCHEMAS, {
  get(target, prop: string) {
    if (typeof prop === 'string' && prop in target) {
      return target[prop];
    }
    return COMMON_FIELDS;
  }
});
