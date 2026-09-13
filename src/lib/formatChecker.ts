import type { ComplianceStatus, PleadingType } from '../types/compliance';

/** @deprecated Legacy keyword-indicator shape. Use ComplianceFinding from the canonical pleading pipeline. */
export interface FormatCheckItem {
  id: string;
  name: string;
  description: string;
  legalBasis: string;
  status: ComplianceStatus;
  /** @deprecated Legacy UI compatibility only; this never means legal compliance. */
  passed: boolean;
  isRequired: boolean;
}

export interface VerifyDocumentFormatOptions {
  pleadingType?: PleadingType;
}

function item(
  id: string,
  name: string,
  description: string,
  legalBasis: string,
  present: boolean,
  isRequired: boolean
): FormatCheckItem {
  return {
    id,
    name,
    description: `${description}（僅偵測文字指標，未驗證內容正確性）`,
    legalBasis,
    status: present ? 'WARNING' : isRequired ? 'MISSING' : 'WARNING',
    passed: present || !isRequired,
    isRequired
  };
}

/**
 * @deprecated Legacy keyword adapter. Canonical legal compliance is verified by
 * verifyPleadingCompliance. Keep until the remaining UI caller is migrated and
 * removal receives human approval.
 */
export function verifyDocumentFormat(
  text: string,
  options: VerifyDocumentFormatOptions = {}
): FormatCheckItem[] {
  const hasRepresentative = /法定代理人|訴訟代理人/.test(text);
  const representativeCheck = item(
    'CIVIL_116_2',
    '法定代理人／訴訟代理人',
    '有代理人時，應記載姓名、住所或居所及法定代理人與當事人之關係。',
    '民事訴訟法第116條第1項第2款',
    hasRepresentative && /住所|居所|住址|地址/.test(text),
    hasRepresentative
  );
  if (!hasRepresentative) representativeCheck.status = 'NOT_APPLICABLE';
  const checks = [
    item(
      'CIVIL_116_1',
      '當事人姓名及住所／居所',
      '應記載當事人姓名及住所或居所；法人等記載名稱及所在地。',
      '民事訴訟法第116條第1項第1款',
      /原告|被告|聲請人|相對人|當事人/.test(text) && /住所|居所|住址|地址|所在地/.test(text),
      true
    ),
    representativeCheck,
    item(
      'CIVIL_116_3',
      '訴訟事件',
      '應記載訴訟事件。',
      '民事訴訟法第116條第1項第3款',
      /訴訟事件|案由|事件/.test(text),
      true
    ),
    item(
      'CIVIL_116_4',
      '應為之聲明或陳述',
      '應記載應為之聲明或陳述。',
      '民事訴訟法第116條第1項第4款',
      /聲明|陳述|聲請事項|請求事項|主旨/.test(text),
      true
    ),
    item(
      'CIVIL_116_5',
      '證據',
      '應記載供證明或釋明用之證據。',
      '民事訴訟法第116條第1項第5款',
      /證據|證物|原證|被證|聲證|告證/.test(text),
      true
    ),
    item(
      'CIVIL_116_6',
      '附屬文件及件數',
      '應記載附屬文件及其件數。',
      '民事訴訟法第116條第1項第6款',
      /附件|附屬文件/.test(text) && /件數|\d+\s*件/.test(text),
      true
    ),
    item(
      'CIVIL_116_7',
      '法院',
      '應記載法院。',
      '民事訴訟法第116條第1項第7款',
      /法院|鈞院/.test(text),
      true
    ),
    item(
      'CIVIL_116_8',
      '年、月、日',
      '應記載年、月、日。',
      '民事訴訟法第116條第1項第8款',
      /中華民國\s*\d+\s*年|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|年\s*月\s*日/.test(text),
      true
    ),
    item(
      'CIVIL_116_RECOMMENDED_IDENTIFIERS',
      '宜記載識別資料',
      '性別、出生年月日、職業、身分證統一編號、電話等屬宜記載事項。',
      '民事訴訟法第116條第2項',
      /性別|出生年月日|職業|身分證|統一編號|電話/.test(text),
      false
    ),
    item(
      'CIVIL_117_SIGNATURE',
      '簽名或蓋章',
      '當事人或代理人應於書狀內簽名或蓋章。',
      '民事訴訟法第117條',
      /具狀人|簽名|蓋章|簽章/.test(text),
      true
    )
  ];

  if (options.pleadingType === 'complaint') {
    checks.push(
      item(
        'CIVIL_244_1',
        '起訴當事人及法定代理人',
        '起訴狀應表明當事人及法定代理人。',
        '民事訴訟法第244條第1項第1款',
        /原告|被告|當事人/.test(text),
        true
      ),
      item(
        'CIVIL_244_2',
        '訴訟標的及原因事實',
        '起訴狀應表明訴訟標的及其原因事實。',
        '民事訴訟法第244條第1項第2款',
        /訴訟標的|原因事實|事實及理由|事實與理由/.test(text),
        true
      ),
      item(
        'CIVIL_244_3',
        '應受判決事項之聲明',
        '起訴狀應表明應受判決事項之聲明。',
        '民事訴訟法第244條第1項第3款',
        /訴之聲明|應受判決事項之聲明/.test(text),
        true
      )
    );
  }

  return checks;
}
