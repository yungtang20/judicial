export type FormatCheckStatus = 'OK' | 'MISSING' | 'NOT_APPLICABLE' | 'WARNING';

export interface FormatCheckItem {
  id: string;
  name: string;
  status: FormatCheckStatus;
  description: string;
}

export function verifyDocumentFormat(documentText: string): FormatCheckItem[] {
  const text = documentText || '';

  const checks: FormatCheckItem[] = [
    {
      id: 'parties',
      name: '當事人載明（原告/被告/告訴人/聲請人）',
      status: /(原告|告訴人|聲請人|寄件人|甲方)/.test(text) && /(被告|相對人|債務人|收件人|乙方)/.test(text) ? 'OK' : 'MISSING',
      description: '書狀首部應詳實載明具體當事人身分、住居所或聯絡資訊。'
    },
    {
      id: 'claim_statement',
      name: '聲明事項（訴之聲明/請求事項）',
      status: /(訴之聲明|聲明事項|請求事項|應收金額|主旨|和解條件)/.test(text) ? 'OK' : 'MISSING',
      description: '應具體陳明請求判決或裁定之法律效果及特定範圍。'
    },
    {
      id: 'facts_reasons',
      name: '事實及理由陳述',
      status: /(事實及理由|犯罪事實|借款事實|事實經過|緣雙方)/.test(text) ? 'OK' : 'MISSING',
      description: '三段論法：完整記述時間、地點、發生經過及符合各法律構成要件之事實。'
    },
    {
      id: 'jurisdiction_court',
      name: '受文機關/管轄法院公署',
      status: /(地方法院|地方檢察署|公證處|戶政事務所|敬啟者)/.test(text) ? 'OK' : 'MISSING',
      description: '表明具備事務與土地管轄權之正確主管法院、檢察署或行政單位。'
    },
    {
      id: 'date_signature',
      name: '具狀日期與簽名蓋章處',
      status: /(年.*月.*日|中\s*華\s*民\s*國|具狀人|立約人|寄件人)/.test(text) ? 'OK' : 'MISSING',
      description: '載明作成之年月日，並預留具狀人或代理人親筆簽名蓋章欄位。'
    }
  ];

  return checks;
}
