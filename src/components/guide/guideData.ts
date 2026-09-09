import { Car, Coins, FileCheck2, HeartHandshake, Home, Scale, ShieldAlert, UserCheck } from 'lucide-react';
import type { ScenarioItem } from './ScenarioDetailModal';

export const QUICK_TAGS = [
    { label: "車禍", tool: "litigation" as const, tag: "traffic" },
    { label: "離婚", tool: "litigation" as const, tag: "divorce" },
    { label: "欠錢", tool: "legalToolbox" as const, tag: "debt" },
    { label: "租屋糾紛", tool: "litigation" as const, tag: "rent" },
    { label: "職場霸凌", tool: "legalToolbox" as const, tag: "labor" },
    { label: "詐騙", tool: "litigation" as const, tag: "fraud" },
    { label: "遺產繼承", tool: "litigation" as const, tag: "inheritance" },
    { label: "過失傷害", tool: "litigation" as const, tag: "negligence" },
  ];

export const SCENARIOS: ScenarioItem[] = [
    // 0. 性侵害 / 妨害性自主 / 伴侶非自願性行為
    {
      id: 'sexual-assault-victim',
      category: 'SAFETY',
      icon: ShieldAlert,
      color: 'from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-400',
      title: '遭到性侵 / 被伴侶（女友/男友）強迫非自願性行為 / 妨害性自主',
      plainDesc: '遭受他人或親密伴侶（女友/男友/同居人）違反意願強迫性交。臺灣刑法第221條男女平等受保護，且為「非告訴乃論公訴罪」，不受6個月告訴乃論限制，檢警知悉即應依法主動追訴。請把握72小時黃金期一站式驗傷採證，可提出刑事告訴並同步聲請保護令與民事求償。',
      situation: '遭受違反意願之性行為、伴侶不顧拒絕強行發生關係、面臨恐嚇或有身體擦挫傷、或持有對話承認紀錄。',
      recommendedAction: '使用「妨害性自主罪刑事告訴狀」向地檢署提出告訴，並可同步聲請「親密關係伴侶民事保護令」。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CRIMINAL_COMPLAINT_SEXUAL_ASSAULT',
      feeInfo: '刑事告訴 0 元；可撥打 113 全國保護專線或申請法律扶助基金會免費律師扶助',
      timeInfo: '非告訴乃論（公訴罪）無6個月限制；但醫院DNA採證黃金期為「72小時內」，請勿沐浴更衣直接前往急診採證',
      mustPrepare: ['公私立醫院一站式性侵害驗傷採證診斷證明書', '通訊軟體（LINE/簡訊）案發前後對話紀錄與自承道歉截圖', '案發時衣物、錄音光碟、心理諮商或精神科門診就醫證明'],
      tags: [
        '性侵', '被性侵', '女友性侵', '男友性侵', '伴侶性侵', '強暴', '強制性交',
        '妨害性自主', '非自願性行為', '違反意願', '女友', '男友', '被我女友性侵',
        '我被我女友性侵了', '親密暴力', '驗傷單', '113', '性侵告訴'
      ]
    },
    // 0.1 親密關係暴力 / 恐怖情人保護令
    {
      id: 'domestic-violence-protection-order',
      category: 'SAFETY',
      icon: HeartHandshake,
      color: 'from-amber-500/20 to-rose-500/20 border-amber-500/30 text-amber-400',
      title: '親密關係暴力 / 恐怖情人恐嚇騷擾與肢體攻擊（聲請保護令）',
      plainDesc: '遭受男女朋友、同居伴侶或前任暴力攻擊、恐嚇威脅、跟蹤騷擾或強迫性行為。可依家庭暴力防治法第63條之1（恐怖情人條款），向法院聲請保護令，命相對人遠離住居所與工作地至少100公尺，並禁止騷擾與通訊。',
      situation: '男女朋友或同居人施以肢體暴力、性暴力、恐嚇威脅、瘋狂傳送騷擾訊息。',
      recommendedAction: '向地方法院聲請「親密關係伴侶民事保護令」，並向警局報案取得受處理案件證明單。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'DOMESTIC_VIOLENCE_PROTECTION_ORDER',
      feeInfo: '保護令聲請免徵裁判費（0 元）',
      timeInfo: '隨時可具狀向法院聲請，情況緊急可由警方協助聲請緊急保護令',
      mustPrepare: ['醫院急診驗傷診斷證明書影本', '恐嚇騷擾之 LINE 截圖、錄音錄影與通聯紀錄', '警察局受處理家庭暴力事件紀錄表'],
      tags: ['家暴', '保護令', '恐怖情人', '親密暴力', '跟蹤騷擾', '被打', '威脅', '女友家暴', '男友家暴', '家庭暴力防治法', '暫時保護令']
    },
    // 0.2 侵害性自主權民事損害賠償
    {
      id: 'civil-tort-sexual-assault',
      category: 'SAFETY',
      icon: Scale,
      color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
      title: '性侵害 / 妨害性自主請求精神慰撫金與醫療損害賠償',
      plainDesc: '遭受性侵害或非自願性行為導致身心人格權遭受重大創傷。依民法第184條及第195條，可向法院提起民事訴訟，請求加害人賠償非財產上精神慰撫金、心理諮商費與醫療復健支出。',
      situation: '刑事案件偵辦中或起訴後，欲向加害者求償精神慰撫金與醫療復健費用。',
      recommendedAction: '產製「侵害性自主權損害賠償民事起訴狀」，或於刑事庭審理中提出刑事附帶民事訴訟（免裁判費）。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CIVIL_TORT_SEXUAL_ASSAULT',
      feeInfo: '刑事起訴後提附帶民事免裁判費；獨立民事起訴依請求金額徵收裁判費',
      timeInfo: '民事侵權時效：知悉損害及賠償義務人起 2 年內，或行為後 10 年內',
      mustPrepare: ['精神科診斷證明書與心理諮商收據單據', '相關刑事告訴狀、筆錄或判決資料', '案發事實與對話截圖證物'],
      tags: ['性侵求償', '精神慰撫金', '慰撫金', '妨害性自主民事', '侵權行為', '心理諮商費', '損害賠償']
    },
    // 0.3 遭伴侶/同居人/他人竊盜、侵占或盜領
    {
      id: 'theft-embezzlement-victim',
      category: 'SAFETY',
      icon: ShieldAlert,
      color: 'from-amber-500/20 to-red-500/20 border-amber-500/30 text-amber-400',
      title: '被女友/男友/同居人/他人竊盜財物、盜領存摺或侵占不還',
      plainDesc: '伴侶、同居人或他人未經同意拿走現金、偷拿存摺印章盜領存款、盜刷信用卡、或借用貴重物品（筆電/名牌包/車輛）拒不返還。一般伴侶為非告訴乃論公訴罪（刑法§320竊盜、§335侵占）；若為同居親屬依刑法§324須於6個月內提告。可具狀提告並請求物上返還與賠償。',
      situation: '發現財物失竊、銀行存款被伴侶擅自提領、或借用之貴重物品被霸佔不歸還。',
      recommendedAction: '使用「竊盜罪/侵占罪刑事告訴狀」向地檢署提告，並可產製「返還所有物民事起訴狀」民事求償。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CRIMINAL_COMPLAINT_THEFT',
      feeInfo: '刑事提告 0 元；民事返還起訴依訴訟標的徵收裁判費',
      timeInfo: '一般人/非同居伴侶為公訴罪隨時可偵辦；同居伴侶/親屬為告訴乃論「6個月內」必須具狀提出',
      mustPrepare: ['失竊/遭侵占物品購買發票、原廠盒裝保卡或照片', '住處監視器畫面或大樓出入監控紀錄', '通訊軟體催討對話截圖（被告承認拿取/道歉對話）', '銀行存摺明細或ATM盜領影像'],
      tags: [
        '竊盜', '被竊盜', '偷竊', '被偷', '女友竊盜', '男友竊盜', '被我女友竊盜了',
        '我被我女友竊盜了', '同居人偷錢', '盜領', '盜刷', '侵占', '侵占財物',
        '東西不還', '偷拿存摺', '偷拿印章', '偷錢', '偷手機', '小偷', '親屬竊盜'
      ]
    },
    // 0.4 遭受恐嚇威脅與強制
    {
      id: 'intimidation-threat-victim',
      category: 'SAFETY',
      icon: ShieldAlert,
      color: 'from-red-500/20 to-orange-500/20 border-red-500/30 text-red-400',
      title: '遭受他人或恐怖情人言語恐嚇、傳訊威脅或強迫限制自由',
      plainDesc: '對方以言詞、文字訊息（如揚言加害生命、身體、家人、名譽或毀損財物）恐嚇威脅，致心生畏懼。依刑法第305條恐嚇危害安全罪或第304條強制罪，向地檢署提出告訴，並可向警局聲請告誡或保護令。',
      situation: '收到恐嚇簡訊、電話中揚言對當事人不利、遭強行阻擋去路或強迫做無義務之事。',
      recommendedAction: '提出「恐嚇危害安全罪刑事告訴狀」，並可同步聲請親密關係保護令。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CRIMINAL_COMPLAINT_INTIMIDATION',
      feeInfo: '刑事提告 0 元',
      timeInfo: '恐嚇罪為非告訴乃論公訴罪，檢警知悉即應主動追訴',
      mustPrepare: ['恐嚇文字通訊軟體（LINE/簡訊）完整截圖', '電話錄音光碟與譯文', '警局報案證明單'],
      tags: ['恐嚇', '威脅', '被威脅', '恐怖情人', '恐嚇簡訊', '揚言打人', '強制罪', '妨害自由']
    },
    // 0.5 偷拍、妨害秘密與散布性影像
    {
      id: 'privacy-sexual-image-victim',
      category: 'SAFETY',
      icon: ShieldAlert,
      color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-400',
      title: '遭偷拍窺視、竊錄私密部位、或遭威脅散布性私密影像',
      plainDesc: '遭人無故偷拍更衣沐浴、竊錄私密活動，或前任/他人揚言外流散布私密照。刑法第315條之1妨害秘密罪及第319條之3未經同意散布性影像罪（重刑公訴罪），檢警得緊急扣押並向法院聲請銷毀刪除。',
      situation: '發現被裝針孔偷拍、被偷拍裙底、或對方以私密照片作為威脅籌碼。',
      recommendedAction: '提出「妨害秘密/散布性影像刑事告訴狀」，並請求檢察官扣押相關設備與雲端檔案。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CRIMINAL_COMPLAINT_PRIVACY',
      feeInfo: '刑事提告 0 元',
      timeInfo: '散布性私密影像為非告訴乃論重罪；妨害秘密為6個月告訴乃論',
      mustPrepare: ['偷拍設備照片、發現針孔位置照片', '散布網址、群組對話截圖與檔案傳輸紀錄', '遭恐嚇外流之對話證據'],
      tags: ['偷拍', '妨害秘密', '散布私密照', '性私密影像', '針孔', '私密照威脅', '外流']
    },
    // 0.6 民事請求返還所有物與侵權求償
    {
      id: 'civil-restitution-property',
      category: 'DEBT',
      icon: Scale,
      color: 'from-emerald-500/20 to-cyan-500/20 border-emerald-500/30 text-emerald-400',
      title: '物品被侵占/借走不還（請求返還所有物與金錢損害賠償）',
      plainDesc: '個人所有之貴重物品、名車、珠寶或生財器具被他人無權占有或霸佔拒還。依民法第767條物上請求權與第184條侵權行為，向法院起訴請求返還原物，若原物已滅失或毀損，則請求金錢等價賠償。',
      situation: '物品借給朋友/伴侶後對方霸佔不還、或遭他人無權侵占處分。',
      recommendedAction: '寄發「催告返還存證信函」或提起「返還所有物民事起訴狀」。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CIVIL_TORT_GENERAL',
      feeInfo: '依返還標的物之市價核算民事裁判費（約1%~1.5%）',
      timeInfo: '民事侵權時效為 2 年，物上返還請求權時效為 15 年（不動產無消滅時效）',
      mustPrepare: ['購買發票、所有權證明或出資購買流水帳', '雙方催討返還之對話紀錄與存證信函', '物品被他人占有使用之照片或證物'],
      tags: ['物上請求權', '所有物返還', '東西不還', '侵占物品', '返還財物', '損害賠償']
    },
    // 1. 車禍事故
    {
      id: 'car-accident-injury',
      category: 'ACCIDENT',
      icon: Car,
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
      title: '發生車禍有人受傷（對方不賠償/想告過失傷害）',
      plainDesc: '車禍造成受傷，對方態度消極不賠償。可在「6個月內」向地檢署或警察局提出刑事過失傷害告訴，迫使對方出面調解，並於刑事起訴後提出「附帶民事訴訟」免繳裁判費求償。',
      situation: '車禍發生後 6 個月內、有醫院驗傷單、對方拒絕和解或賠償金額談不攏。',
      recommendedAction: '使用「車禍過失傷害刑事告訴狀」提告，並準備「刑事附帶民事起訴狀」求償醫療費與車損。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CRIMINAL_COMPLAINT_TRAFFIC',
      feeInfo: '提告刑事 0 元（附帶民事訴訟免徵裁判費）',
      timeInfo: '時效極嚴：車禍發生日起「6個月內」必須提出',
      mustPrepare: ['道路交通事故當事人登記聯單 / 初判表', '公私立醫院診斷證明書（載明傷勢）', '醫療收據、修車估價單、行車記錄器影片'],
      tags: ['車禍', '受傷', '過失傷害', '附帶民事', '修車費', '診斷書']
    },
    // 2. 債務催討
    {
      id: 'debt-default-unpaid',
      category: 'DEBT',
      icon: Coins,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
      title: '朋友/他人借錢不還（有借據或LINE對話紀錄）',
      plainDesc: '借錢給別人到了還款日一直拖延。先發「存證信函」催告並中斷時效，若對方仍不還，可向法院聲請「支付命令」（僅500元規費、免開庭）或本票裁定，快速取得強制執行名義查封對方薪水與財產。',
      situation: '借款期限已到期、有匯款紀錄/借據/對話紀錄、對方已讀不回或避不見面。',
      recommendedAction: '先寄「借款清償催告存證信函」，屆期不理則聲請「民事支付命令」或「本票裁定」。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'DEMAND_LETTER_DEBT',
      feeInfo: '存證信函郵資約 100~200 元；法院支付命令聲請費 500 元',
      timeInfo: '借款本金消滅時效為 15 年，但應儘速催討避免對方脫產',
      mustPrepare: ['借據契約或借款LINE對話截圖', '銀行/郵局轉帳匯款明細', '借款人姓名、戶籍地址或身分證字號'],
      tags: ['借錢不還', '借據', '支付命令', '存證信函', '本票', '強制執行', '扣押薪水']
    },
    // 3. 詐騙防禦
    {
      id: 'fraud-scam-victim',
      category: 'FRAUD',
      icon: ShieldAlert,
      color: 'from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-400',
      title: '遭遇網路詐騙 / 假投資 / 被騙匯款到人頭帳戶',
      plainDesc: '誤信網路投資、交友或網購詐騙，將錢轉入他人帳戶。應立即報警（165圈存），並具狀向地檢署提出「加重詐欺罪刑事告訴狀」，請求檢警清查人頭帳戶、車手與金流，後續提起刑事附帶民事求償。',
      situation: '已將款項匯出、對方失聯封鎖或帳戶被警示。',
      recommendedAction: '提出「網路詐騙/投資詐欺刑事告訴狀」，詳列受款帳號與通訊紀錄。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CRIMINAL_COMPLAINT_FRAUD',
      feeInfo: '刑事告訴 0 元',
      timeInfo: '越快報案越有機會在人頭帳戶被提領前凍結款項',
      mustPrepare: ['所有匯款單據、網銀轉帳成功截圖', '詐騙集團通訊軟體完整對話紀錄', '假投資平台網址、帳號、截圖'],
      tags: ['詐騙', '假投資', '人頭帳戶', '車手', '刑事告訴', '加重詐欺']
    },
    // 3.1 誤將提款卡/存摺寄給詐騙集團（人頭帳戶與洗錢防禦）
    {
      id: 'fraud-card-sent-victim',
      category: 'FRAUD',
      icon: ShieldAlert,
      color: 'from-red-600/20 to-rose-600/20 border-red-500/40 text-red-400',
      title: '誤把銀行提款卡/存摺寄給詐騙集團（求職/貸款被騙，防止變人頭帳戶）',
      plainDesc: '因假求職、假貸款、租借帳戶或虛擬幣兼職，誤將提款卡、密碼、存摺以超商賣貨便或快遞寄出。這有高度風險淪為「詐欺幫助犯」及「洗錢防制法人頭帳戶」並遭列警示帳戶！必須黃金時間採 3 步驟：立即掛失停卡、前往警局報案並取得受理案件證明單、保留完整對話截圖以自證無犯罪故意。',
      situation: '已把金融卡或密碼寄給對方、對方稱要美化金流或測試帳戶後失聯。',
      recommendedAction: '1. 立即致電銀行 24H 客服掛失 2. 備齊對話紀錄至派出所報案自首/說明 3. 具狀向地檢署陳報「刑事自白/被騙陳報狀」。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'CRIMINAL_COMPLAINT_FRAUD',
      feeInfo: '掛失停卡 0 元；警局報案 0 元',
      timeInfo: '「極度緊急」：必須在該帳戶有被害人受騙匯入變成「警示帳戶」前立即辦理掛失與報案！',
      mustPrepare: ['假貸款/假求職的完整通訊軟體（LINE/FB）招募對話截圖', '超商寄件小白單、包裹配送單號憑證', '銀行掛失紀錄與警局報案受處理案件證明單'],
      tags: [
        '我把卡片寄給詐騙集團了', '卡片寄給詐騙', '寄卡片', '寄提款卡', '寄存摺', '把卡片寄出',
        '卡片被騙', '寄提款卡給詐騙集團', '買簿子', '人頭帳戶', '警示帳戶', '洗錢防制法',
        '假求職寄卡', '假貸款寄卡', '被當人頭帳戶', '幫助詐欺'
      ]
    },
    // 4. 家事與遺產
    {
      id: 'inheritance-and-will',
      category: 'FAMILY',
      icon: HeartHandshake,
      color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-400',
      title: '長輩過世分遺產 / 算特留分 / 拋棄繼承 / 預立自書遺囑',
      plainDesc: '長輩過世面對遺產分配爭議，或長輩生前想立合法遺囑。系統提供法定應繼分與特留分試算、自書遺囑合規模板（民法1190條要件防呆）、以及負債大於財產時的拋棄繼承聲請狀（3個月內）。',
      situation: '長輩身故分配遺產、被剝奪繼承權想爭取特留分、或過世長輩負債大於遺產。',
      recommendedAction: '使用「法定繼承系統表與應繼分試算」，或產生「拋棄繼承聲請狀」。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'INHERITANCE_CALCULATOR',
      feeInfo: '拋棄繼承家事法院規費 1,000 元',
      timeInfo: '拋棄繼承必須在「知悉得繼承之日起 3 個月內」向法院提出',
      mustPrepare: ['被繼承人死亡證明書或除戶戶籍謄本', '全體繼承人現戶戶籍謄本與繼承系統表', '印鑑證明與印鑑章（拋棄繼承用）'],
      tags: ['遺產', '繼承', '特留分', '應繼分', '自書遺囑', '拋棄繼承', '分產']
    },
    // 5. 兩願離婚與侵害配偶權
    {
      id: 'divorce-spousal-rights',
      category: 'FAMILY',
      icon: HeartHandshake,
      color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-400',
      title: '夫妻協議離婚 / 配偶出軌外遇求償（侵害配偶權）',
      plainDesc: '雙方同意平順離婚，需簽署具備兩位見證人的標準離婚協議書，並約定子女監護、探視與剩餘財產分配；若配偶與第三者外遇交往，可提起民事侵害配偶權起訴狀請求連帶精神慰撫金。',
      situation: '協議和平離婚辦理登記，或蒐集到外遇出軌證據請求精神賠償。',
      recommendedAction: '產製標準「兩願離婚協議書」或「侵害配偶權民事起訴狀」。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'DIVORCE_AGREEMENT',
      feeInfo: '協議離婚戶政登記規費數十元；侵害配偶權民事訴訟依請求金額徵收裁判費',
      timeInfo: '侵害配偶權時效：知悉損害及賠償義務人起 2 年內，或行為後 10 年內',
      mustPrepare: ['戶口名簿與身分證', '未成年子女監護與扶養費協議內容', '外遇對話紀錄、出遊照片、旅館發票或承認外遇錄音'],
      tags: ['離婚協議書', '監護權', '扶養費', '侵害配偶權', '外遇', '出軌', '精神慰撫金']
    },
    // 6. 高齡長輩防掏空
    {
      id: 'elderly-guardianship',
      category: 'ELDERLY',
      icon: UserCheck,
      color: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400',
      title: '長輩失智/中風/無法自理（防被騙賣房或財產被掏空）',
      plainDesc: '長輩患有失智症或意識不清，擔心遭有心人士誘騙過戶房屋、提領存款或借貸。向法院聲請「監護宣告」（完全無判斷力）或「輔助宣告」（輕度失智），由法院指定監護人管理財產並由親屬會同開具清冊，徹底鎖死名下資產。',
      situation: '長輩診斷出中重度失智（CDR≥1）、中風臥床、無法辨識法律行為效果。',
      recommendedAction: '產生「民事監護宣告聲請狀」或「民事輔助宣告聲請狀」，向法院家事庭聲請。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'GUARDIANSHIP_PETITION',
      feeInfo: '家事法院聲請費 1,000 元（需配合法院指定醫院精神鑑定，鑑定費約 1~2 萬元由聲請人代墊）',
      timeInfo: '自具狀至法院裁定約需 3~6 個月',
      mustPrepare: ['長輩之公私立醫院診斷證明書（載明失智程度/心智狀況）', '長輩與聲請人戶籍謄本', '全體推定繼承人同意書與財產清冊（房屋土地權狀、存摺）'],
      tags: ['失智', '監護宣告', '輔助宣告', '防掏空', '意定監護', '老人財產']
    },
    // 7. 租屋糾紛與買賣裝潢
    {
      id: 'rental-and-defect',
      category: 'CONTRACT',
      icon: Home,
      color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
      title: '房客欠租不搬 / 房東亂扣押金 / 裝潢工程瑕疵延宕',
      plainDesc: '房客積欠租金達 2 個月以上經催告仍不付，可寄發存證信函終止租約並請求搬遷；買賣房屋漏水或裝潢工程施工偷工減料，依法發函限期修補，逾期得解除契約或雇工代修求償。',
      situation: '房客欠租扣抵押金後滿2個月、租約到期賴著不走、或裝潢施工出現重大瑕疵。',
      recommendedAction: '寄發「積欠租金催告暨終止租約存證信函」或「工程瑕疵限期修補存證信函」。',
      targetToolId: 'legalToolbox',
      targetSubTool: 'DEMAND_LETTER_RENT_DEFAULT',
      feeInfo: '郵局存證信函每份郵資約 100~200 元',
      timeInfo: '瑕疵通知後 6 個月內需行使權利',
      mustPrepare: ['租賃契約書或工程承攬合約書', '欠租金額計算表、催告簡訊紀錄', '瑕疵照片、影片、第三方驗屋報告或修繕估價單'],
      tags: ['租屋', '欠租', '終止租約', '存證信函', '裝潢瑕疵', '押金', '房屋買賣']
    },
    // 8. 收到法院判決要上訴
    {
      id: 'court-appeal-litigation',
      category: 'LITIGATION',
      icon: Scale,
      color: 'from-amber-500/20 to-yellow-500/20 border-yellow-500/30 text-yellow-400',
      title: '收到法院判決書不服（想要提上訴 / 算20天上訴期）',
      plainDesc: '收到地方法院判決後如果對結果不服，必須在「判決送達後 20 日內」提出上訴狀。一站式上訴系統可自動拆解原判決的認定缺失、法條適用錯誤與理由不備，直接生成具體上訴理由書。',
      situation: '剛收到法院寄來的民事或刑事一審判決書、想在法定期間內聲明上訴。',
      recommendedAction: '進入「訴訟與上訴一站式中心」，先試算 20 天死線，再匯入判決書自動產製上訴理由狀。',
      targetToolId: 'litigation',
      targetSubTab: 'appeal',
      feeInfo: '上訴民事二審需依訴訟標的繳納裁判費（約本金1.5%），刑事上訴免裁判費',
      timeInfo: '極度緊急：判決合法送達次日起算「20 日內」必須提出上訴狀！',
      mustPrepare: ['法院一審判決書全文（PDF或文字）', '判決書送達證書或郵差投遞簽收日期', '原審未被採納之重要證據或有利證人名單'],
      tags: ['上訴', '判決書', '20天死線', '上訴理由書', '原判決違背法令', '二審']
    },
    // 9. 檢查律師或對造書狀有無假法條
    {
      id: 'doc-ai-anti-ghost',
      category: 'CHECKER',
      icon: FileCheck2,
      color: 'from-emerald-500/20 to-green-500/20 border-green-500/30 text-green-400',
      title: '收到對方律師書狀或判決（想查案號真偽 / AI防幽靈檢核）',
      plainDesc: '對方提告提出的書狀、或自己準備的法律文件，擔心引用了不存在的「假案號」或「過期幽靈法條」。使用司法院真實裁判資料庫比對，1秒抓出虛構判決與法律錯誤。',
      situation: '準備向法院遞狀前自我檢查，或審閱對造當事人提出之答辯狀與引證判例。',
      recommendedAction: '使用「司法院判決檢索與 AI 真確性檢核」，貼上文字一鍵掃描。',
      targetToolId: 'checker',
      targetSubTab: 'antiGhost',
      feeInfo: '免費檢核',
      timeInfo: '即時檢核（約 1~2 秒完成）',
      mustPrepare: ['欲檢核之書狀、答辯狀或合約文字'],
      tags: ['檢核', '防幽靈法條', '假判決', '司法院檢索', '案號查證', 'AI查核']
    }
];
export const SCENARIO_CATEGORIES = [
    { id: 'ALL', label: '全部生活情境' },
    { id: 'SAFETY', label: '🛡️ 性侵/家暴/人身安全' },
    { id: 'ACCIDENT', label: '🚗 車禍求償' },
    { id: 'DEBT', label: '💰 借錢欠款' },
    { id: 'FRAUD', label: '⚠️ 詐騙被騙' },
    { id: 'FAMILY', label: '👨‍👩‍👧 離婚遺產' },
    { id: 'ELDERLY', label: '🧓 高齡安養' },
    { id: 'CONTRACT', label: '🏠 租屋契約' },
    { id: 'LITIGATION', label: '⚖️ 訴訟上訴' },
    { id: 'CHECKER', label: '🔍 查假法條' }
  ];
