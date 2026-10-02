/**
 * 法律流程引導與案件分類過濾引擎 (Legal Process Classifier)
 * 
 * 核心功能：
 * 1. 初步過濾是否為性侵害、性騷擾、性私密影像散布或家庭暴力案件。
 * 2. 評估即時人身危險性，並提供緊急保護處置（113、110、72小時急診驗傷）。
 * 3. 釐清實體法法條、告訴性質（告訴乃論 vs 非告訴乃論公訴罪）、時效與對應處置路徑。
 */

import { buildForensicGuidance } from './forensicGuidance';

export interface ProcessGuideInput {
  scenarioCategory: string; // DOMESTIC, SEXUAL_HARM, PROPERTY, TRAFFIC, HOUSING, LABOR, OTHER
  narrative: string;
  // 空字串代表使用者尚未選擇。安全分流不得預設關係人：
  // 預設 'SPOUSE' 會讓 isFamilyRelation 對每個人都為真，
  // 把陌生人侵害或一般契約糾紛都導成家暴路徑。
  relationship: '' | 'SPOUSE' | 'COHABITANT' | 'EX_PARTNER' | 'FAMILY' | 'COLLEAGUE' | 'STRANGER' | 'OTHER'
    // 民事契約糾紛的相對人（房東、買賣人、雇主）不是人身關係，
    // 步驟 3 需要能如實選擇，不必誤選「陌生人／其他」。
    | 'LANDLORD_TENANT' | 'SELLER_BUYER' | 'EMPLOYER';
  characteristics: string[]; // PHYSICAL_VIOLENCE, SEXUAL_INVASION, INDECENT_ACT, PRIVATE_MEDIA, THEFT_FRAUD, THREAT_HARASS, INCAPACITATED
  urgencyFlags: {
    inImmediateDanger: boolean;
    needsMedicalOrInjury: boolean;
    happenedWithin72Hours: boolean;
  };
}

export interface KeywordFilterResult {
  hasSexualAssaultKeywords: boolean;
  hasDomesticViolenceKeywords: boolean;
  hasIncapacitatedKeywords: boolean;
  hasPrivateMediaKeywords: boolean;
  hasThreatHarassmentKeywords: boolean;
  detectedKeywords: string[];
}

export interface ProcessGuideResult {
  primaryCategory: 'SEXUAL_ASSAULT' | 'DOMESTIC_VIOLENCE' | 'DIGITAL_SEX_CRIME' | 'PROPERTY_CRIME' | 'TRAFFIC_ACCIDENT' | 'LABOR_DISPUTE' | 'GENERAL_CIVIL' | 'GENERAL_CRIMINAL';
  title: string;
  isHighRiskSafety: boolean;
  isPublicProsecution: boolean;
  requiresImmediateProtection: boolean;
  statuteCitations: string[];
  safetyGuidelines: string[];
  recommendedPaths: {
    pathId: string;
    name: string;
    description: string;
    badge: string;
    actionType: 'TOOLBOX' | 'EMERGENCY' | 'TRIAGE';
    targetToolId?: string;
  }[];
  legalAnalysis: string;
  evidenceChecklist: string[];
}

// 敏感關鍵詞庫
const SEXUAL_ASSAULT_KEYWORDS = [
  '性侵', '強暴', '性交', '口交', '強制性交', '乘機性交', '猥褻', '強吻', '含住',
  '摸胸', '摸下體', '性侵入', '陰莖', '陰道', '肛門', '下體', '撫摸', '脫衣服',
  '性騷擾', '硬上', '侵犯我', '碰我私密處'
];

// 自然敘述很少用固定詞組。當事人會說「摸我胸部」「摸了我的胸部」
// 「用手摸胸部」，動詞與身體部位之間常夾著字，純字串比對會整組漏掉。
// 這裡以樣式補足：動詞與部位之間允許少量插字，但部位詞必須出現，
// 動詞必須本身即指向暴力或性接觸。像「打」「抓」「親」單獨出現時
// 極為常見（「打電話」「抓住我的手」「親耳聽見」），放進來會把無辜的
// 敘述誤判成敏感案件，而誤判會讓不曾受暴者看到家庭暴力警示。
// 因此這裡只放語意明確的動詞，並要求部位或器物詞確實出現。
const SEXUAL_ASSAULT_PATTERNS: RegExp[] = [
  /(摸|撫摸|觸摸|碰)[^。！？，\n]{0,4}(胸|臀|屁股|下體|私處|私密處|大腿|大腿根|生殖器)/,
  /(舔|含住|吸吮)[^。！？，\n]{0,3}(胸|下體|私處|生殖器)/,
  /(脫|扯|扒)[^。！？，\n]{0,3}(衣|褲|內衣|內褲)/,
  /(強行|硬|強迫|不容拒絕)[^。！？，\n]{0,6}(親|摸|碰|抱|脫|褪)/,
  /未經[^。！？，\n]{0,4}(同意|允許)[^。！？，\n]{0,6}(拍|錄|摸|碰|親)/
];

// 家暴的常見說法同樣多變：砸、拳頭、腳踢、推撞、拿刀等都不在字串清單內。
const DOMESTIC_ASSAULT_PATTERNS: RegExp[] = [
  /(砸|毆|毆打|揍|踢|踹|推撞|拉扯|咬|掐|扭|搥|捶|掌摑)[^。！？，\n]{0,4}(我|她|他|頭|臉|身體|手臂|腳|脖子|胸|背|腿|拳頭|棍|刀|酒瓶|玻璃)/,
  /(拿|揮)[^。！？，\n]{0,4}(刀|棍|棒|鐵棍|酒瓶|玻璃瓶|椅子|水杯)/
];

const INCAPACITATED_KEYWORDS = [
  '睡覺', '熟睡', '昏睡', '意識不清', '酒醉', '喝醉', '灌醉', '麻醉', '迷昏', '下藥',
  '不能抗拒', '不知抗拒', '無法動彈', '不省人事'
];

const PRIVATE_MEDIA_KEYWORDS = [
  '私密照', '裸照', '偷拍', '散布私密片', '性私密影像', '外流', '錄影威脅', '未經同意拍攝'
];

const DOMESTIC_KEYWORDS = [
  '家庭暴力', '家暴', '毆打', '打人', '動手', '揍', '掐脖子', '甩巴掌', '摔東西', '恐嚇',
  '威脅要殺', '趕出家門', '軟禁', '限制行動', '不准出門', '精神虐待', '施暴'
];

// 當事人描述被打時，用的是「打我」「打了我」，不會寫「毆打」「打人」。
// 這些字串本身不含「電話」等無關詞，可直接比對；
// 不能把「打」丟進 DOMESTIC_ASSAULT_PATTERNS 的動詞清單，
// 因為該樣式容許動詞與受詞之間夾字，「打他電話」「打她電話」會被誤判，
// 而誤判會讓不曾受暴者看到家庭暴力警示（見上方樣式說明）。
const DOMESTIC_VERBAL_ASSAULT_KEYWORDS = [
  '打我', '打了我', '打我一下', '打我身上', '打我臉', '打我頭',
  '被我打', '被我毆'
];

// 死亡與致死威脅是風險最高的訊號，語意明確、幾乎不會誤判，
// 但先前只有「威脅要殺」這一個固定字串。
// 實測輸入「我丈夫剛才打我，說要殺我，我現在很害怕」，
// 舊的關鍵字表與樣式都沒有命中，畫面顯示「尚無特定風險關鍵詞」。
const THREAT_OF_HARM_PATTERNS: RegExp[] = [
  /(說|揚言|威脅|放話|警告|恐嚇)?[^。！？，\n]{0,4}(要|想|打算|即將)?(殺|打死|弄死|害死|毀掉|整死)(死)?(我|她|他|我們|自己)/,
  /(我|她|他)[^。！？，\n]{0,3}(會|要|得|就要|快要)(死|沒命|活不下去)/,
  // 「不讓我出門」「不准回家」「別想離開」等限制人身自由。
  // 「不讓」是當事人最常見的說法，先前只列了不准／休想／別想。
  /(不讓|不許|不准|休想|別想|禁止)[^。！？，\n]{0,3}(活|出去|回家|離開|見面|出門)/
];

const FAMILY_RELATION_KEYWORDS = [
  '老婆', '老公', '配偶', '妻子', '丈夫', '男友', '女友', '前夫', '前妻', '前男友',
  '前女友', '同居', '家人', '父母', '爸爸', '媽媽', '父親', '母親', '婆婆', '公公',
  '岳父', '岳母', '兒子', '女兒', '小孩'
];

/**
 * 依文字快速過濾敏感關鍵詞
 */
export function filterSensitiveKeywords(text: string): KeywordFilterResult {
  const t = text.trim();
  const detected: string[] = [];

  const check = (list: string[]) => {
    let found = false;
    for (const kw of list) {
      if (t.includes(kw)) {
        found = true;
        detected.push(kw);
      }
    }
    return found;
  };

  const checkPatterns = (patterns: RegExp[]) => {
    let found = false;
    for (const re of patterns) {
      const m = t.match(re);
      if (m) {
        found = true;
        detected.push(m[0]);
      }
    }
    return found;
  };

  const hasSexual = check(SEXUAL_ASSAULT_KEYWORDS) || checkPatterns(SEXUAL_ASSAULT_PATTERNS);
  const hasIncap = check(INCAPACITATED_KEYWORDS);
  const hasPrivate = check(PRIVATE_MEDIA_KEYWORDS);
  // 補上自然敘述的毆打說法（「打我」）與致死威脅（「說要殺我」）。
  // 這兩類先前都會漏判，實測「我丈夫剛才打我，說要殺我」顯示為無關鍵詞。
  const hasVerbalAssault = check(DOMESTIC_VERBAL_ASSAULT_KEYWORDS);
  const hasThreatOfHarm = checkPatterns(THREAT_OF_HARM_PATTERNS);
  const hasDomestic = check(DOMESTIC_KEYWORDS) || checkPatterns(DOMESTIC_ASSAULT_PATTERNS) || hasVerbalAssault;
  const hasThreat = hasThreatOfHarm || t.includes('威脅') || t.includes('恐嚇') || t.includes('跟蹤') || t.includes('騷擾');

  return {
    hasSexualAssaultKeywords: hasSexual,
    hasDomesticViolenceKeywords: hasDomestic,
    hasIncapacitatedKeywords: hasIncap,
    hasPrivateMediaKeywords: hasPrivate,
    hasThreatHarassmentKeywords: hasThreat,
    detectedKeywords: Array.from(new Set(detected))
  };
}

/**
 * 綜合評估互動表單，產出專屬引導路徑
 */
export function evaluateLegalProcess(input: ProcessGuideInput): ProcessGuideResult {
  const kwResult = filterSensitiveKeywords(input.narrative);
  const isFamilyRelation = ['SPOUSE', 'COHABITANT', 'EX_PARTNER', 'FAMILY'].includes(input.relationship) ||
    FAMILY_RELATION_KEYWORDS.some(kw => input.narrative.includes(kw));

  const hasSexualFeatures = kwResult.hasSexualAssaultKeywords ||
    input.characteristics.includes('SEXUAL_INVASION') ||
    input.characteristics.includes('INDECENT_ACT') ||
    input.scenarioCategory === 'SEXUAL_HARM';

  const hasDomesticFeatures = (isFamilyRelation && (
    kwResult.hasDomesticViolenceKeywords ||
    input.characteristics.includes('PHYSICAL_VIOLENCE') ||
    input.characteristics.includes('THREAT_HARASS') ||
    input.scenarioCategory === 'DOMESTIC'
  )) || kwResult.hasDomesticViolenceKeywords;

  // 1. 性侵害／妨害性自主（含乘機性交與數位性私密影像）
  if (hasSexualFeatures) {
    const isIncapacitated = kwResult.hasIncapacitatedKeywords || input.characteristics.includes('INCAPACITATED');
    const isPrivateMedia = kwResult.hasPrivateMediaKeywords || input.characteristics.includes('PRIVATE_MEDIA');
    const isSpouse = input.relationship === 'SPOUSE' || input.narrative.includes('老婆') || input.narrative.includes('老公') || input.narrative.includes('配偶');

    const citations = ['刑法第10條第5項（性交之定義）'];
    if (isIncapacitated) {
      citations.push('刑法第225條（乘機性交猥褻罪，非告訴乃論公訴罪）');
    } else {
      citations.push('刑法第221條（強制性交罪）或第224條（強制猥褻罪）');
      if (isSpouse) {
        citations.push('刑法第229條之1（對配偶犯221/224條須告訴乃論，6個月時效）');
      }
    }
    if (isPrivateMedia) {
      citations.push('刑法第319條之3（未經同意散布性私密影像罪）');
    }
    if (isFamilyRelation) {
      citations.push('家庭暴力防治法第2條（家暴事件與民事保護令管轄）');
    }
    citations.push('民法第184條、第195條（侵害性自主權非財產上損害賠償精神慰撫金）');

    const paths: ProcessGuideResult['recommendedPaths'] = [
      {
        pathId: 'CRIMINAL_SEXUAL_COMPLAINT',
        name: '妨害性自主刑事告訴狀產製',
        description: '依刑法規定載明案發時間、手段、無同意或利用不能抗拒狀態之要件，向地檢署或警察機關提出告訴。',
        badge: '刑事告訴',
        actionType: 'TOOLBOX',
        targetToolId: 'CRIMINAL_COMPLAINT_SEXUAL_ASSAULT'
      }
    ];

    if (isFamilyRelation) {
      paths.push({
        pathId: 'DV_PROTECTION_ORDER',
        name: '親密關係伴侶 / 家暴保護令聲請狀',
        description: '聲請法院核發民事保護令，禁止加害人接近住居所、學校或工作地點，並禁止騷擾聯繫。',
        badge: '保護令防護',
        actionType: 'TOOLBOX',
        targetToolId: 'DOMESTIC_VIOLENCE_PROTECTION_ORDER'
      });
    }

    paths.push({
      pathId: 'CIVIL_TORT',
      name: '侵害性自主權損害賠償訴訟（精神慰撫金）',
      description: '得提起刑事附帶民事訴訟（免徵裁判費）或獨立民事侵權求償，請求精神損害賠償。',
      badge: '民事求償',
      actionType: 'TOOLBOX',
      targetToolId: 'CIVIL_TORT_SEXUAL_ASSAULT'
    });

    return {
      primaryCategory: isPrivateMedia && !kwResult.hasSexualAssaultKeywords ? 'DIGITAL_SEX_CRIME' : 'SEXUAL_ASSAULT',
      title: isIncapacitated 
        ? '妨害性自主（利用不能或不知抗拒狀態之乘機性交/猥褻）' 
        : '妨害性自主（強制性交/猥褻/性侵害）及人身侵害事件',
      isHighRiskSafety: true,
      isPublicProsecution: isIncapacitated || !isSpouse,
      requiresImmediateProtection: true,
      statuteCitations: citations,
      safetyGuidelines: [
        `【採證保存時效】：${buildForensicGuidance(input.urgencyFlags.happenedWithin72Hours).preservationTips[1]}`,
        '【24小時保護專線】：可隨時撥打 113 保護專線（免付費），由專業社工提供法律、心理諮商、庇護安置與緊急法律扶助諮詢。',
        '【即時危險求助】：若加害人目前仍在身邊或有繼續騷擾施暴之虞，請立刻撥打 110 報警派員到場維護安全。',
        '【法理要件防呆】：若屬乘機性交（刑法第225條，例如利用熟睡或泥醉），不論對方是否為配偶，一律屬「非告訴乃論公訴罪」，不受6個月告訴乃論期間之限制。'
      ],
      recommendedPaths: paths,
      legalAnalysis: `本案情境涉及刑法妨害性自主罪章。若加害人利用被害人處於熟睡、昏睡或不省人事之不能抗拒狀態（刑法第225條），為非告訴乃論之公訴重罪，檢警知悉即應依法啟動偵查；若涉及配偶關係且屬強制手段（第221/224條），則須注意6個月告訴乃論時效。同時被害人具備民法第184條及第195條侵害性自主權之非財產上損害賠償請求權。`,
      evidenceChecklist: buildForensicGuidance(input.urgencyFlags.happenedWithin72Hours).evidenceChecklist.concat([
        '案發前後向親友求助或就醫之對話與心理諮商紀錄'
      ])
    };
  }

  // 2. 家庭暴力事件（未達性侵害，但涉及肢體暴力、言語恐嚇、騷擾限制）
  if (hasDomesticFeatures) {
    return {
      primaryCategory: 'DOMESTIC_VIOLENCE',
      title: '家庭暴力事件（身體侵害、精神騷擾或恐嚇威脅）',
      isHighRiskSafety: true,
      isPublicProsecution: false, // 視是否成普通傷害（告訴乃論）或重傷害
      requiresImmediateProtection: true,
      statuteCitations: [
        '家庭暴力防治法第2條（家庭暴力及保護令定義）',
        '家庭暴力防治法第14條（民事保護令保護措施與遷出令）',
        '刑法第277條第1項（普通傷害罪，告訴乃論6個月）',
        '刑法第305條（恐嚇危害安全罪）',
        '民法第184條、第195條（侵權行為損害賠償）'
      ],
      safetyGuidelines: [
        '【緊急避難安全第一】：若身處暴力現場，請優先攜帶身分證件、手機迅速前往安全處所（如超商、派出所、親友家），或撥打 110 請求警力到場制止。',
        '【撥打 113 諮詢庇護】：撥打 113 保護專線，社工可評估是否需啟動緊急庇護所或緊急安置服務。',
        '【醫療驗傷留存】：受傷部位請立即前往醫療院所驗傷，並要求開立「驗傷診斷書」，詳細記載傷勢成因與範圍。',
        '【聲請民事保護令】：可向法院聲請「暫時保護令」或「通常保護令」；情況急迫時可請警察機關向法院聲請「緊急保護令」。'
      ],
      recommendedPaths: [
        {
          pathId: 'DV_PROTECTION_ORDER',
          name: '親密關係伴侶 / 家暴保護令聲請狀',
          description: '向法院聲請民事保護令，要求禁止施暴、禁止跟蹤騷擾與遠離特定場所。',
          badge: '核心保護途徑',
          actionType: 'TOOLBOX',
          targetToolId: 'DOMESTIC_VIOLENCE_PROTECTION_ORDER'
        },
        {
          pathId: 'CRIMINAL_INJURY_COMPLAINT',
          name: '家庭暴力傷害刑事告訴狀',
          description: '若受有身體傷勢，可於6個月告訴乃論期間內向地檢署提出傷害罪告訴。',
          badge: '刑事究責',
          actionType: 'TOOLBOX',
          targetToolId: 'CRIMINAL_COMPLAINT_TRAFFIC' // 借用傷害訴狀範疇
        }
      ],
      legalAnalysis: `本案當事人與相對人具有配偶、同居人或家庭成員關係，相對人所為之肢體或精神侵害已構成家庭暴力防治法第2條所稱之家庭暴力行為。得向管轄法院家事法庭聲請民事保護令（命相對人遷出戶籍或禁止接近被害人百公尺以內）。若有具體傷勢，亦構成刑法第277條普通傷害罪，依法應於知悉犯人起6個月內提起刑事告訴。`,
      evidenceChecklist: [
        '醫院驗傷診斷證明書（記載挫傷、瘀血、撕裂傷等詳細傷勢）',
        '受傷部位與被破壞物品之彩色照片',
        '恐嚇威脅之通訊軟體文字、語音留言或錄音錄影檔',
        '警方到場處理之受處理案件證明單或報案紀錄',
        '同住家人或鄰居等目擊證人之證詞或通聯'
      ]
    };
  }

  // 3. 財產與竊盜/侵占（包含親屬間相盜與盜刷）
  if (input.scenarioCategory === 'PROPERTY' || input.characteristics.includes('THEFT_FRAUD') || input.narrative.includes('錢包') || input.narrative.includes('盜刷') || input.narrative.includes('竊盜')) {
    const isSpouseOrFamily = isFamilyRelation;
    return {
      primaryCategory: 'PROPERTY_CRIME',
      title: isSpouseOrFamily ? '親屬相盜 / 盜刷信用卡與侵占財產糾紛' : '竊盜、侵占或偽造文書財產犯罪事件',
      isHighRiskSafety: false,
      isPublicProsecution: !isSpouseOrFamily,
      requiresImmediateProtection: false,
      statuteCitations: [
        '刑法第320條（普通竊盜罪）',
        isSpouseOrFamily ? '刑法第324條（親屬間竊盜須告訴乃論，得免除其刑）' : '',
        '刑法第210條、第216條（偽造私文書罪）',
        '刑法第339條之2（以不正方法由收費設備取得他人之物罪）',
        '民法第184條、第179條（侵權行為與不當得利返還請求權）'
      ].filter(Boolean),
      safetyGuidelines: [
        '【立即掛失停卡】：若涉及信用卡或提款卡，請立刻致電發卡銀行客服進行掛失，並調閱爭議款項刷卡商店、時間與明細。',
        '【親屬告訴時效注意】：若行為人為配偶、直系血親或同居親屬，依刑法第324條第2項規定為「告訴乃論」，務必於知悉犯人起6個月內提出告訴，否則喪失刑事追訴權。',
        '【保全刷卡簽單與監視器】：向特約商店或金融機構請求保存刷卡授權紀錄、簽名簽單及櫃位即時監視畫面。'
      ],
      recommendedPaths: [
        {
          pathId: 'CRIMINAL_THEFT_COMPLAINT',
          name: '竊盜罪 / 伴侶親屬相盜刑事告訴狀',
          description: '依刑法第320條及第324條，載明遭竊取物品與金流證據，向警察局或地檢署提告。',
          badge: '刑事告訴',
          actionType: 'TOOLBOX',
          targetToolId: 'CRIMINAL_COMPLAINT_THEFT'
        },
        {
          pathId: 'CIVIL_DAMAGES',
          name: '民事侵權行為與不當得利起訴狀',
          description: '請求返還遭盜取款項及損害賠償。',
          badge: '民事返還',
          actionType: 'TOOLBOX'
        }
      ],
      legalAnalysis: `未經本人授權擅自取走他人財物並持卡刷卡，分別該當刑法第320條竊盜罪、第210條/第216條行使偽造私文書罪及詐欺取財罪。若行為人為配偶或親屬，竊盜部分依刑法第324條轉為告訴乃論，告訴期間為6個月；但行使偽造私文書（如臨櫃冒名簽名）屬非告訴乃論公訴罪。民事上得依民法第179條不當得利與第184條侵權行為請求返還款項。`,
      evidenceChecklist: [
        '信用卡帳單明細與爭議款項申訴紀錄',
        '金融帳戶存摺交易明細與提款紀錄',
        '商店消費簽單或電子簽名影本',
        '通訊軟體中承認擅自拿取或承諾還款之對話紀錄'
      ]
    };
  }

  // 4. 一般民事/其他案件
  return {
    primaryCategory: 'GENERAL_CIVIL',
    title: '一般民事債權、契約履行或侵權糾紛',
    isHighRiskSafety: false,
    isPublicProsecution: false,
    requiresImmediateProtection: false,
    statuteCitations: [
      '民法第184條（侵權行為損害賠償）',
      '民事訴訟法第277條（舉證責任之分配）'
    ],
    safetyGuidelines: [
      '【保全契約與對話紀錄】：請完整保存雙方締約、履行或催告之文件與對話紀錄。',
      '【消滅時效注意】：一般請求權時效為15年，侵權行為損害賠償為知悉損害起2年。',
      '【先行催告或調解】：得先發存證信函催告履行，或向鄉鎮市區調解委員會聲請民事調解。'
    ],
    recommendedPaths: [
      {
        pathId: 'UNIVERSAL_TRIAGE',
        name: '啟動全能 AI 法律診斷',
        description: '深度檢索司法院裁判與法規，獲得客製化書狀草稿與完整攻防三段論。',
        badge: '全能診斷',
        actionType: 'TRIAGE'
      }
    ],
    legalAnalysis: `本件屬民事權利義務爭議，宜先釐清請求權基礎（例如契約債務不履行或侵權行為）。可透過民事存證信函、調解程序或起訴求償。`,
    evidenceChecklist: [
      '契約書、訂單憑證或往來信件',
      '轉帳金流憑證與收據',
      'LINE 或簡訊完整對話截圖'
    ]
  };
}
