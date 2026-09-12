import { 
  Scale, 
  ShieldCheck, 
  Calculator, 
  HeartHandshake, 
  Mail, 
  FileText, 
  Home, 
  Heart, 
  Car, 
  Briefcase, 
  Clock, 
  Landmark, 
  FileSignature, 
  FileSpreadsheet, 
  Gavel, 
  FileCheck2, 
  DollarSign, 
  Users, 
  AlertCircle 
} from 'lucide-react';
import { ToolDefinition, CategoryGroupId } from '../types/legalTools';

export type { ToolDefinition, CategoryGroupId };

/**
 * 鼎川法律工具箱四大生活核心分類
 */
export const TOOLBOX_CATEGORIES: { id: CategoryGroupId; name: string; subtitle: string }[] = [
  {
    id: 'FAMILY',
    name: '家事 · 離婚｜親權｜財產',
    subtitle: '離婚、監護權、扶養費、剩餘財產、繼承'
  },
  {
    id: 'DEBT',
    name: '討債 · 金錢糾紛',
    subtitle: '存證信函、借據、本票、支付命令、裁判費'
  },
  {
    id: 'TRAFFIC',
    name: '車禍 · 交通事故',
    subtitle: '車禍理賠、和解書、過失傷害、程序評估'
  },
  {
    id: 'LABOR_CRIMINAL_CONTRACT',
    name: '勞資 · 刑事 · 契約',
    subtitle: '資遣費、刑事告訴、租賃、買賣、消滅時效'
  },
  {
    id: 'OFFICIAL_TEMPLATES',
    name: '司法院官方範本',
    subtitle: '民事、刑事、行政、家事、強制執行等官方書狀產製'
  }
];

export const LEGAL_TOOLS: ToolDefinition[] = [
  // ==========================================
  // 分類五：司法院官方範本整合 (5項)
  // ==========================================
  {
    id: 'JUDICIAL_CIVIL_TEMPLATE',
    categoryGroup: 'OFFICIAL_TEMPLATES',
    categoryLabel: '司法院官方範本',
    name: '民事訴訟書狀（司法院標準）',
    shortDesc: '支援民事起訴、答辯、聲請、陳報、上訴狀等，內建司法院法定必備記載事項與格式。',
    badge: '官方整合',
    toolType: 'generator',
    icon: Scale,
    legalBasis: '民事訴訟法第116條'
  },
  {
    id: 'JUDICIAL_CRIMINAL_TEMPLATE',
    categoryGroup: 'OFFICIAL_TEMPLATES',
    categoryLabel: '司法院官方範本',
    name: '刑事訴訟書狀（司法院標準）',
    shortDesc: '支援刑事告訴、答辯、附帶民事起訴、聲請調查證據等格式，嚴格遵守司法狀紙要點。',
    badge: '官方整合',
    toolType: 'generator',
    icon: ShieldCheck,
    legalBasis: '刑事訴訟法、司法狀紙要點'
  },
  {
    id: 'JUDICIAL_ADMIN_TEMPLATE',
    categoryGroup: 'OFFICIAL_TEMPLATES',
    categoryLabel: '司法院官方範本',
    name: '行政訴訟書狀（司法院標準）',
    shortDesc: '支援撤銷訴訟、課予義務訴訟、確認訴訟及交通裁決事件起訴狀等行政訴訟法定格式。',
    badge: '官方整合',
    toolType: 'generator',
    icon: FileCheck2,
    legalBasis: '行政訴訟法第57條'
  },
  {
    id: 'JUDICIAL_FAMILY_TEMPLATE',
    categoryGroup: 'OFFICIAL_TEMPLATES',
    categoryLabel: '司法院官方範本',
    name: '家事事件書狀（司法院標準）',
    shortDesc: '支援保護令聲請、未成年子女親權、扶養費、拋棄繼承等家事聲請狀法定標準格式。',
    badge: '官方整合',
    toolType: 'generator',
    icon: Users,
    legalBasis: '家事事件法'
  },
  {
    id: 'JUDICIAL_EXECUTION_TEMPLATE',
    categoryGroup: 'OFFICIAL_TEMPLATES',
    categoryLabel: '司法院官方範本',
    name: '強制執行書狀（司法院標準）',
    shortDesc: '支援聲請強制執行、查封、拍賣、聲明異議、參與分配等強執法定聲明格式。',
    badge: '官方整合',
    toolType: 'generator',
    icon: Gavel,
    legalBasis: '強制執行法'
  },

  // ==========================================
  // 分類一：家事 · 離婚｜親權｜財產 (11項)
  // ==========================================
  {
    id: 'CHILD_CUSTODY_ASSESSMENT',
    categoryGroup: 'FAMILY',
    categoryLabel: '家事 · 離婚｜親權｜財產',
    name: '親權（監護權）評估工具',
    shortDesc: '依子女最佳利益原則，量化評估主要照顧者、現狀維持、善意父母與親職能力。',
    badge: '新 · 評估',
    toolType: 'assessment',
    icon: Users,
    legalBasis: '民法第1055條之1',
    isNew: true
  },
  {
    id: 'INHERITANCE_PORTION_CALCULATOR',
    categoryGroup: 'FAMILY',
    categoryLabel: '家事 · 離婚｜親權｜財產',
    name: '遺產分配與特留分試算器',
    shortDesc: '輸入遺產總額與繼承人組成，試算法定應繼分、特留分扣減比例與最低保障金額。',
    badge: '新 · 試算',
    toolType: 'calculator',
    icon: Landmark,
    legalBasis: '民法第1138條、第1144條、第1223條',
    isNew: true
  },
  {
    id: 'CHILD_SUPPORT_CALCULATOR',
    categoryGroup: 'FAMILY',
    categoryLabel: '家事 · 離婚｜親權｜財產',
    name: '未成年子女扶養費試算',
    shortDesc: '依主計總處各縣市每人月均消費支出與雙方經濟能力比例，精算扶養費與約定條款。',
    badge: '試算 · 說明',
    toolType: 'calculator',
    icon: Calculator,
    legalBasis: '民法第1116條之2、第1119條'
  },
  {
    id: 'RESIDUAL_PROPERTY_CALCULATOR',
    categoryGroup: 'FAMILY',
    categoryLabel: '家事 · 離婚｜親權｜財產',
    name: '夫妻剩餘財產分配試算',
    shortDesc: '結算離婚或死亡時婚後財產扣除負債之差額，自動排除繼承、受贈與慰撫金。',
    badge: '試算 · 說明',
    toolType: 'calculator',
    icon: DollarSign,
    legalBasis: '民法第1030條之1'
  },
  {
    id: 'PROPERTY_VALUATION_ESTIMATOR',
    categoryGroup: 'FAMILY',
    categoryLabel: '家事 · 離婚｜親權｜財產',
    name: '不動產估價與貸款概算器',
    shortDesc: '依區域實價行情、坪數、屋齡與貸款條件，概估房產市值、淨值與可貸額度。',
    badge: '新 · 評估',
    toolType: 'calculator',
    icon: Home,
    legalBasis: '土地法、不動產估價技術規則',
    isNew: true
  },
  {
    id: 'DIVORCE_AGREEMENT',
    categoryGroup: 'FAMILY',
    categoryLabel: '家事 · 離婚｜親權｜財產',
    name: '兩願離婚協議書產生器',
    shortDesc: '填入雙方監護權、探視交往方案、扶養費加速條款與剩餘財產分配協議。',
    badge: '文書產生',
    toolType: 'generator',
    icon: FileSignature,
    legalBasis: '民法第1050條'
  },
  {
    id: 'SELF_WRITTEN_WILL',
    categoryGroup: 'FAMILY',
    categoryLabel: '家事 · 離婚｜親權｜財產',
    name: '自書遺囑產生器',
    shortDesc: '符合民法§1190法定5要件（自書全文、記年/月/日、親自簽名），防範特留分爭議。',
    badge: '法定遺囑',
    toolType: 'generator',
    icon: FileText,
    legalBasis: '民法第1190條'
  },
  {
    id: 'INHERITANCE_CALCULATOR',
    categoryGroup: 'FAMILY',
    categoryLabel: '家事 · 離婚｜親權｜財產',
    name: '繼承系統表產生器',
    shortDesc: '產製民事法院與地政事務所標準格式之親等繼承系統表與應繼分名冊。',
    badge: '系統表',
    toolType: 'generator',
    icon: FileSpreadsheet,
    legalBasis: '民法第1138條至第1140條'
  },
  {
    id: 'DIVORCE_PROCEDURE_ASSESSMENT',
    categoryGroup: 'FAMILY',
    categoryLabel: '家事 · 離婚｜親權｜財產',
    name: '離婚程序評估器',
    shortDesc: '檢視符合協議離婚、法院家事調解或訴訟裁判離婚（民法第1052條各款重大事由）。',
    badge: '流程評估',
    toolType: 'assessment',
    icon: Scale,
    legalBasis: '民法第1052條、家事事件法'
  },
  {
    id: 'VISITATION_PLAN_GENERATOR',
    categoryGroup: 'FAMILY',
    categoryLabel: '家事 · 離婚｜親權｜財產',
    name: '探視交往方案產生器',
    shortDesc: '規劃平日隔週週末、寒暑假、農曆春節與重要節日之未成年子女會面交往條款。',
    badge: '條款方案',
    toolType: 'generator',
    icon: HeartHandshake,
    legalBasis: '民法第1055條第5項'
  },
  {
    id: 'SPOUSAL_RIGHT_INFRINGEMENT',
    categoryGroup: 'FAMILY',
    categoryLabel: '家事 · 離婚｜親權｜財產',
    name: '侵害配偶權與外遇求償評估器',
    shortDesc: '檢核侵害身分法益情節重大事證，試算連帶精神慰撫金並產製民事起訴狀。',
    badge: '求償評估',
    toolType: 'generator',
    icon: Heart,
    legalBasis: '民法第184條、第195條第3項'
  },

  // ==========================================
  // 分類二：討債 · 金錢糾紛 (6項)
  // ==========================================
  {
    id: 'DEMAND_LETTER_DEBT',
    categoryGroup: 'DEBT',
    categoryLabel: '討債 · 金錢糾紛',
    name: '借款催告存證信函產生器',
    shortDesc: '限期清償催告、約定利息核算，依法中斷消滅時效（郵局郵政標準存證格式）。',
    badge: '存證催告',
    toolType: 'generator',
    icon: Mail,
    legalBasis: '民法第478條、第129條'
  },
  {
    id: 'IOU_PROMISSORY_NOTE_GENERATOR',
    categoryGroup: 'DEBT',
    categoryLabel: '討債 · 金錢糾紛',
    name: '借據／本票 線上產生器',
    shortDesc: '含借據與本票法定應記載事項（受款人、發票日、到期日、免除作成拒絕證書）。',
    badge: '契約票據',
    toolType: 'generator',
    icon: FileSignature,
    legalBasis: '票據法第120條、民法第474條'
  },
  {
    id: 'PAYMENT_ORDER_PETITION',
    categoryGroup: 'DEBT',
    categoryLabel: '討債 · 金錢糾紛',
    name: '支付命令聲請狀產生器',
    shortDesc: '規費僅 500 元，20 日內債務人未異議即獲確定執行名義，可直接查封存款房產。',
    badge: '督促程序',
    toolType: 'generator',
    icon: Gavel,
    legalBasis: '民事訴訟法第508條'
  },
  {
    id: 'CIVIL_COMPLAINT_GENERAL',
    categoryGroup: 'DEBT',
    categoryLabel: '討債 · 金錢糾紛',
    name: '民事起訴狀線上產生器',
    shortDesc: '包含訴之聲明、訴訟標的金額、事實及理由、法定借款利息與假執行宣告。',
    badge: '法院起訴',
    toolType: 'generator',
    icon: Scale,
    legalBasis: '民事訴訟法第244條'
  },
  {
    id: 'COURT_FEE_CALCULATOR',
    categoryGroup: 'DEBT',
    categoryLabel: '討債 · 金錢糾紛',
    name: '民事裁判費線上試算',
    shortDesc: '依民訴§77-13累進費率，試算第一審起訴、二三審上訴與支付命令應納規費。',
    badge: '規費試算',
    toolType: 'calculator',
    icon: Calculator,
    legalBasis: '民事訴訟法第77條之13、第77條之16'
  },
  {
    id: 'DEBT_COLLECTION_SELECTOR',
    categoryGroup: 'DEBT',
    categoryLabel: '討債 · 金錢糾紛',
    name: '債權催收程序選擇器',
    shortDesc: '分析存證信函、支付命令、本票裁定、假扣押或民事起訴之成本時效與最佳路徑。',
    badge: '策略選擇',
    toolType: 'assessment',
    icon: ShieldCheck,
    legalBasis: '民事訴訟法、強制執行法'
  },

  // ==========================================
  // 分類三：車禍 · 交通事故 (4項)
  // ==========================================
  {
    id: 'TRAFFIC_COMPENSATION_CALCULATOR',
    categoryGroup: 'TRAFFIC',
    categoryLabel: '車禍 · 交通事故',
    name: '車禍理賠線上試算',
    shortDesc: '試算醫藥、看護、工作損失、慰撫金與零件折舊，扣除肇責比例產出賠償明細。',
    badge: '理賠試算',
    toolType: 'calculator',
    icon: Calculator,
    legalBasis: '民法第184條、第193條、第217條'
  },
  {
    id: 'TRAFFIC_SETTLEMENT_GENERATOR',
    categoryGroup: 'TRAFFIC',
    categoryLabel: '車禍 · 交通事故',
    name: '交通事故和解書產生器',
    shortDesc: '約定賠償分期付款、拋棄其餘民事請求權、撤回刑事過失傷害告訴之合法和解書。',
    badge: '和解協議',
    toolType: 'generator',
    icon: HeartHandshake,
    legalBasis: '民法第736條、刑事訴訟法第238條'
  },
  {
    id: 'TRAFFIC_PROCEDURE_ASSESSMENT',
    categoryGroup: 'TRAFFIC',
    categoryLabel: '車禍 · 交通事故',
    name: '車禍處理程序評估器',
    shortDesc: '掌握報警做筆錄、初判表（30天）、車鑑會鑑定、6個月過失傷害告訴時效之流程。',
    badge: '流程指引',
    toolType: 'assessment',
    icon: AlertCircle,
    legalBasis: '道路交通事故處理辦法、刑訴§237'
  },
  {
    id: 'VEHICLE_VALUATION_ESTIMATOR',
    categoryGroup: 'TRAFFIC',
    categoryLabel: '車禍 · 交通事故',
    name: '汽車動產估價與零件折舊計算器',
    shortDesc: '依出廠車齡與行政院固定資產耐用年數表，試算維修零件折舊與車損現值殘值。',
    badge: '新 · 折舊估算',
    toolType: 'calculator',
    icon: Car,
    legalBasis: '固定資產耐用年數表、民法第196條',
    isNew: true
  },

  // ==========================================
  // 分類四：勞資 · 刑事 · 契約 (6項)
  // ==========================================
  {
    id: 'SEVERANCE_PAY_CALCULATOR',
    categoryGroup: 'LABOR_CRIMINAL_CONTRACT',
    categoryLabel: '勞資 · 刑事 · 契約',
    name: '資遣費線上試算',
    shortDesc: '計算勞退新制資遣費基數（年資×0.5）、預告期間工資與特別休假未休折現。',
    badge: '勞動試算',
    toolType: 'calculator',
    icon: Calculator,
    legalBasis: '勞工退休金條例第12條、勞動基準法第16條'
  },
  {
    id: 'CRIMINAL_COMPLAINT_TRAFFIC',
    categoryGroup: 'LABOR_CRIMINAL_CONTRACT',
    categoryLabel: '勞資 · 刑事 · 契約',
    name: '刑事告訴狀線上產生器',
    shortDesc: '車禍過失傷害、詐欺取財、妨害名譽、恐嚇罪刑事告訴狀，自動注入時效檢核。',
    badge: '刑事告訴',
    toolType: 'generator',
    icon: Scale,
    legalBasis: '刑事訴訟法第242條、刑法各分則'
  },
  {
    id: 'DEMAND_LETTER_GENERAL',
    categoryGroup: 'LABOR_CRIMINAL_CONTRACT',
    categoryLabel: '勞資 · 刑事 · 契約',
    name: '存證信函產生器（通用版）',
    shortDesc: '租金欠繳終止租約、工程瑕疵限期修補、勞資爭議終止契約之標準存證信函。',
    badge: '存證信函',
    toolType: 'generator',
    icon: Mail,
    legalBasis: '郵政法第31條、民法催告規定'
  },
  {
    id: 'RESIDENTIAL_LEASE_CONTRACT',
    categoryGroup: 'LABOR_CRIMINAL_CONTRACT',
    categoryLabel: '勞資 · 刑事 · 契約',
    name: '住宅租賃契約書線上產生器',
    shortDesc: '嚴格符合內政部租賃定型化契約應記載及不得記載事項（押金上限2月、不得禁遷戶籍）。',
    badge: '法定租約',
    toolType: 'generator',
    icon: Home,
    legalBasis: '租賃住宅市場發展及管理條例'
  },
  {
    id: 'USED_CAR_SALE_CONTRACT',
    categoryGroup: 'LABOR_CRIMINAL_CONTRACT',
    categoryLabel: '勞資 · 刑事 · 契約',
    name: '中古汽車買賣契約產生器',
    shortDesc: '明定重大事故、泡水、里程數揭露與現況交車之物之瑕疵擔保責任條款。',
    badge: '買賣契約',
    toolType: 'generator',
    icon: Car,
    legalBasis: '民法第345條、第354條物之瑕疵擔保'
  },
  {
    id: 'STATUTE_LIMITATIONS_CALCULATOR',
    categoryGroup: 'LABOR_CRIMINAL_CONTRACT',
    categoryLabel: '勞資 · 刑事 · 契約',
    name: '追訴期／法律時效計算器',
    shortDesc: '計算民法15年/5年/2年消滅時效，以及刑法80條與刑訴6個月追訴權與告訴期。',
    badge: '時效計算',
    toolType: 'calculator',
    icon: Clock,
    legalBasis: '民法第125條至第127條、刑法第80條'
  },
];

const TOOLBOX_VISIBLE_IDS = new Set([
  'INHERITANCE_CALCULATOR',
  'FORCED_SHARE_CALCULATOR',
  'SELF_WRITTEN_WILL',
  'DIVORCE_AGREEMENT',
  'PAYMENT_ORDER_PETITION',
  'LOAN_AGREEMENT',
  'RESIDENTIAL_LEASE_CONTRACT',
]);

export const TOOLBOX_TOOLS = LEGAL_TOOLS.filter(tool => TOOLBOX_VISIBLE_IDS.has(tool.id));
