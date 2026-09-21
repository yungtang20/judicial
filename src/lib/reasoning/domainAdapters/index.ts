import { createAdapter, type LegalDomainAdapter } from './types';

export const CIVIL_ADAPTER = createAdapter('CIVIL', ['借款', '契約', '損害', '返還'], ['CIVIL_COMPLAINT_GENERAL', 'PAYMENT_ORDER_PETITION'], '先分離請求權基礎、當事人適格與可證明的損害，再判斷程序。');
export const CRIMINAL_ADAPTER = createAdapter('CRIMINAL', ['犯罪', '毆打', '詐騙', '恐嚇'], ['CRIMINAL_COMPLAINT_TRAFFIC'], '先釐清犯罪構成要件、告訴期間與證據，不以單一敘述直接認定犯罪成立。');
export const LABOR_ADAPTER = createAdapter('LABOR', ['勞工', '雇主', '資遣', '工資'], ['CIVIL_COMPLAINT_GENERAL'], '先整理僱傭關係、工資或終止事實與勞資爭議程序。');
export const ADMINISTRATIVE_ADAPTER = createAdapter('ADMINISTRATIVE', ['行政處分', '訴願', '機關', '裁決'], ['JUDICIAL_ADMIN_TEMPLATE'], '先確認行政處分、救濟期間、管轄與信賴保護等程序前提。');
export const GENDER_ADAPTER = createAdapter('GENDER_EQUITY_HARASSMENT', ['性騷', '性侵', '跟蹤', '保護令'], ['JUDICIAL_FAMILY_TEMPLATE'], '先處理人身安全與證據保全，再分離刑事、民事及保護令路徑。');
export const IP_ADAPTER = createAdapter('INTELLECTUAL_PROPERTY', ['商標', '著作權', '專利', '侵權'], ['CIVIL_COMPLAINT_GENERAL'], '先確認權利標的、權利有效狀態、使用行為與損害證據。');
export const DEBT_COLLECTION_ADAPTER = createAdapter('DEBT_COLLECTION', ['催收', '債務', '欠款', '債權'], ['PAYMENT_ORDER_PETITION', 'DEMAND_LETTER_DEBT'], '先分流債務人本人與受牽連第三人；兩者的權利主體與法律路徑不同。');

export const DOMAIN_ADAPTERS: Record<string, LegalDomainAdapter> = {
  CIVIL: CIVIL_ADAPTER,
  CRIMINAL: CRIMINAL_ADAPTER,
  LABOR: LABOR_ADAPTER,
  ADMINISTRATIVE: ADMINISTRATIVE_ADAPTER,
  GENDER_EQUITY_HARASSMENT: GENDER_ADAPTER,
  INTELLECTUAL_PROPERTY: IP_ADAPTER,
  DEBT_COLLECTION: DEBT_COLLECTION_ADAPTER
};

export function getDomainAdapter(domainId: string): LegalDomainAdapter | undefined {
  return DOMAIN_ADAPTERS[domainId.trim().toUpperCase()];
}
