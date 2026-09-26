import type { CategoryGroupId } from '../types/legalTools';

export const DEFAULT_DOCUMENT_TOOL_ID = 'CIVIL_COMPLAINT_GENERAL' as const;

export const DOCUMENT_IDS = {
  civilComplaint: 'CIVIL_COMPLAINT_GENERAL',
  paymentOrder: 'PAYMENT_ORDER_PETITION',
  criminalComplaint: 'CRIMINAL_COMPLAINT_TRAFFIC',
  criminalSupplementaryCivil: 'CRIMINAL_SUPPLEMENTARY_CIVIL',
  judicialCivilTemplate: 'JUDICIAL_CIVIL_TEMPLATE',
  judicialCriminalTemplate: 'JUDICIAL_CRIMINAL_TEMPLATE',
  judicialAdminTemplate: 'JUDICIAL_ADMIN_TEMPLATE',
  judicialFamilyTemplate: 'JUDICIAL_FAMILY_TEMPLATE',
  judicialExecutionTemplate: 'JUDICIAL_EXECUTION_TEMPLATE',
  spousalRightInfringement: 'SPOUSAL_RIGHT_INFRINGEMENT'
} as const;

export type DocumentCatalogEntry = {
  id: string;
  displayName: string;
  categoryGroup: CategoryGroupId;
  documentKind: 'COURT_PLEADING' | 'OFFICIAL_TEMPLATE' | 'GENERAL_DOCUMENT';
  generationPath: 'CANONICAL_P4_P9' | 'OFFICIAL_TEMPLATE' | 'LEGACY_PIPELINE' | 'UNSUPPORTED';
  enabled: boolean;
  selectionEnabled: boolean;
  requiresP9: boolean;
  canonicalConfigKey?: string;
};

export const OFFICIAL_TEMPLATE_UI_ENABLED = true as const;

const entries: DocumentCatalogEntry[] = [
  {
    id: DOCUMENT_IDS.civilComplaint,
    displayName: '民事起訴狀線上產生器',
    categoryGroup: 'DEBT',
    documentKind: 'COURT_PLEADING',
    generationPath: 'CANONICAL_P4_P9',
    enabled: true,
    selectionEnabled: true,
    requiresP9: true,
    canonicalConfigKey: DOCUMENT_IDS.civilComplaint
  },
  {
    id: DOCUMENT_IDS.paymentOrder,
    displayName: '支付命令聲請狀產生器',
    categoryGroup: 'DEBT',
    documentKind: 'COURT_PLEADING',
    generationPath: 'CANONICAL_P4_P9',
    enabled: true,
    selectionEnabled: true,
    requiresP9: true,
    canonicalConfigKey: DOCUMENT_IDS.paymentOrder
  },
  {
    id: DOCUMENT_IDS.criminalComplaint,
    displayName: '刑事告訴狀線上產生器',
    categoryGroup: 'LABOR_CRIMINAL_CONTRACT',
    documentKind: 'COURT_PLEADING',
    // 尚未建立經核准的書狀結構與 rule profile，canonical 管線沒有對應設定。
    // 仍可選取的話，使用者填完表單按下產製必定收到 422 P9_FINAL_GATE_FAILED，
    // 因此先停用選取；補齊核准結構後再改回 CANONICAL_P4_P9 並開啟 selectionEnabled。
    generationPath: 'UNSUPPORTED',
    enabled: true,
    selectionEnabled: false,
    requiresP9: true
  },
  {
    id: DOCUMENT_IDS.criminalSupplementaryCivil,
    displayName: '刑事附帶民事訴訟起訴狀',
    categoryGroup: 'LABOR_CRIMINAL_CONTRACT',
    documentKind: 'COURT_PLEADING',
    generationPath: 'CANONICAL_P4_P9',
    enabled: true,
    selectionEnabled: true,
    requiresP9: true,
    canonicalConfigKey: DOCUMENT_IDS.criminalSupplementaryCivil
  },
  {
    id: DOCUMENT_IDS.judicialCivilTemplate,
    displayName: '民事訴訟書狀（司法院標準）',
    categoryGroup: 'OFFICIAL_TEMPLATES',
    documentKind: 'OFFICIAL_TEMPLATE',
    generationPath: 'OFFICIAL_TEMPLATE',
    enabled: true,
    selectionEnabled: false,
    requiresP9: true
  },
  {
    id: DOCUMENT_IDS.judicialCriminalTemplate,
    displayName: '刑事訴訟書狀（司法院標準）',
    categoryGroup: 'OFFICIAL_TEMPLATES',
    documentKind: 'OFFICIAL_TEMPLATE',
    generationPath: 'OFFICIAL_TEMPLATE',
    enabled: true,
    selectionEnabled: false,
    requiresP9: true
  },
  {
    id: DOCUMENT_IDS.judicialAdminTemplate,
    displayName: '行政訴訟書狀（司法院標準）',
    categoryGroup: 'OFFICIAL_TEMPLATES',
    documentKind: 'OFFICIAL_TEMPLATE',
    generationPath: 'OFFICIAL_TEMPLATE',
    enabled: true,
    selectionEnabled: false,
    requiresP9: true
  },
  {
    id: DOCUMENT_IDS.judicialFamilyTemplate,
    displayName: '家事事件書狀（司法院標準）',
    categoryGroup: 'OFFICIAL_TEMPLATES',
    documentKind: 'OFFICIAL_TEMPLATE',
    generationPath: 'OFFICIAL_TEMPLATE',
    enabled: true,
    selectionEnabled: false,
    requiresP9: true
  },
  {
    id: DOCUMENT_IDS.judicialExecutionTemplate,
    displayName: '強制執行書狀（司法院標準）',
    categoryGroup: 'OFFICIAL_TEMPLATES',
    documentKind: 'OFFICIAL_TEMPLATE',
    generationPath: 'OFFICIAL_TEMPLATE',
    enabled: true,
    selectionEnabled: false,
    requiresP9: true
  },
  {
    id: DOCUMENT_IDS.spousalRightInfringement,
    displayName: '侵害配偶權與外遇求償評估器',
    categoryGroup: 'FAMILY',
    documentKind: 'COURT_PLEADING',
    generationPath: 'CANONICAL_P4_P9',
    enabled: true,
    selectionEnabled: true,
    requiresP9: true,
    canonicalConfigKey: DOCUMENT_IDS.spousalRightInfringement
  }
];

const LEGACY_P9_DOCUMENT_IDS = [
  'CRIMINAL_COMPLAINT',
  'CRIMINAL_COMPLAINT_FRAUD',
  'CRIMINAL_COMPLAINT_DEFAMATION',
  'CRIMINAL_COMPLAINT_SEXUAL_ASSAULT',
  'CRIMINAL_COMPLAINT_THEFT',
  'CRIMINAL_COMPLAINT_ASSAULT',
  'CRIMINAL_COMPLAINT_INTIMIDATION',
  'CRIMINAL_COMPLAINT_PRIVACY',
  'DOMESTIC_VIOLENCE_PROTECTION_ORDER',
  'CIVIL_TORT_SEXUAL_ASSAULT',
  'CIVIL_PET_DISPUTE',
  'CIVIL_TORT_GENERAL',
  'WAIVER_OF_INHERITANCE',
  'GUARDIANSHIP_PETITION',
  'ASSISTANCE_PETITION',
  'PROMISSORY_NOTE_RULING',
  'EXECUTION_SALARY_ATTACHMENT',
  'EXECUTION_BANK_REAL_ESTATE',
  'PROVISIONAL_ATTACHMENT',
  'TRAFFIC_SETTLEMENT_GENERATOR',
  'DIVORCE_AGREEMENT'
] as const;

for (const id of LEGACY_P9_DOCUMENT_IDS) {
  if (!entries.some(entry => entry.id === id)) {
    entries.push({
      id,
      displayName: id,
      categoryGroup: 'LABOR_CRIMINAL_CONTRACT',
      documentKind: 'COURT_PLEADING',
      generationPath: 'UNSUPPORTED',
      enabled: false,
      selectionEnabled: false,
      requiresP9: true
    });
  }
}

const entriesById = new Map(entries.map(entry => [entry.id, entry]));

export function getDocumentCatalogEntry(documentId: string): DocumentCatalogEntry | undefined {
  return entriesById.get(documentId.trim().toUpperCase());
}

export function isP9ProtectedDocument(documentId: string): boolean {
  return getDocumentCatalogEntry(documentId)?.requiresP9 === true;
}

export function isSelectableDocument(documentId: string): boolean {
  const entry = getDocumentCatalogEntry(documentId);
  return Boolean(entry?.enabled && entry.selectionEnabled);
}

export const CANONICAL_DOCUMENT_IDS = entries
  .filter(entry => entry.generationPath === 'CANONICAL_P4_P9')
  .map(entry => entry.id);
