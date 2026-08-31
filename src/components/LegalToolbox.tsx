import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { LegalToolboxResult } from '../types';

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
    legalBasis: '我國實體法與程序法全方位核實'
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

export interface LegalToolboxProps {
  initialToolId?: string;
}

export const LegalToolbox: React.FC<LegalToolboxProps> = ({ initialToolId }) => {
  // Active tool ID (default to traffic accident complaint or passed prop)
  const [activeToolId, setActiveToolId] = useState<string>(initialToolId || 'CRIMINAL_COMPLAINT_TRAFFIC');
  
  React.useEffect(() => {
    if (initialToolId) {
      setActiveToolId(initialToolId);
    }
  }, [initialToolId]);
  
  // Category Group Filter
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form input fields (consolidated reactive state)
  const [formInputs, setFormInputs] = useState<Record<string, any>>({
    // Common personal info
    complainantName: '陳怡君',
    complainantPhone: '0912-345-678',
    complainantAddress: '臺北市大安區信義路三段120號',
    accusedName: '黃志強',
    accusedAddress: '新北市板橋區文化路二段88號',
    prosecutorOffice: '臺灣臺北地方檢察署',
    courtName: '臺灣臺北地方法院',
    incidentDate: '113年3月12日下午2時30分',
    incidentLocation: '臺北市中正區重慶南路與衡陽路交岔路口',
    incidentDetails: '被告駕駛自小客車行經路口左轉未依規定減速禮讓，撞擊告訴人騎乘之機車，致告訴人左側脛骨骨折送醫救治。',
    
    // Fraud
    fraudAmount: '650,000',
    bankCode: '013 國泰世華商業銀行',
    bankAccount: '012-3456-7890-1234',

    // Defamation
    insultWords: '公然於FB粉絲專頁留言誹謗侮辱，指控告訴人私吞公款及謾罵粗鄙字眼',

    // Supplementary civil
    caseNo: '113年度交簡字第888號',
    caseDivision: '仁股',
    claimTotalAmount: '680,000',
    medicalExpense: '80,000',
    workLoss: '200,000',
    solatium: '400,000',

    // Inheritance
    deceasedName: '林老先生',
    totalEstate: 18000000,
    hasSpouse: true,
    childrenCount: 3,

    // Will
    testatorName: '王大同',
    birthDate: '48年6月15日',
    idNo: 'A123456789',
    realEstateAddress: '臺北市松山區敦化北路150號5樓之房屋及坐落基地持分',
    realEstateBeneficiary: '長子 王小明',
    bankName: '臺灣銀行城中分行全部活期與定存存款',
    executorName: '李專業律師',

    // Waiver
    deathDate: '113年1月15日',
    knowDate: '113年1月20日',
    deceasedAddress: '臺北市大安區',
    petitionerName: '陳文彬',
    petitionerPhone: '0988-123-456',
    petitionerAddress: '臺北市士林區中山北路五段200號',

    // Divorce
    husbandName: '張國豪',
    husbandId: 'A123456789',
    wifeName: '林雅婷',
    wifeId: 'B223456789',
    childName: '長子 張小寶',
    custodyParent: '女方 林雅婷',
    childSupport: '25,000',
    payDay: '5',

    // Guardianship & Assistance
    wardName: '陳老太太（母）',
    wardBirth: '28年11月20日',
    wardIdNo: 'A200000000',
    relationship: '長子',
    cdrScore: '2.0（中度阿茲海默失智）',
    supervisorName: '次女 陳雅惠',
    principalName: '趙大同',
    principalId: 'A112233445',
    guardianName: '趙小明（長子）',
    guardianId: 'A199887766',

    // Debt & Note
    creditorName: '趙志偉',
    debtorName: '孫德勝',
    debtAmount: '800,000',
    noteDate: '112年8月1日',
    noteDueDate: '113年2月1日',
    paymentPlace: '臺北市',
    interestRate: '6',
    days: 365,
    loanDate: '112年5月10日',
    dueDate: '113年2月15日',

    // Demand Letter
    senderName: '張國華',
    senderAddress: '臺北市中山區南京東路二段50號',
    recipientName: '大明工程行（負責人：林大明）',
    recipientAddress: '新北市中和區中正路300號',
    amount: '600,000',
    monthlyRent: '25,000',
    defaultMonths: '2',
    leaseAddress: '臺北市大安區和平東路二段某號某樓',
    startDefaultMonth: '113年1月',
    hireDate: '110年3月1日',
    salary: '48,000',
    severancePay: '120,000',
    violationPeriod: '112年10月起迄今',

    // Execution
    employerName: '宏達科技有限公司',
    employerAddress: '新北市中和區遠東世紀廣場',
    titleCaseNo: '112年度司促字第12345號支付命令及確定證明書',
    claimAmount: '1,000,000',

    // Real estate lease
    landlordName: '王大同',
    landlordId: 'A123456789',
    tenantName: '李美華',
    tenantId: 'B223456789',
    rentalAddress: '臺北市中山區新生北路一段100號3樓',
    depositAmount: '50,000',
    startDate: '113年3月1日',
    endDate: '114年2月28日',

    // Spousal right & DV & Sexual assault
    plaintiffName: '王佩君',
    plaintiffAddress: '臺北市大安區敦化南路二段',
    plaintiffPhone: '0912-345-678',
    defendant1Name: '林大華（配偶）',
    defendant2Name: '張小美（第三者）',
    marriageDate: '106年6月18日',
    infringementStart: '112年9月間',
    injuryDetails: '身體擦挫傷、心理創傷與急性壓力障礙',
    evidenceList: '醫院驗傷診斷書、通訊軟體自承對話截圖、錄音檔',
    requestedRelief: '命相對人遠離住居所與工作地100公尺、禁止騷擾與通訊'
  });

  const handleInputChange = (field: string, value: any) => {
    setFormInputs(prev => ({ ...prev, [field]: value }));
  };

  // Filtered tools
  const filteredTools = useMemo(() => {
    return LEGAL_TOOLS.filter(tool => {
      const matchGroup = selectedGroup === 'ALL' || tool.categoryGroup === selectedGroup;
      const matchQuery = !searchQuery.trim() || 
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.badge.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.legalBasis.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGroup && matchQuery;
    });
  }, [selectedGroup, searchQuery]);

  const currentTool = useMemo(() => {
    return LEGAL_TOOLS.find(t => t.id === activeToolId) || LEGAL_TOOLS[0];
  }, [activeToolId]);

  // Results & Loading
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LegalToolboxResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate Document
  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.toolboxGenerate({
        toolCategory: activeToolId,
        params: formInputs
      });
      setResult(res);
    } catch (err) {
      console.error('Toolbox generate error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.documentText) return;
    navigator.clipboard.writeText(result.documentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result?.documentText) return;
    const blob = new Blob([result.documentText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.title || currentTool.name}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!result?.documentText) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${result.title || '法律文書'}</title>
            <style>
              body { font-family: "Microsoft JhengHei", "PingFang TC", sans-serif; padding: 40px; line-height: 1.8; color: #111; }
              pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
            </style>
          </head>
          <body>
            <pre>${result.documentText}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto" id="legal-toolbox-root">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <FolderLock className="w-80 h-80 text-blue-400" />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
              <FolderLock className="w-3.5 h-3.5" /> {LEGAL_TOOLS.length} 合 1 全方位實用法務工具總匯
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 引用掃描結果（不等同官方核實）
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
              收錄刑事 / 家事繼承 / 高齡監護 / 票據借貸 / 存證信函 / 強制執行 / 租賃侵權
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            全方位實用法務工具箱（Complete Legal Tools Hub）
          </h1>

          <p className="text-slate-300 text-sm max-w-4xl leading-relaxed">
            完整收錄臺灣司法實務 <strong>{LEGAL_TOOLS.length} 項必備非訟、訴狀、保護令、存證信函與試算工具</strong>。每項工具均內建法定要件防呆機制，並串接司法院公開法規庫實時交叉檢驗。
          </p>
        </div>

        {/* Search and Category Filter Tabs */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {[
              { id: 'ALL', label: `全部工具 (${LEGAL_TOOLS.length})` },
              { id: 'CRIMINAL', label: '刑事告訴/保護令 (7)' },
              { id: 'FAMILY', label: '家事繼承 (5)' },
              { id: 'ELDERLY', label: '高齡監護 (3)' },
              { id: 'DEBT_NOTE', label: '債權票據 (4)' },
              { id: 'DEMAND_LETTER', label: '存證信函 (4)' },
              { id: 'EXECUTION', label: '強制執行 (3)' },
              { id: 'CONTRACT_REALESTATE', label: '租賃侵權 (2)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedGroup(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all text-xs ${
                  selectedGroup === tab.id
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`搜尋 ${LEGAL_TOOLS.length} 項工具或法條...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Quick Tool Selector Grid (Horizontal / Multi-column) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {filteredTools.map((tool) => {
          const Icon = tool.icon;
          const isSelected = activeToolId === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => {
                setActiveToolId(tool.id);
                setResult(null); document.getElementById('tool-form-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                isSelected
                  ? 'bg-blue-600/90 border-blue-400 text-white ring-2 ring-blue-400/40 shadow-lg font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/90 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-blue-400'}`} />
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950/60 text-slate-300 border border-slate-700">
                    {tool.badge}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold leading-snug line-clamp-1">{tool.name}</div>
                <div className="text-[10px] opacity-75 line-clamp-1 mt-0.5">{tool.legalBasis}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Split View: Dynamic Config Form (Left) & Document Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Parameter Form */}
        <div id="tool-form-section" className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <div className="text-[11px] text-blue-400 font-semibold flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {currentTool.categoryLabel}
                </div>
                <h2 className="font-bold text-slate-200 text-sm">{currentTool.name}</h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium">
                {currentTool.legalBasis}
              </span>
            </div>

            {/* DYNAMIC FORMS ACCORDING TO SELECTED TOOL */}
            
            {/* 1. Traffic Complaint */}
            {activeToolId === 'CRIMINAL_COMPLAINT_TRAFFIC' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">受文地檢署</label>
                    <input
                      type="text"
                      value={formInputs.prosecutorOffice}
                      onChange={(e) => handleInputChange('prosecutorOffice', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">告訴人姓名</label>
                    <input
                      type="text"
                      value={formInputs.complainantName}
                      onChange={(e) => handleInputChange('complainantName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">告訴人電話</label>
                    <input
                      type="text"
                      value={formInputs.complainantPhone}
                      onChange={(e) => handleInputChange('complainantPhone', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">被告（肇事者）姓名</label>
                    <input
                      type="text"
                      value={formInputs.accusedName}
                      onChange={(e) => handleInputChange('accusedName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">案發時間與交岔路口</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={formInputs.incidentDate}
                      onChange={(e) => handleInputChange('incidentDate', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                    <input
                      type="text"
                      value={formInputs.incidentLocation}
                      onChange={(e) => handleInputChange('incidentLocation', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">車禍肇事情節與傷勢</label>
                  <textarea
                    rows={5}
                    value={formInputs.incidentDetails}
                    onChange={(e) => handleInputChange('incidentDetails', e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* 2. Fraud */}
            {activeToolId === 'CRIMINAL_COMPLAINT_FRAUD' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">受騙被害人姓名</label>
                    <input
                      type="text"
                      value={formInputs.complainantName}
                      onChange={(e) => handleInputChange('complainantName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">受騙總金額（元）</label>
                    <input
                      type="text"
                      value={formInputs.fraudAmount}
                      onChange={(e) => handleInputChange('fraudAmount', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">受款人頭帳戶銀行及帳號</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={formInputs.bankCode}
                      onChange={(e) => handleInputChange('bankCode', e.target.value)}
                      placeholder="銀行名稱/代碼"
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                    <input
                      type="text"
                      value={formInputs.bankAccount}
                      onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                      placeholder="匯款受款帳號"
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">詐騙通訊軟體與假冒手法</label>
                  <input
                    type="text"
                    value={formInputs.accusedName}
                    onChange={(e) => handleInputChange('accusedName', e.target.value)}
                    placeholder="LINE 投資助理 / 假冒網購客服"
                    className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* 3. Defamation */}
            {activeToolId === 'CRIMINAL_COMPLAINT_DEFAMATION' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">被害人（告訴人）</label>
                    <input
                      type="text"
                      value={formInputs.complainantName}
                      onChange={(e) => handleInputChange('complainantName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">被告（網路ID/真實姓名）</label>
                    <input
                      type="text"
                      value={formInputs.accusedName}
                      onChange={(e) => handleInputChange('accusedName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">侮辱言論與公開媒介</label>
                  <textarea
                    rows={5}
                    value={formInputs.insultWords}
                    onChange={(e) => handleInputChange('insultWords', e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* 3.1 Sexual Assault Complaint */}
            {activeToolId === 'CRIMINAL_COMPLAINT_SEXUAL_ASSAULT' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>被害人重要權益防護指引（男女平等受法律保護）</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    1. <strong>非告訴乃論公訴罪</strong>：妨害性自主（刑法§221）為非告訴乃論公訴罪，不受6個月告訴乃論限制，檢警知悉即應主動追訴。<br />
                    2. <strong>72小時醫院驗傷採證</strong>：請儘速至各大醫院急診「一站式性侵害採證」，切勿先行沐浴更衣，以保全DNA生物跡證。<br />
                    3. <strong>113 專線與社工全程陪同</strong>：可要求社工陪同警詢與偵訊，並得依法請求隱匿身分代號與住居所。
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">受文地檢署</label>
                    <input
                      type="text"
                      value={formInputs.prosecutorOffice}
                      onChange={(e) => handleInputChange('prosecutorOffice', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">告訴人（被害人姓名）</label>
                    <input
                      type="text"
                      value={formInputs.complainantName}
                      onChange={(e) => handleInputChange('complainantName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">被告（加害人/女友/伴侶）</label>
                    <input
                      type="text"
                      value={formInputs.accusedName}
                      onChange={(e) => handleInputChange('accusedName', e.target.value)}
                      placeholder="被告姓名或暱稱"
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">雙方關係</label>
                    <input
                      type="text"
                      value={formInputs.relationship}
                      onChange={(e) => handleInputChange('relationship', e.target.value)}
                      placeholder="男女朋友 / 同居伴侶 / 前任"
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">案發時間</label>
                    <input
                      type="text"
                      value={formInputs.incidentDate}
                      onChange={(e) => handleInputChange('incidentDate', e.target.value)}
                      placeholder="113年5月10日凌晨"
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">案發地點</label>
                    <input
                      type="text"
                      value={formInputs.incidentLocation}
                      onChange={(e) => handleInputChange('incidentLocation', e.target.value)}
                      placeholder="住處 / 車內 / 旅館"
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">違反意願手段與具體案發過程</label>
                  <textarea
                    rows={5}
                    value={formInputs.incidentDetails}
                    onChange={(e) => handleInputChange('incidentDetails', e.target.value)}
                    placeholder="載明拒絕意願表示、強暴/脅迫/恐嚇/乘無力反抗之具體情節..."
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">已掌握證據（驗傷單/通訊軟體自承紀錄/錄音等）</label>
                  <input
                    type="text"
                    value={formInputs.evidenceList}
                    onChange={(e) => handleInputChange('evidenceList', e.target.value)}
                    placeholder="醫院驗傷證明、LINE道歉對話截圖、現場衣物、就醫心理諮商證明"
                    className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* 3.2 Domestic Violence Protection Order */}
            {activeToolId === 'DOMESTIC_VIOLENCE_PROTECTION_ORDER' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                    <HeartHandshake className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>親密關係伴侶保護令（家庭暴力防治法第63條之1恐怖情人條款）</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    年滿16歲遭受現有或曾有親密關係伴侶之肢體暴力、性暴力、恐嚇或騷擾，不論是否同居或性別，均得向管轄法院聲請民事通常或暫時保護令。
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">聲請人（被害人姓名）</label>
                    <input
                      type="text"
                      value={formInputs.complainantName}
                      onChange={(e) => handleInputChange('complainantName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">相對人（加害伴侶姓名）</label>
                    <input
                      type="text"
                      value={formInputs.accusedName}
                      onChange={(e) => handleInputChange('accusedName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">伴侶關係</label>
                    <input
                      type="text"
                      value={formInputs.relationship}
                      onChange={(e) => handleInputChange('relationship', e.target.value)}
                      placeholder="親密關係情侶 / 同居伴侶 / 前男女朋友"
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">管轄地方法院</label>
                    <input
                      type="text"
                      value={formInputs.courtName || '臺灣臺北地方法院家事法庭'}
                      onChange={(e) => handleInputChange('courtName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">不法侵害事實與騷擾情節</label>
                  <textarea
                    rows={5}
                    value={formInputs.incidentDetails}
                    onChange={(e) => handleInputChange('incidentDetails', e.target.value)}
                    placeholder="肢體施暴、非自願性行為、恐嚇威脅、跟蹤騷擾或密集通訊內容..."
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">聲請命令項目</label>
                  <input
                    type="text"
                    value={formInputs.requestedRelief}
                    onChange={(e) => handleInputChange('requestedRelief', e.target.value)}
                    className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* 3.3 Civil Tort Sexual Assault */}
            {activeToolId === 'CIVIL_TORT_SEXUAL_ASSAULT' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">原告（被害人）姓名</label>
                    <input
                      type="text"
                      value={formInputs.complainantName}
                      onChange={(e) => handleInputChange('complainantName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">被告（加害人）姓名</label>
                    <input
                      type="text"
                      value={formInputs.accusedName}
                      onChange={(e) => handleInputChange('accusedName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">請求賠償總金額（元）</label>
                    <input
                      type="text"
                      value={formInputs.claimTotalAmount || '1,000,000'}
                      onChange={(e) => handleInputChange('claimTotalAmount', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">管轄地方法院</label>
                    <input
                      type="text"
                      value={formInputs.courtName || '臺灣臺北地方法院民事庭'}
                      onChange={(e) => handleInputChange('courtName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">侵害情節與精神身心創傷事由</label>
                  <textarea
                    rows={5}
                    value={formInputs.injuryDetails}
                    onChange={(e) => handleInputChange('injuryDetails', e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* 3.4 Theft & Embezzlement Complaint */}
            {activeToolId === 'CRIMINAL_COMPLAINT_THEFT' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>竊盜與親屬/同居伴侶特例法律提醒</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    1. <strong>一般伴侶（未同居）</strong>：竊盜（刑法§320）與侵占（刑法§335）為<strong>非告訴乃論公訴罪</strong>，檢警知悉即應主動追訴。<br />
                    2. <strong>同居伴侶或親屬</strong>：若為同財共居親屬或配偶，依刑法§324第2項為<strong>告訴乃論</strong>，應於知悉犯人起<strong>6個月內</strong>提出告訴。
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">受文地檢署</label>
                    <input
                      type="text"
                      value={formInputs.prosecutorOffice}
                      onChange={(e) => handleInputChange('prosecutorOffice', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">告訴人（被害人姓名）</label>
                    <input
                      type="text"
                      value={formInputs.complainantName}
                      onChange={(e) => handleInputChange('complainantName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">被告（女友/伴侶/他人）</label>
                    <input
                      type="text"
                      value={formInputs.accusedName}
                      onChange={(e) => handleInputChange('accusedName', e.target.value)}
                      placeholder="被告姓名"
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">雙方關係</label>
                    <input
                      type="text"
                      value={formInputs.relationship}
                      onChange={(e) => handleInputChange('relationship', e.target.value)}
                      placeholder="男女朋友 / 同居伴侶 / 前任"
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">失竊或遭侵占之物品與金額估計</label>
                  <input
                    type="text"
                    value={formInputs.stolenItems || ''}
                    onChange={(e) => handleInputChange('stolenItems', e.target.value)}
                    placeholder="現金新臺幣10萬元、銀行存摺與印章（遭盜領）、iPhone手機、珠寶首飾"
                    className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">案發時間、地點與手法事實經過</label>
                  <textarea
                    rows={5}
                    value={formInputs.incidentDetails}
                    onChange={(e) => handleInputChange('incidentDetails', e.target.value)}
                    placeholder="載明案發時間、地點、被告如何趁不備拿取、盜領或借用後拒不返還之具體情節..."
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">已掌握之證據清單</label>
                  <input
                    type="text"
                    value={formInputs.evidenceList}
                    onChange={(e) => handleInputChange('evidenceList', e.target.value)}
                    placeholder="監視器錄影光碟、LINE催討及被告自承拿取截圖、存摺提領交易明細、購買發票"
                    className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* 3.5 Intimidation */}
            {activeToolId === 'CRIMINAL_COMPLAINT_INTIMIDATION' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">受文地檢署</label>
                    <input
                      type="text"
                      value={formInputs.prosecutorOffice}
                      onChange={(e) => handleInputChange('prosecutorOffice', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">告訴人姓名</label>
                    <input
                      type="text"
                      value={formInputs.complainantName}
                      onChange={(e) => handleInputChange('complainantName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">恐嚇威脅具體言論與情節</label>
                  <textarea
                    rows={5}
                    value={formInputs.incidentDetails}
                    onChange={(e) => handleInputChange('incidentDetails', e.target.value)}
                    placeholder="被告以加害生命、身體、自由、名譽或財產之事恐嚇之具體文字與錄音..."
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* 3.6 Privacy & Sexual Images */}
            {activeToolId === 'CRIMINAL_COMPLAINT_PRIVACY' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">告訴人姓名</label>
                    <input
                      type="text"
                      value={formInputs.complainantName}
                      onChange={(e) => handleInputChange('complainantName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">被告姓名</label>
                    <input
                      type="text"
                      value={formInputs.accusedName}
                      onChange={(e) => handleInputChange('accusedName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">偷拍竊錄或未經同意散布情節</label>
                  <textarea
                    rows={5}
                    value={formInputs.incidentDetails}
                    onChange={(e) => handleInputChange('incidentDetails', e.target.value)}
                    placeholder="載明未經同意窺視、錄影或上傳至社群網站/群組之具體事實與網址..."
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* 3.7 Civil Tort General & Restitution */}
            {activeToolId === 'CIVIL_TORT_GENERAL' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">原告姓名</label>
                    <input
                      type="text"
                      value={formInputs.complainantName}
                      onChange={(e) => handleInputChange('complainantName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">被告姓名</label>
                    <input
                      type="text"
                      value={formInputs.accusedName}
                      onChange={(e) => handleInputChange('accusedName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">請求返還之標的物</label>
                    <input
                      type="text"
                      value={formInputs.stolenItems || ''}
                      onChange={(e) => handleInputChange('stolenItems', e.target.value)}
                      placeholder="指定型號筆電、名牌皮夾、車輛或特定動產"
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">請求損害賠償金額（元）</label>
                    <input
                      type="text"
                      value={formInputs.claimTotalAmount || '100,000'}
                      onChange={(e) => handleInputChange('claimTotalAmount', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3.8 Universal AI Pleading */}
            {activeToolId === 'UNIVERSAL_AI_PLEADING' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>AI 全能自訂案件智慧診斷與書狀生成</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    無論您面臨任何民事糾紛、刑事犯罪被害或非訟爭議，請在下方詳述情況，系統將即時分析適用法條與程序，並直接為您產製專屬書狀。
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">具狀人（我方姓名）</label>
                    <input
                      type="text"
                      value={formInputs.complainantName}
                      onChange={(e) => handleInputChange('complainantName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">相對人（對方/被告姓名）</label>
                    <input
                      type="text"
                      value={formInputs.accusedName}
                      onChange={(e) => handleInputChange('accusedName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">爭議具體經過與事實細節</label>
                  <textarea
                    rows={6}
                    value={formInputs.incidentDetails}
                    onChange={(e) => handleInputChange('incidentDetails', e.target.value)}
                    placeholder="請詳細敘述人、事、時、地、物與雙方爭執經過..."
                    className="w-full p-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* 4. Supplementary Civil */}
            {activeToolId === 'CRIMINAL_SUPPLEMENTARY_CIVIL' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">刑事案號與股別</label>
                    <input
                      type="text"
                      value={formInputs.caseNo}
                      onChange={(e) => handleInputChange('caseNo', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">請求總金額（元）</label>
                    <input
                      type="text"
                      value={formInputs.claimTotalAmount}
                      onChange={(e) => handleInputChange('claimTotalAmount', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">醫療費</label>
                    <input
                      type="text"
                      value={formInputs.medicalExpense}
                      onChange={(e) => handleInputChange('medicalExpense', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">工作損失</label>
                    <input
                      type="text"
                      value={formInputs.workLoss}
                      onChange={(e) => handleInputChange('workLoss', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">精神慰撫金</label>
                    <input
                      type="text"
                      value={formInputs.solatium}
                      onChange={(e) => handleInputChange('solatium', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5 & 6. Inheritance & Forced Share */}
            {(activeToolId === 'INHERITANCE_CALCULATOR' || activeToolId === 'FORCED_SHARE_CALCULATOR') && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">被繼承人姓名</label>
                    <input
                      type="text"
                      value={formInputs.deceasedName}
                      onChange={(e) => handleInputChange('deceasedName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">遺產總預估額（元）</label>
                    <input
                      type="number"
                      value={formInputs.totalEstate}
                      onChange={(e) => handleInputChange('totalEstate', Number(e.target.value))}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-xs font-mono focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-300">配偶是否共同繼承</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formInputs.hasSpouse}
                        onChange={(e) => handleInputChange('hasSpouse', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">第一順位直系卑親屬（子女）人數</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={formInputs.childrenCount}
                      onChange={(e) => handleInputChange('childrenCount', Number(e.target.value))}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 7. Self-Written Will */}
            {activeToolId === 'SELF_WRITTEN_WILL' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">立遺囑人姓名</label>
                    <input
                      type="text"
                      value={formInputs.testatorName}
                      onChange={(e) => handleInputChange('testatorName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">身分證字號</label>
                    <input
                      type="text"
                      value={formInputs.idNo}
                      onChange={(e) => handleInputChange('idNo', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">指定分配不動產門牌/坐落地號</label>
                  <input
                    type="text"
                    value={formInputs.realEstateAddress}
                    onChange={(e) => handleInputChange('realEstateAddress', e.target.value)}
                    className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">指定繼承人</label>
                    <input
                      type="text"
                      value={formInputs.realEstateBeneficiary}
                      onChange={(e) => handleInputChange('realEstateBeneficiary', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">指定遺囑執行人</label>
                    <input
                      type="text"
                      value={formInputs.executorName}
                      onChange={(e) => handleInputChange('executorName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 8. Waiver of inheritance */}
            {activeToolId === 'WAIVER_OF_INHERITANCE' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">聲請人（拋棄人）</label>
                    <input
                      type="text"
                      value={formInputs.petitionerName}
                      onChange={(e) => handleInputChange('petitionerName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">被繼承人姓名</label>
                    <input
                      type="text"
                      value={formInputs.deceasedName}
                      onChange={(e) => handleInputChange('deceasedName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">被繼承人死亡日期</label>
                    <input
                      type="text"
                      value={formInputs.deathDate}
                      onChange={(e) => handleInputChange('deathDate', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">知悉得繼承日期（起算3月）</label>
                    <input
                      type="text"
                      value={formInputs.knowDate}
                      onChange={(e) => handleInputChange('knowDate', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 9. Divorce */}
            {activeToolId === 'DIVORCE_AGREEMENT' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">夫方姓名</label>
                    <input
                      type="text"
                      value={formInputs.husbandName}
                      onChange={(e) => handleInputChange('husbandName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">妻方姓名</label>
                    <input
                      type="text"
                      value={formInputs.wifeName}
                      onChange={(e) => handleInputChange('wifeName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">監護權歸屬（單獨/共同）</label>
                    <input
                      type="text"
                      value={formInputs.custodyParent}
                      onChange={(e) => handleInputChange('custodyParent', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">每月扶養費（元）</label>
                    <input
                      type="text"
                      value={formInputs.childSupport}
                      onChange={(e) => handleInputChange('childSupport', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 10, 11, 12. Guardianship / Assistance / Contractual */}
            {(activeToolId === 'GUARDIANSHIP_PETITION' || activeToolId === 'ASSISTANCE_PETITION' || activeToolId === 'CONTRACTUAL_GUARDIANSHIP') && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">受宣告長輩 / 委任人姓名</label>
                    <input
                      type="text"
                      value={formInputs.wardName}
                      onChange={(e) => handleInputChange('wardName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">聲請人/受任人姓名及關係</label>
                    <input
                      type="text"
                      value={formInputs.petitionerName}
                      onChange={(e) => handleInputChange('petitionerName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">失智醫療評估（CDR 分數）</label>
                    <input
                      type="text"
                      value={formInputs.cdrScore}
                      onChange={(e) => handleInputChange('cdrScore', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">會同開具財產清冊人</label>
                    <input
                      type="text"
                      value={formInputs.supervisorName}
                      onChange={(e) => handleInputChange('supervisorName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 13, 14, 15, 16. Debt / Note / Loan / Interest */}
            {(activeToolId === 'PROMISSORY_NOTE_RULING' || activeToolId === 'PAYMENT_ORDER_PETITION' || activeToolId === 'LOAN_AGREEMENT' || activeToolId === 'INTEREST_CALCULATOR') && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">債權人 / 執票人 / 貸與人</label>
                    <input
                      type="text"
                      value={formInputs.creditorName}
                      onChange={(e) => handleInputChange('creditorName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">債務人 / 發票人 / 借用人</label>
                    <input
                      type="text"
                      value={formInputs.debtorName}
                      onChange={(e) => handleInputChange('debtorName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">金額（新臺幣元）</label>
                    <input
                      type="text"
                      value={formInputs.debtAmount}
                      onChange={(e) => handleInputChange('debtAmount', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">約定週年利率 %（上限16%）</label>
                    <input
                      type="number"
                      max={16}
                      min={0}
                      value={formInputs.interestRate}
                      onChange={(e) => handleInputChange('interestRate', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 17, 18, 19, 20. Demand Letters */}
            {(activeToolId.startsWith('DEMAND_LETTER')) && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">寄件人姓名/公司</label>
                    <input
                      type="text"
                      value={formInputs.senderName}
                      onChange={(e) => handleInputChange('senderName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">收件人姓名/公司</label>
                    <input
                      type="text"
                      value={formInputs.recipientName}
                      onChange={(e) => handleInputChange('recipientName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">寄件人通訊地址（供回執送達）</label>
                  <input
                    type="text"
                    value={formInputs.senderAddress}
                    onChange={(e) => handleInputChange('senderAddress', e.target.value)}
                    className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">收件人地址</label>
                  <input
                    type="text"
                    value={formInputs.recipientAddress}
                    onChange={(e) => handleInputChange('recipientAddress', e.target.value)}
                    className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* 21, 22, 23. Execution & Attachment */}
            {(activeToolId === 'EXECUTION_SALARY_ATTACHMENT' || activeToolId === 'EXECUTION_BANK_REAL_ESTATE' || activeToolId === 'PROVISIONAL_ATTACHMENT') && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">債權人姓名</label>
                    <input
                      type="text"
                      value={formInputs.creditorName}
                      onChange={(e) => handleInputChange('creditorName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">債務人姓名</label>
                    <input
                      type="text"
                      value={formInputs.debtorName}
                      onChange={(e) => handleInputChange('debtorName', e.target.value)}
                      className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    {activeToolId === 'EXECUTION_SALARY_ATTACHMENT' ? '任職公司全名（第三人扣繳義務人）' : '執行名義案號 / 保全金額'}
                  </label>
                  <input
                    type="text"
                    value={activeToolId === 'EXECUTION_SALARY_ATTACHMENT' ? formInputs.employerName : formInputs.titleCaseNo}
                    onChange={(e) => handleInputChange(activeToolId === 'EXECUTION_SALARY_ATTACHMENT' ? 'employerName' : 'titleCaseNo', e.target.value)}
                    className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* 24 & 25. Real Estate Lease & Spousal Right */}
            {(activeToolId === 'RESIDENTIAL_LEASE_CONTRACT' || activeToolId === 'SPOUSAL_RIGHT_INFRINGEMENT') && (
              <div className="space-y-3 text-xs">
                {activeToolId === 'RESIDENTIAL_LEASE_CONTRACT' ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-medium text-slate-300 mb-1">房東（出租人）</label>
                        <input
                          type="text"
                          value={formInputs.landlordName}
                          onChange={(e) => handleInputChange('landlordName', e.target.value)}
                          className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-300 mb-1">房客（承租人）</label>
                        <input
                          type="text"
                          value={formInputs.tenantName}
                          onChange={(e) => handleInputChange('tenantName', e.target.value)}
                          className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-medium text-slate-300 mb-1">租賃房屋門牌地址</label>
                      <input
                        type="text"
                        value={formInputs.rentalAddress}
                        onChange={(e) => handleInputChange('rentalAddress', e.target.value)}
                        className="w-full px-3 py-2 md:py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block font-medium text-slate-300 mb-1">原告（配偶）</label>
                        <input
                          type="text"
                          value={formInputs.plaintiffName}
                          onChange={(e) => handleInputChange('plaintiffName', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-300 mb-1">被告一（配偶）</label>
                        <input
                          type="text"
                          value={formInputs.defendant1Name}
                          onChange={(e) => handleInputChange('defendant1Name', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-300 mb-1">被告二（第三者）</label>
                        <input
                          type="text"
                          value={formInputs.defendant2Name}
                          onChange={(e) => handleInputChange('defendant2Name', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-base md:text-sm focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-xs"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    正在產製並執行司法院真實性檢驗...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-blue-200" />
                    立即產製正式法律文書（含防虛構檢驗）
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Anti-Ghost Hallucination Defense Notice */}
          <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 text-xs space-y-2">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 司法院接地 · 幽靈法條零容忍防禦機制
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {LEGAL_TOOLS.length} 項工具全面掛載<strong>司法院全國法規庫</strong>與<strong>最高法院判例資料庫</strong>。
            </p>
          </div>
        </div>

        {/* Right Column: Output Preview & Anti-Ghost Report */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 min-h-[560px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    {result ? result.title : `${currentTool.name} 預覽與檢驗報告`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {result ? '已產製完成，可直接複製、下載或列印' : '請於左側確認參數後點擊產製按鈕'}
                  </p>
                </div>

                {result && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCopy}
                      className="px-3 py-2 md:py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1 border border-slate-700"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? '已複製' : '複製全文'}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="px-3 py-2 md:py-1.5 text-xs font-semibold bg-blue-950 text-blue-300 hover:bg-blue-900/80 border border-blue-800 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> 下載 TXT
                    </button>
                    <button
                      onClick={handlePrint}
                      className="px-3 py-2 md:py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-1 border border-slate-700"
                    >
                      <Printer className="w-3.5 h-3.5" /> 列印
                    </button>
                  </div>
                )}
              </div>

              {/* Anti-Ghost Verification Badge Bar */}
              {result?.antiGhostVerification && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> 司法院真實性檢驗報告
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-medium">
                      核實 {result.antiGhostVerification.totalCitationsChecked} 處引述 · 0 處幽靈虛構
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {result.antiGhostVerification.verifiedCitations.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-200 border border-slate-700"
                        title={c.officialSnippet}
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        {c.officialTitle}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Document Text Area */}
              {result ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-[460px] overflow-y-auto font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed shadow-inner">
                  {result.documentText}
                </div>
              ) : (
                <div className="h-72 flex flex-col items-center justify-center text-center p-6 text-slate-400 border border-dashed border-slate-800 rounded-xl space-y-3 bg-slate-950/50">
                  <FolderLock className="w-10 h-10 text-slate-600 stroke-1" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-slate-300">尚未產製「{currentTool.name}」</p>
                    <p className="max-w-md">{currentTool.shortDesc}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Compliance Checklist Footer */}
            {result?.complianceChecklist && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-blue-400" /> 法定合規與要件檢核：
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.complianceChecklist.map((chk, i) => (
                    <div key={i} className="bg-blue-950/40 border border-blue-800/50 p-2 rounded-lg text-[11px] space-y-0.5">
                      <div className="font-semibold text-blue-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {chk.rule}
                      </div>
                      <div className="text-slate-400 text-[10px]">{chk.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
