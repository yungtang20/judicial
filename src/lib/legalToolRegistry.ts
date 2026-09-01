import { 
  FolderLock, 
  FileText, 
  Scale, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Calculator, 
  HeartHandshake, 
  Mail, 
  CreditCard, 
  UserPlus, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Sparkles, 
  Info, 
  BookOpen, 
  SlidersHorizontal,
  FileCheck2,
  Calendar,
  Layers,
  ShieldAlert,
  Search,
  Building,
  Briefcase,
  Home,
  Heart,
  FileSignature,
  FileSpreadsheet,
  Gavel,
  BadgeAlert,
  Printer
} from 'lucide-react'

export interface ToolDefinition {
  id: string;
  categoryGroup: 'CRIMINAL' | 'FAMILY' | 'ELDERLY' | 'DEBT_NOTE' | 'DEMAND_LETTER' | 'EXECUTION' | 'CONTRACT_REALESTATE';
  categoryLabel: string;
  name: string;
  shortDesc: string;
  badge: string;
  icon: any;
  legalBasis: string;
}

export const LEGAL_TOOLS: ToolDefinition[] = [
  // Group 1: 刑事告訴與附帶民事 (7)
  {
    id: 'CRIMINAL_COMPLAINT_TRAFFIC',
    categoryGroup: 'CRIMINAL',
    categoryLabel: '刑事告訴與訴訟',
    name: '車禍過失傷害刑事告訴狀',
    shortDesc: '刑法§284 + 6個月法定時效防呆，載明人車傷亡與診斷證明',
    badge: '車禍事故',
    icon: Scale,
    legalBasis: '刑法第284條、刑事訴訟法第237條'
  },
  {
    id: 'CRIMINAL_COMPLAINT_SEXUAL_ASSAULT',
    categoryGroup: 'CRIMINAL',
    categoryLabel: '刑事告訴與訴訟',
    name: '妨害性自主 / 強制性交刑事告訴狀',
    shortDesc: '刑法§221非告訴乃論公訴罪（男女平等受保障），載明違反意願手法與驗傷採證',
    badge: '妨害性自主 / 非告訴乃論',
    icon: ShieldAlert,
    legalBasis: '刑法第221條、第229條之1、性侵害犯罪防治法'
  },
  {
    id: 'DOMESTIC_VIOLENCE_PROTECTION_ORDER',
    categoryGroup: 'CRIMINAL',
    categoryLabel: '刑事告訴與訴訟',
    name: '親密關係伴侶 / 家暴保護令聲請狀',
    shortDesc: '家暴法§63-1未同居親密伴侶/恐怖情人，聲請遠離100公尺與禁止騷擾命令',
    badge: '恐怖情人 / 保護令',
    icon: HeartHandshake,
    legalBasis: '家庭暴力防治法第63條之1、第14條'
  },
  {
    id: 'CIVIL_TORT_SEXUAL_ASSAULT',
    categoryGroup: 'CRIMINAL',
    categoryLabel: '刑事告訴與訴訟',
    name: '侵害性自主權損害賠償民事起訴狀',
    shortDesc: '民法§184/§195侵害人格權情節重大，請求非財產上精神慰撫金與心理諮商醫療費',
    badge: '精神慰撫金',
    icon: Scale,
    legalBasis: '民法第184條、第195條第1項'
  },
  {
    id: 'CRIMINAL_COMPLAINT_FRAUD',
    categoryGroup: 'CRIMINAL',
    categoryLabel: '刑事告訴與訴訟',
    name: '網路詐騙 / 投資詐欺刑事告訴狀',
    shortDesc: '刑法§339/§339-4加重詐欺，鎖定人頭受款帳戶與金流截圖',
    badge: '反詐騙金流',
    icon: ShieldAlert,
    legalBasis: '刑法第339條、第339條之4'
  },
  {
    id: 'CRIMINAL_COMPLAINT_DEFAMATION',
    categoryGroup: 'CRIMINAL',
    categoryLabel: '刑事告訴與訴訟',
    name: '妨害名譽 / 公然侮辱刑事告訴狀',
    shortDesc: '社群網路/公開群組辱罵抹黑，提告刑法§309公然侮辱與§310誹謗',
    badge: '網路言論',
    icon: BadgeAlert,
    legalBasis: '刑法第309條、第310條'
  },
  {
    id: 'CRIMINAL_COMPLAINT_THEFT',
    categoryGroup: 'CRIMINAL',
    categoryLabel: '刑事告訴與訴訟',
    name: '竊盜罪 / 侵占罪 / 伴侶親屬間竊盜刑事告訴狀',
    shortDesc: '刑法§320竊盜、§324親屬同居竊盜6個月時效防呆、§335侵占，載明失竊物品清單與金流截圖',
    badge: '竊盜侵占 / 伴侶親屬',
    icon: ShieldAlert,
    legalBasis: '刑法第320條、第324條、第335條、民法§767'
  },
  {
    id: 'CRIMINAL_COMPLAINT_INTIMIDATION',
    categoryGroup: 'CRIMINAL',
    categoryLabel: '刑事告訴與訴訟',
    name: '恐嚇危害安全罪 / 強制罪刑事告訴狀',
    shortDesc: '刑法§305恐嚇危安、§304強制罪，載明加害惡害通知言行截圖、錄音與心生畏懼事證',
    badge: '恐嚇威脅',
    icon: ShieldAlert,
    legalBasis: '刑法第305條、第304條'
  },
  {
    id: 'CRIMINAL_COMPLAINT_PRIVACY',
    categoryGroup: 'CRIMINAL',
    categoryLabel: '刑事告訴與訴訟',
    name: '妨害秘密 / 未經同意散布性影像刑事告訴狀',
    shortDesc: '刑法§315-1偷拍竊聽、§319-3散布性私密影像重刑公訴罪，聲請保全扣押與銷毀電磁紀錄',
    badge: '性私密影像 / 偷拍',
    icon: ShieldAlert,
    legalBasis: '刑法第315條之1、第319條之3'
  },
  {
    id: 'CIVIL_TORT_GENERAL',
    categoryGroup: 'CRIMINAL',
    categoryLabel: '刑事告訴與訴訟',
    name: '返還所有物暨侵權損害賠償民事起訴狀',
    shortDesc: '民法§767所有物返還請求權、§184侵權行為、§179不當得利，請求返還被侵奪財物與金錢賠償',
    badge: '返還財物 / 侵權',
    icon: Scale,
    legalBasis: '民法第767條、第184條、第179條'
  },
  {
    id: 'UNIVERSAL_AI_PLEADING',
    categoryGroup: 'CRIMINAL',
    categoryLabel: '刑事告訴與訴訟',
    name: '全能 AI 法律爭議即時診斷與專業書狀產製',
    shortDesc: '自由輸入任意犯罪被害或民事爭議，AI 自動梳理管轄、法條要件、時效防呆並產製專業書狀',
    badge: 'AI 全能診斷',
    icon: Sparkles,
    legalBasis: '我國實體法與程序法分析'
  },
  {
    id: 'CRIMINAL_SUPPLEMENTARY_CIVIL',
    categoryGroup: 'CRIMINAL',
    categoryLabel: '刑事告訴與訴訟',
    name: '刑事附帶民事訴訟起訴狀',
    shortDesc: '刑事庭審理中提出（免徵裁判費），請求醫藥費、工損與慰撫金',
    badge: '免裁判費',
    icon: Gavel,
    legalBasis: '刑事訴訟法第487條、民法§184/§195'
  },

  // Group 2: 家事、繼承與遺囑 (5)
  {
    id: 'INHERITANCE_CALCULATOR',
    categoryGroup: 'FAMILY',
    categoryLabel: '家事與繼承財產',
    name: '法定繼承系統表與應繼分試算器',
    shortDesc: '依民法§1138法定順位及§1144配偶比例，精算每人得受遺產額',
    badge: '法定繼承',
    icon: Calculator,
    legalBasis: '民法第1138條、第1144條'
  },
  {
    id: 'FORCED_SHARE_CALCULATOR',
    categoryGroup: 'FAMILY',
    categoryLabel: '家事與繼承財產',
    name: '遺產特留分扣減權試算與分配表',
    shortDesc: '民法§1223特留分保全底線試算，防範不公平遺囑與扣減權',
    badge: '特留分保全',
    icon: FileSpreadsheet,
    legalBasis: '民法第1223條、第1225條'
  },
  {
    id: 'SELF_WRITTEN_WILL',
    categoryGroup: 'FAMILY',
    categoryLabel: '家事與繼承財產',
    name: '自書遺囑合規產生器（全篇親筆）',
    shortDesc: '民法§1190要件防呆，提示全篇親筆手寫、特留分條款與執行人指定',
    badge: '自書遺囑',
    icon: FileSignature,
    legalBasis: '民法第1190條'
  },
  {
    id: 'WAIVER_OF_INHERITANCE',
    categoryGroup: 'FAMILY',
    categoryLabel: '家事與繼承財產',
    name: '民事拋棄繼承聲請狀',
    shortDesc: '知悉得繼承起3個月內向法院具狀聲請，附載印鑑證明與通知回執',
    badge: '拋棄繼承',
    icon: FileText,
    legalBasis: '民法第1174條、家事事件法第132條'
  },
  {
    id: 'DIVORCE_AGREEMENT',
    categoryGroup: 'FAMILY',
    categoryLabel: '家事與繼承財產',
    name: '兩願離婚協議書合規範本',
    shortDesc: '民法§1050雙證人要件，完整約定監護權、探視、扶養費與財產分配',
    badge: '協議離婚',
    icon: HeartHandshake,
    legalBasis: '民法第1050條、第1030條之1'
  },

  // Group 3: 高齡長輩防護與安養 (3)
  {
    id: 'GUARDIANSHIP_PETITION',
    categoryGroup: 'ELDERLY',
    categoryLabel: '高齡失智防護',
    name: '民事監護宣告聲請狀（重度失智）',
    shortDesc: '完全喪失意思能力（CDR>=2），向家事法庭聲請監護與財產清冊人',
    badge: '監護宣告',
    icon: ShieldCheck,
    legalBasis: '民法第14條、家事事件法第164條'
  },
  {
    id: 'ASSISTANCE_PETITION',
    categoryGroup: 'ELDERLY',
    categoryLabel: '高齡失智防護',
    name: '民事輔助宣告聲請狀（輕度失智）',
    shortDesc: '意思能力顯有不足（CDR 0.5~1），建立重大財產處分同意權防火牆',
    badge: '輔助宣告',
    icon: ShieldAlert,
    legalBasis: '民法第15條之1、第15條之2'
  },
  {
    id: 'CONTRACTUAL_GUARDIANSHIP',
    categoryGroup: 'ELDERLY',
    categoryLabel: '高齡失智防護',
    name: '意定監護契約合規範本',
    shortDesc: '意識清楚時自主指定監護人，經公證人作成公證書並通報法院',
    badge: '意定監護',
    icon: FileSignature,
    legalBasis: '民法第1113條之2'
  },

  // Group 4: 債權保全、借據與票據非訟 (4)
  {
    id: 'PROMISSORY_NOTE_RULING',
    categoryGroup: 'DEBT_NOTE',
    categoryLabel: '債權與票據非訟',
    name: '本票裁定強制執行聲請狀',
    shortDesc: '票據法§123非訟程序，跳過冗長訴訟快速取得法院執行名義',
    badge: '本票裁定',
    icon: CreditCard,
    legalBasis: '票據法第123條、非訟事件法第194條'
  },
  {
    id: 'PAYMENT_ORDER_PETITION',
    categoryGroup: 'DEBT_NOTE',
    categoryLabel: '債權與票據非訟',
    name: '民事支付命令聲請狀',
    shortDesc: '裁判費僅新臺幣500元，督促程序請求金錢給付快速確定',
    badge: '支付命令',
    icon: FileText,
    legalBasis: '民事訴訟法第508條'
  },
  {
    id: 'LOAN_AGREEMENT',
    categoryGroup: 'DEBT_NOTE',
    categoryLabel: '債權與票據非訟',
    name: '消費借貸借據與還款協議書',
    shortDesc: '民法§474要物契約，內建法定年利率最高16%防呆與違約金條款',
    badge: '借據契約',
    icon: FileCheck2,
    legalBasis: '民法第474條、第205條'
  },
  {
    id: 'INTEREST_CALCULATOR',
    categoryGroup: 'DEBT_NOTE',
    categoryLabel: '債權與票據非訟',
    name: '法定週年利率與違約金速算器',
    shortDesc: '民法§203法定利率5%與§205最高利率16%，單利試算與禁止複利檢驗',
    badge: '利息試算',
    icon: Calculator,
    legalBasis: '民法第203條、第205條、第207條'
  },

  // Group 5: 郵局存證信函與催告 (4)
  {
    id: 'DEMAND_LETTER_DEBT',
    categoryGroup: 'DEMAND_LETTER',
    categoryLabel: '存證信函與催告',
    name: '借款清償催告存證信函',
    shortDesc: '郵局標準格式，催告限期清償並發生中斷15年消滅時效之效力',
    badge: '借款催告',
    icon: Mail,
    legalBasis: '民法第129條、第130條'
  },
  {
    id: 'DEMAND_LETTER_RENT_DEFAULT',
    categoryGroup: 'DEMAND_LETTER',
    categoryLabel: '存證信函與催告',
    name: '積欠租金催告暨終止租約存證信函',
    shortDesc: '民法§440欠租達2個月扣抵押金後仍有欠繳，定相當期限催告終止',
    badge: '租金欠繳',
    icon: Mail,
    legalBasis: '民法第440條第2項'
  },
  {
    id: 'DEMAND_LETTER_DEFECT',
    categoryGroup: 'DEMAND_LETTER',
    categoryLabel: '存證信函與催告',
    name: '工程瑕疵/買賣瑕疵修補催告存證信函',
    shortDesc: '民法§493定作人請求承攬人限期修補，否則自行雇工修補請求償還',
    badge: '工程裝修瑕疵',
    icon: Mail,
    legalBasis: '民法第492條、第493條'
  },
  {
    id: 'DEMAND_LETTER_LABOR',
    categoryGroup: 'DEMAND_LETTER',
    categoryLabel: '存證信函與催告',
    name: '勞工終止契約暨請求資遣費存證信函',
    shortDesc: '雇主未給付工資/加班費，勞工依勞基法§14不經預告終止並請求資遣費',
    badge: '勞基法權益',
    icon: Briefcase,
    legalBasis: '勞動基準法第14條、勞工退休金條例§12'
  },

  // Group 6: 民事強制執行與保全 (3)
  {
    id: 'EXECUTION_SALARY_ATTACHMENT',
    categoryGroup: 'EXECUTION',
    categoryLabel: '強制執行與保全',
    name: '強制執行聲請狀 - 扣押薪資1/3',
    shortDesc: '強執法§115向法院聲請扣押債務人任職公司每月薪資1/3及移轉命令',
    badge: '扣薪1/3',
    icon: Building,
    legalBasis: '強制執行法第115條、第122條'
  },
  {
    id: 'EXECUTION_BANK_REAL_ESTATE',
    categoryGroup: 'EXECUTION',
    categoryLabel: '強制執行與保全',
    name: '強制執行聲請狀 - 查封存款與不動產',
    shortDesc: '檢附執行名義與國稅局財產清單，扣押銀行存款及囑託地政查封拍賣',
    badge: '查封拍賣',
    icon: Layers,
    legalBasis: '強制執行法第115條、第75條'
  },
  {
    id: 'PROVISIONAL_ATTACHMENT',
    categoryGroup: 'EXECUTION',
    categoryLabel: '強制執行與保全',
    name: '民事假扣押裁定聲請狀',
    shortDesc: '民訴§522釋明債務人脫產逃匿之虞，願供擔保請准假扣押保全金錢請求',
    badge: '假扣押保全',
    icon: ShieldCheck,
    legalBasis: '民事訴訟法第522條、第526條'
  },

  // Group 7: 不動產租賃與日常民事 (2)
  {
    id: 'RESIDENTIAL_LEASE_CONTRACT',
    categoryGroup: 'CONTRACT_REALESTATE',
    categoryLabel: '契約與生活侵權',
    name: '住宅租賃定型化契約範本（法定合規）',
    shortDesc: '符合租賃住宅條例與內政部應記載事項（押金上限2月、不得禁設籍）',
    badge: '法定租約',
    icon: Home,
    legalBasis: '租賃住宅市場發展及管理條例、土地法§99'
  },
  {
    id: 'SPOUSAL_RIGHT_INFRINGEMENT',
    categoryGroup: 'CONTRACT_REALESTATE',
    categoryLabel: '契約與生活侵權',
    name: '侵害配偶權民事起訴狀',
    shortDesc: '民法§184/§195侵害身分法益情節重大，請求配偶與第三者連帶精神慰撫金',
    badge: '配偶權損賠',
    icon: Heart,
    legalBasis: '民法第184條、第185條、第195條'
  }
];

