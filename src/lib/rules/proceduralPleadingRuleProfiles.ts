import type {
  CaseType,
  ContentRule,
  LegalReference,
  PleadingRuleProfile,
  PleadingType,
  RequirementLevel
} from '../../types/compliance';
import { CIVIL_PLEADING_RULES } from './civilPleadingRuleProfile';

const sources = {
  civil116: ['legal_references/civil_procedure_116.md', '583118b5c8bfd76d72c79dbb5a1dbcd0b2250bd84d9c04cbaf7a7b51bfd02f46'],
  civil117: ['legal_references/civil_procedure_117.md', '1faf63748048f3a029dd8382e4b3d27bb73fbaf9be9e9a95f692cf8a04bfd23d'],
  civil266: ['legal_references/civil_procedure_266.md', 'db647b7b5a6524e701673ab9a4901c33b56c863517a531a18ff339b286f8d0f2'],
  civil441: ['legal_references/civil_procedure_441.md', '9bce1191e38a11c581dd00878ae66321432e3cd2a0f3cd6f02bef3014b866b2a'],
  civil4691: ['legal_references/civil_procedure_469_1.md', 'b83794d9c7650156fc873d1c031c2814e7990ea923cd6db2fcaa6117f1b5c659'],
  civil470: ['legal_references/civil_procedure_470.md', '6b64113337ab2d67aa58b973cfff8b3f4f7fc01d6b3b5e8ea61e7a4c0ed79fe7'],
  civil488: ['legal_references/civil_procedure_488.md', '611fbb916422a955cc97f61555fd4da696a0c6cdbf9dfa68b42c64fdb686395b'],
  civil501: ['legal_references/civil_procedure_501.md', '074541083acdcbc47ea94c7d3f15dfa3786a1a31764e6da60e83008fc51ecd4f'],
  criminal53: ['legal_references/criminal_procedure_53.md', '81fb3f20efa744a639e3a3dc49e3f06ee237db061ddd7fbc8e1c8ef86274be95'],
  criminal350: ['legal_references/criminal_procedure_350.md', '5b84863f1765010f03e1680173e7f75997f5543e018de928a8bea67ebcaf88b0'],
  criminal351: ['legal_references/criminal_procedure_351.md', 'bba9369ebd8cfcb3c7e2ed05249d37c38ab795c27ac12d3e937d3edc02d6227e'],
  criminal352: ['legal_references/criminal_procedure_352.md', 'fadc47eb0a016672e6449c9210ea3a35e844810cc7baba5436bb8aa1d92542c7'],
  criminal361: ['legal_references/criminal_procedure_361.md', 'e44e9dc6adce290221b640da382df04a814ecea56905f89900ac3af035f2550b'],
  criminal382: ['legal_references/criminal_procedure_382.md', 'a93736498a926211df6b1b5228765bc79e8fbfb53e12bcf93ca4c77e3928ff30'],
  admin57: ['legal_references/administrative_litigation_57.md', '44987c4c98a5f848ea48159e14eb17e72614d4e594b686110c8eb5508562c0ad'],
  admin244: ['legal_references/administrative_litigation_244.md', 'c6140b78015cfc96f93572c910a5d41b7e1b45a9f18afeedc20fd2e46e4df215'],
  enforcement5: ['legal_references/compulsory_enforcement_5.md', 'e5aef36605920af4f3c03cd2ba861cbf78fb5b3d44e94888d751e795a9c866c8'],
  enforcement6: ['legal_references/compulsory_enforcement_6.md', '039ee74e84c415d659bcbdf0041da392c69cef2969e38a301cb0a94a95495408'],
  nonContentious30: ['legal_references/non_contentious_30.md', '45bc1867ff86425851cc6cdef943a1f2d61d9711a625492e08f6cda577d65403']
} as const;

type SourceKey = keyof typeof sources;

function references(...keys: SourceKey[]): LegalReference[] {
  return keys.map(key => ({
    sourceReference: sources[key][0],
    contentHash: sources[key][1],
    verificationStatus: 'VERIFIED'
  }));
}

function rule(
  id: string,
  basis: string,
  targetSection: string,
  source: SourceKey,
  appliesTo: CaseType,
  pleadingType: PleadingType,
  description: string,
  level: RequirementLevel = 'REQUIRED',
  validatorId?: string
): ContentRule {
  return {
    id,
    basis,
    targetSection,
    sourceReferences: [sources[source][0]],
    appliesTo: [appliesTo],
    pleadingTypes: [pleadingType],
    description,
    level,
    validatorId
  };
}

function civilCommon(pleadingType: PleadingType): ContentRule[] {
  return CIVIL_PLEADING_RULES
    .filter(item => item.id.startsWith('CIVIL_116_') || item.id === 'CIVIL_117_SIGNATURE')
    .map(item => ({ ...item, pleadingTypes: [pleadingType] }));
}

function profile(
  id: string,
  caseType: CaseType,
  pleadingType: PleadingType,
  sourceKeys: SourceKey[],
  rules: ContentRule[]
): PleadingRuleProfile {
  return {
    id,
    version: '1.0.0',
    caseType,
    pleadingType,
    supportedPleadingTypes: [pleadingType],
    formatProfileId: caseType,
    sourceAuthority: '全國法規資料庫',
    sourceReference: sourceKeys.map(key => sources[key][0]).join(', '),
    verificationStatus: 'VERIFIED',
    rules
  };
}

export const CIVIL_PAYMENT_ORDER_RULE_PROFILE = profile(
  'CIVIL_PAYMENT_ORDER_RULE_PROFILE', 'civil', 'motion', ['civil116', 'civil117'], civilCommon('motion')
);

export const CIVIL_ANSWER_RULE_PROFILE = profile(
  'CIVIL_ANSWER_RULE_PROFILE', 'civil', 'answer', ['civil116', 'civil117', 'civil266'], [
    ...civilCommon('answer'),
    rule('CIVIL_266_ANSWER_FACTS', '民事訴訟法第266條第2項第1款', 'answer_facts_and_reasons', 'civil266', 'civil', 'answer', '答辯之事實及理由。'),
    rule('CIVIL_266_ANSWER_EVIDENCE', '民事訴訟法第266條第2項第2款準用第1項第2款', 'evidence', 'civil266', 'civil', 'answer', '證明應證事實所用之證據；有多數證據者全部記載。'),
    rule('CIVIL_266_OPPONENT_POSITION', '民事訴訟法第266條第2項第2款準用第1項第3款', 'opponent_position', 'civil266', 'civil', 'answer', '對他造主張之事實及證據為承認與否之陳述；爭執時敘明理由。'),
    rule('CIVIL_266_DISTINCT_ENTRIES', '民事訴訟法第266條第3項', 'answer_facts_and_reasons', 'civil266', 'civil', 'answer', '各款事項應分別具體記載。', 'REQUIRED', 'DISTINCT_ANSWER_ENTRIES'),
    rule('CIVIL_266_DOCUMENT_COPIES', '民事訴訟法第266條第4項', 'documentary_evidence_copies', 'civil266', 'civil', 'answer', '添具所用書證影本並提出於法院。'),
    rule('CIVIL_266_DIRECT_NOTICE', '民事訴訟法第266條第4項', 'direct_notice', 'civil266', 'civil', 'answer', '以書證影本直接通知他造。')
  ]
);

export const CIVIL_SECOND_APPEAL_RULE_PROFILE = profile(
  'CIVIL_SECOND_APPEAL_RULE_PROFILE', 'civil', 'appeal', ['civil116', 'civil117', 'civil441'], [
    ...civilCommon('appeal'),
    rule('CIVIL_441_JUDGMENT', '民事訴訟法第441條第1項第2款', 'first_instance_judgment_and_appeal_statement', 'civil441', 'civil', 'appeal', '第一審判決及對該判決上訴之陳述。'),
    rule('CIVIL_441_DISPOSITION', '民事訴訟法第441條第1項第3款', 'appeal_disposition', 'civil441', 'civil', 'appeal', '不服程度及應如何廢棄或變更之聲明。'),
    rule('CIVIL_441_REASONS', '民事訴訟法第441條第1項第4款及第2項第1款', 'appeal_reasons', 'civil441', 'civil', 'appeal', '上訴理由及應廢棄或變更原判決之理由。'),
    rule('CIVIL_441_FACTS_EVIDENCE', '民事訴訟法第441條第2項第2款', 'appeal_supporting_facts_and_evidence', 'civil441', 'civil', 'appeal', '上訴理由所據之事實及證據。')
  ]
);

function civilThirdAppealProfile(principledImportance: boolean): PleadingRuleProfile {
  const sourceKeys: SourceKey[] = principledImportance
    ? ['civil116', 'civil117', 'civil470', 'civil4691']
    : ['civil116', 'civil117', 'civil470'];
  return profile(
    principledImportance ? 'CIVIL_THIRD_APPEAL_PRINCIPLED_RULE_PROFILE' : 'CIVIL_THIRD_APPEAL_STATUTORY_RULE_PROFILE',
    'civil', 'appeal', sourceKeys, [
      ...civilCommon('appeal'),
      rule('CIVIL_470_VIOLATED_LAW', '民事訴訟法第470條第2項第1款', 'violated_law', 'civil470', 'civil', 'appeal', '原判決所違背之法令及其具體內容。'),
      rule('CIVIL_470_RECORD_FACTS', '民事訴訟法第470條第2項第2款', 'record_facts', 'civil470', 'civil', 'appeal', '依訴訟資料合於違背法令之具體事實。'),
      ...(principledImportance ? [
        rule('CIVIL_470_PRINCIPLED_IMPORTANCE', '民事訴訟法第470條第2項第3款及第469條之1', 'principled_importance_reason', 'civil470', 'civil', 'appeal', '具體敘述法律見解具有原則上重要性之理由。')
      ] : []),
      rule('CIVIL_470_APPELLATE_INTEREST', '民事訴訟法第470條第3項', 'appellate_interest', 'civil470', 'civil', 'appeal', '宜記載因上訴所得受之利益。', 'RECOMMENDED')
    ]
  );
}

export const CIVIL_THIRD_APPEAL_STATUTORY_RULE_PROFILE = civilThirdAppealProfile(false);
export const CIVIL_THIRD_APPEAL_PRINCIPLED_RULE_PROFILE = civilThirdAppealProfile(true);

export const CIVIL_INTERLOCUTORY_APPEAL_RULE_PROFILE = profile(
  'CIVIL_INTERLOCUTORY_APPEAL_RULE_PROFILE', 'civil', 'interlocutory_appeal', ['civil116', 'civil117', 'civil488'], [
    ...civilCommon('interlocutory_appeal'),
    rule('CIVIL_488_REASONS', '民事訴訟法第488條第3項', 'interlocutory_appeal_reasons', 'civil488', 'civil', 'interlocutory_appeal', '抗告理由。')
  ]
);

export const CIVIL_RETRIAL_RULE_PROFILE = profile(
  'CIVIL_RETRIAL_RULE_PROFILE', 'civil', 'retrial', ['civil116', 'civil117', 'civil501'], [
    ...civilCommon('retrial'),
    rule('CIVIL_501_JUDGMENT', '民事訴訟法第501條第1項第2款', 'challenged_judgment_and_retrial_statement', 'civil501', 'civil', 'retrial', '聲明不服之判決及提起再審之訴之陳述。'),
    rule('CIVIL_501_DISPOSITION', '民事訴訟法第501條第1項第3款', 'retrial_disposition', 'civil501', 'civil', 'retrial', '應於如何程度廢棄原判決及就本案如何判決之聲明。'),
    rule('CIVIL_501_REASONS', '民事訴訟法第501條第1項第4款', 'retrial_reasons_and_time_limit_evidence', 'civil501', 'civil', 'retrial', '再審理由及關於再審理由並遵守不變期間之證據。'),
    rule('CIVIL_501_HEARING_PREPARATION', '民事訴訟法第501條第2項', 'hearing_preparation', 'civil501', 'civil', 'retrial', '宜記載準備本案言詞辯論之事項。', 'RECOMMENDED'),
    rule('CIVIL_501_FINAL_JUDGMENT_COPY', '民事訴訟法第501條第2項', 'final_judgment_copy', 'civil501', 'civil', 'retrial', '宜添具確定終局判決繕本或影本。', 'RECOMMENDED')
  ]
);

function criminalCommon(pleadingType: PleadingType): ContentRule[] {
  return [
    rule('CRIMINAL_53_DATE', '刑事訴訟法第53條', 'date', 'criminal53', 'criminal', pleadingType, '文書應記載年、月、日。'),
    rule('CRIMINAL_53_SIGNATURE', '刑事訴訟法第53條', 'signature', 'criminal53', 'criminal', pleadingType, '文書應簽名；不能簽名者依條文所定方式為之。')
  ];
}

export const CRIMINAL_SECOND_APPEAL_RULE_PROFILE = profile(
  'CRIMINAL_SECOND_APPEAL_RULE_PROFILE', 'criminal', 'appeal', ['criminal53', 'criminal350', 'criminal361'], [
    ...criminalCommon('appeal'),
    rule('CRIMINAL_350_COURT', '刑事訴訟法第350條第1項', 'court', 'criminal350', 'criminal', 'appeal', '上訴書狀提出於原審法院。'),
    rule('CRIMINAL_350_COPIES', '刑事訴訟法第350條第2項', 'copies', 'criminal350', 'criminal', 'appeal', '按他造當事人人數提出繕本。'),
    rule('CRIMINAL_361_REASONS', '刑事訴訟法第361條第2項', 'appeal_reasons', 'criminal361', 'criminal', 'appeal', '上訴書狀應敘述具體理由。')
  ]
);

export const CRIMINAL_THIRD_APPEAL_RULE_PROFILE = profile(
  'CRIMINAL_THIRD_APPEAL_RULE_PROFILE', 'criminal', 'appeal', ['criminal53', 'criminal350', 'criminal351', 'criminal352', 'criminal382'], [
    ...criminalCommon('appeal'),
    rule('CRIMINAL_350_COPIES_THIRD', '刑事訴訟法第382條第2項準用第350條第2項', 'copies', 'criminal350', 'criminal', 'appeal', '按他造當事人人數提出理由書繕本。'),
    rule('CRIMINAL_382_REASONS', '刑事訴訟法第382條第1項', 'appeal_reasons', 'criminal382', 'criminal', 'appeal', '上訴書狀應敘述上訴理由；系統對理由缺失一律阻擋。')
  ]
);

function administrativeCommon(): ContentRule[] {
  return [
    rule('ADMIN_57_1', '行政訴訟法第57條第1項第1款', 'parties', 'admin57', 'administrative_litigation', 'appeal', '當事人姓名及住所或居所；法人、機關或團體之名稱及所在地。'),
    rule('ADMIN_57_2_3', '行政訴訟法第57條第1項第2款及第3款', 'representatives', 'admin57', 'administrative_litigation', 'appeal', '有法定代理人、代表人、管理人或訴訟代理人時，記載其姓名及住所或居所。'),
    rule('ADMIN_57_4', '行政訴訟法第57條第1項第4款', 'statements', 'admin57', 'administrative_litigation', 'appeal', '應為之聲明。'),
    rule('ADMIN_57_5', '行政訴訟法第57條第1項第5款', 'answer_facts_and_reasons', 'admin57', 'administrative_litigation', 'appeal', '事實上及法律上之陳述。'),
    rule('ADMIN_57_6', '行政訴訟法第57條第1項第6款', 'evidence', 'admin57', 'administrative_litigation', 'appeal', '供證明或釋明用之證據。'),
    rule('ADMIN_57_7', '行政訴訟法第57條第1項第7款', 'attachments', 'admin57', 'administrative_litigation', 'appeal', '附屬文件及其件數。'),
    rule('ADMIN_57_8', '行政訴訟法第57條第1項第8款', 'court', 'admin57', 'administrative_litigation', 'appeal', '行政法院。'),
    rule('ADMIN_57_9', '行政訴訟法第57條第1項第9款', 'date', 'admin57', 'administrative_litigation', 'appeal', '年、月、日。'),
    rule('ADMIN_57_RECOMMENDED_IDENTIFIERS', '行政訴訟法第57條第2項', 'party_identifiers', 'admin57', 'administrative_litigation', 'appeal', '宜記載足資辨別之識別資料。', 'RECOMMENDED')
  ];
}

export const ADMINISTRATIVE_APPEAL_RULE_PROFILE = profile(
  'ADMINISTRATIVE_APPEAL_RULE_PROFILE', 'administrative_litigation', 'appeal', ['admin57', 'admin244'], [
    ...administrativeCommon(),
    rule('ADMIN_244_JUDGMENT', '行政訴訟法第244條第1項第2款', 'first_instance_judgment_and_appeal_statement', 'admin244', 'administrative_litigation', 'appeal', '高等行政法院判決及對該判決上訴之陳述。'),
    rule('ADMIN_244_DISPOSITION', '行政訴訟法第244條第1項第3款', 'appeal_disposition', 'admin244', 'administrative_litigation', 'appeal', '不服程度及應如何廢棄或變更之聲明。'),
    rule('ADMIN_244_REASONS', '行政訴訟法第244條第1項第4款', 'appeal_reasons', 'admin244', 'administrative_litigation', 'appeal', '上訴理由。'),
    rule('ADMIN_244_VIOLATED_LAW', '行政訴訟法第244條第2項第1款', 'violated_law', 'admin244', 'administrative_litigation', 'appeal', '原判決所違背之法令及其具體內容。'),
    rule('ADMIN_244_RECORD_FACTS', '行政訴訟法第244條第2項第2款', 'record_facts', 'admin244', 'administrative_litigation', 'appeal', '依訴訟資料合於違背法令之具體事實。'),
    rule('ADMIN_244_NECESSARY_EVIDENCE', '行政訴訟法第244條第3項', 'necessary_evidence', 'admin244', 'administrative_litigation', 'appeal', '添具關於上訴理由之必要證據。')
  ]
);

export const NON_CONTENTIOUS_APPLICATION_RULE_PROFILE = profile(
  'NON_CONTENTIOUS_APPLICATION_RULE_PROFILE', 'non_contentious', 'motion', ['nonContentious30'], [
    rule('NON_CONTENTIOUS_30_1', '非訟事件法第30條第1項第1款', 'parties', 'nonContentious30', 'non_contentious', 'motion', '聲請人完整人別及住所或居所。'),
    rule('NON_CONTENTIOUS_30_2', '非訟事件法第30條第1項第2款', 'representatives', 'nonContentious30', 'non_contentious', 'motion', '有代理人時之完整人別及住所或居所。'),
    rule('NON_CONTENTIOUS_30_IDENTIFIERS', '非訟事件法第30條第1項第1款及第2款', 'party_identifiers', 'nonContentious30', 'non_contentious', 'motion', '聲請人及代理人之性別、出生年月日、身分證統一號碼及職業。'),
    rule('NON_CONTENTIOUS_30_3', '非訟事件法第30條第1項第3款', 'request_and_facts', 'nonContentious30', 'non_contentious', 'motion', '聲請意旨及其原因、事實。'),
    rule('NON_CONTENTIOUS_30_4', '非訟事件法第30條第1項第4款', 'evidence', 'nonContentious30', 'non_contentious', 'motion', '供證明或釋明用之證據。'),
    rule('NON_CONTENTIOUS_30_5', '非訟事件法第30條第1項第5款', 'attachments', 'nonContentious30', 'non_contentious', 'motion', '附屬文件及其件數。'),
    rule('NON_CONTENTIOUS_30_6', '非訟事件法第30條第1項第6款', 'court', 'nonContentious30', 'non_contentious', 'motion', '法院。'),
    rule('NON_CONTENTIOUS_30_7', '非訟事件法第30條第1項第7款', 'date', 'nonContentious30', 'non_contentious', 'motion', '年、月、日。'),
    rule('NON_CONTENTIOUS_30_SIGNATURE', '非訟事件法第30條第2項', 'signature', 'nonContentious30', 'non_contentious', 'motion', '聲請人或代理人簽名；不能簽名者依條文所定方式為之。')
  ]
);

export const CIVIL_ENFORCEMENT_APPLICATION_RULE_PROFILE = profile(
  'CIVIL_ENFORCEMENT_APPLICATION_RULE_PROFILE', 'civil_enforcement', 'motion', ['enforcement5', 'enforcement6'], [
    rule('ENFORCEMENT_5_1', '強制執行法第5條第1項第1款', 'parties', 'enforcement5', 'civil_enforcement', 'motion', '當事人及法定代理人。'),
    rule('ENFORCEMENT_5_2', '強制執行法第5條第1項第2款', 'right_to_be_realized', 'enforcement5', 'civil_enforcement', 'motion', '請求實現之權利。'),
    rule('ENFORCEMENT_5_RECOMMENDED_TARGET', '強制執行法第5條第2項', 'enforcement_target', 'enforcement5', 'civil_enforcement', 'motion', '宜記載執行之標的物。', 'RECOMMENDED'),
    rule('ENFORCEMENT_5_RECOMMENDED_ACTION', '強制執行法第5條第2項', 'requested_enforcement_action', 'enforcement5', 'civil_enforcement', 'motion', '宜記載應為之執行行為。', 'RECOMMENDED'),
    rule('ENFORCEMENT_6_DOCUMENT', '強制執行法第6條第1項', 'enforcement_title_documents', 'enforcement6', 'civil_enforcement', 'motion', '依執行名義類型提出相應證明文件。')
  ]
);

export const PROCEDURAL_LEGAL_REFERENCES = {
  CIVIL_PAYMENT_ORDER: references('civil116', 'civil117'),
  CIVIL_ANSWER: references('civil116', 'civil117', 'civil266'),
  CIVIL_SECOND_APPEAL: references('civil116', 'civil117', 'civil441'),
  CIVIL_THIRD_APPEAL_STATUTORY: references('civil116', 'civil117', 'civil470'),
  CIVIL_THIRD_APPEAL_PRINCIPLED: references('civil116', 'civil117', 'civil470', 'civil4691'),
  CIVIL_INTERLOCUTORY_APPEAL: references('civil116', 'civil117', 'civil488'),
  CIVIL_RETRIAL: references('civil116', 'civil117', 'civil501'),
  CRIMINAL_SECOND_APPEAL: references('criminal53', 'criminal350', 'criminal361'),
  CRIMINAL_THIRD_APPEAL: references('criminal53', 'criminal350', 'criminal351', 'criminal352', 'criminal382'),
  ADMINISTRATIVE_APPEAL: references('admin57', 'admin244'),
  NON_CONTENTIOUS_APPLICATION: references('nonContentious30'),
  CIVIL_ENFORCEMENT_APPLICATION: references('enforcement5', 'enforcement6')
} as const;
