export interface FormatCheckItem {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  isRequired: boolean;
}

export function verifyDocumentFormat(text: string): FormatCheckItem[] {
  const checks: FormatCheckItem[] = [];

  // 1. 當事人欄位
  const hasParties = /原告|被告|聲請人|相對人|告訴人|被告/.test(text) && /姓名|名稱|法定代理人|住址|身分證|統一編號/.test(text);
  checks.push({
    id: 'parties',
    name: '當事人欄位',
    description: '應記載當事人姓名、身分證字號或統編、住所或居所（民事訴訟法第116條第1款）',
    passed: hasParties,
    isRequired: true
  });

  // 2. 訴之聲明 / 聲請事項
  const hasClaim = /訴之聲明|聲請事項|請求事項|主旨/.test(text);
  checks.push({
    id: 'claim',
    name: '訴之聲明 / 請求事項',
    description: '應明確記載請求法院判決或裁定之具體內容（民事訴訟法第244條第1項第3款）',
    passed: hasClaim,
    isRequired: true
  });

  // 3. 事實及理由
  const hasFactsAndReasons = /事實及理由|事實與理由|案件事實|告訴事實/.test(text);
  checks.push({
    id: 'facts',
    name: '事實及理由',
    description: '應記載主張之事實及理由、爭點及法律依據（民事訴訟法第116條第2款）',
    passed: hasFactsAndReasons,
    isRequired: true
  });

  // 4. 證據 / 附件
  const hasEvidence = /證據|證物|附件|原證|被證|聲證|告證/.test(text);
  checks.push({
    id: 'evidence',
    name: '證據清單',
    description: '應記載證明或釋明主張事實之證據（民事訴訟法第116條第3款）',
    passed: hasEvidence,
    isRequired: true
  });

  // 5. 受文機關
  const hasCourt = /致|鈞院|法院|地方法院|地方檢察署/.test(text);
  checks.push({
    id: 'court',
    name: '受文機關 / 法院',
    description: '應記載附屬文件及其件數與受訴法院或機關名稱（民事訴訟法第116條第4款）',
    passed: hasCourt,
    isRequired: true
  });

  // 6. 年月日
  const hasDate = /中華民國|年\s*月\s*日/.test(text);
  checks.push({
    id: 'date',
    name: '具狀年月日',
    description: '應記載具狀之年、月、日',
    passed: hasDate,
    isRequired: true
  });

  // 7. 具狀人簽章
  const hasSignature = /具狀人|撰狀人|簽名|蓋章|簽章/.test(text);
  checks.push({
    id: 'signature',
    name: '具狀人簽名 / 蓋章',
    description: '當事人或代理人應於書狀內簽名或蓋章（民事訴訟法第117條）',
    passed: hasSignature,
    isRequired: true
  });

  return checks;
}
