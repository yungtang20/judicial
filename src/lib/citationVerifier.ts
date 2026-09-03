import { CitationVerificationResult, RealStatuteDatabaseItem, RealPrecedentDatabaseItem } from '../types';

/**
 * Verified Real Statutory Database (Taiwan Major Procedural and Substantive Laws)
 */
export const VERIFIED_REAL_STATUTES: Record<string, RealStatuteDatabaseItem> = {
  // 民法
  '民法第14條': {
    lawName: '民法',
    article: '第14條',
    maxParagraphs: 4,
    keywords: ['監護宣告', '精神障礙', '心智缺陷', '致不能為意思表示'],
    officialSummary: '對於因精神障礙或其他心智缺陷，致不能為意思表示或受意思表示，或不能辨識其意思表示之效果者，法院得依聲請為監護之宣告。'
  },
  '民法第15條': {
    lawName: '民法',
    article: '第15條',
    maxParagraphs: 1,
    keywords: ['無行為能力', '監護宣告之效力'],
    officialSummary: '受監護宣告之人，無行為能力。'
  },
  '民法第15條之1': {
    lawName: '民法',
    article: '第15條之1',
    maxParagraphs: 3,
    keywords: ['輔助宣告', '辨識能力顯有不足', '家事法院'],
    officialSummary: '對於因精神障礙或其他心智缺陷，致其為意思表示或受意思表示，或辨識其意思表示效果之能力，顯有不足者，法院得依聲請為輔助之宣告。'
  },
  '民法第15條之2': {
    lawName: '民法',
    article: '第15條之2',
    maxParagraphs: 3,
    keywords: ['輔助人同意權', '處分不動產', '消費借貸', '遺產分割'],
    officialSummary: '受輔助宣告之人為重要法律行為（如處分不動產、消費借貸、遺產分割），應得輔助人之同意。'
  },
  '民法第125條': {
    lawName: '民法',
    article: '第125條',
    maxParagraphs: 1,
    keywords: ['消滅時效', '十五年'],
    officialSummary: '請求權，因十五年間不行使而消滅。但法律所定期間較短者，依其規定。'
  },
  '民法第129條': {
    lawName: '民法',
    article: '第129條',
    maxParagraphs: 2,
    keywords: ['消滅時效', '中斷', '請求', '承認', '起訴'],
    officialSummary: '消滅時效，因左列事由而中斷：一、請求。二、承認。三、起訴。'
  },
  '民法第144條': {
    lawName: '民法',
    article: '第144條',
    maxParagraphs: 2,
    keywords: ['時效抗辯', '拒絕給付', '時效完成'],
    officialSummary: '時效完成後，債務人得拒絕給付。請求權已經時效消滅，債務人仍為履行之給付者，不得以不知時效為理由，請求返還。'
  },
  '民法第179條': {
    lawName: '民法',
    article: '第179條',
    maxParagraphs: 1,
    keywords: ['不當得利', '無法律上之原因', '受利益', '致他人受損害'],
    officialSummary: '無法律上之原因而受利益，致他人受損害者，應返還其利益。雖有法律上之原因，而其後已不存在者，亦同。'
  },
  '民法第184條': {
    lawName: '民法',
    article: '第184條',
    maxParagraphs: 2,
    keywords: ['侵權行為', '故意或過失', '不法侵害他人之權利', '背於善良風俗'],
    officialSummary: '因故意或過失，不法侵害他人之權利者，負損害賠償責任。故意以背於善良風俗之方法，加損害於他人者亦同。'
  },
  '民法第191條之2': {
    lawName: '民法',
    article: '第191條之2',
    maxParagraphs: 1,
    keywords: ['動力車輛', '交通事故', '駕駛人責任'],
    officialSummary: '汽車、機車或其他非依軌道行駛之動力車輛，在使用中加損害於他人者，駕駛人應賠償因此所生之損害。但於防止損害之發生，已盡相當之注意者，不在此限。'
  },
  '民法第193條': {
    lawName: '民法',
    article: '第193條',
    maxParagraphs: 2,
    keywords: ['身體健康侵害', '勞動能力減少', '生活需要增加'],
    officialSummary: '不法侵害他人之身體或健康者，對於被害人因此喪失或減少勞動能力或增加生活上之需要時，應負損害賠償責任。'
  },
  '民法第195條': {
    lawName: '民法',
    article: '第195條',
    maxParagraphs: 3,
    keywords: ['精神慰撫金', '非財產上損害', '人格法益', '名譽回復'],
    officialSummary: '不法侵害他人之身體、健康、名譽、自由、信用、隱私、貞操，或不法侵害其他人格法益而情節重大者，被害人雖非財產上之損害，亦得請求賠償相當之金額。'
  },
  '民法第203條': {
    lawName: '民法',
    article: '第203條',
    maxParagraphs: 1,
    keywords: ['法定利率', '週年百分之五'],
    officialSummary: '應付利息之債務，其利率未經約定，亦無法律可據者，週年利率為百分之五。'
  },
  '民法第205條': {
    lawName: '民法',
    article: '第205條',
    maxParagraphs: 1,
    keywords: ['約定最高利率', '週年百分之十六', '超過部分無效'],
    officialSummary: '約定利率，超過週年百分之十六者，超過部分之約定，無效。'
  },
  '民法第207條': {
    lawName: '民法',
    article: '第207條',
    maxParagraphs: 2,
    keywords: ['複利禁止', '利息滾入原本'],
    officialSummary: '利息不得滾入原本再生利息。但當事人以書面約定，利息遲付逾一年後，經催告而不償還時，債權人得將遲付之利息滾入原本者，依其約定。'
  },
  '民法第213條': {
    lawName: '民法',
    article: '第213條',
    maxParagraphs: 3,
    keywords: ['回復原狀', '損害賠償方式'],
    officialSummary: '負損害賠償責任者，除法律另有規定或契約另有訂定外，應回復他方受損害前之原狀。'
  },
  '民法第216條': {
    lawName: '民法',
    article: '第216條',
    maxParagraphs: 2,
    keywords: ['損害賠償範圍', '所受損害', '所失利益'],
    officialSummary: '損害賠償，除法律另有規定或契約另有訂定外，應以填補債權人所受損害及所失利益為限。'
  },
  '民法第217條': {
    lawName: '民法',
    article: '第217條',
    maxParagraphs: 3,
    keywords: ['與有過失', '過失相抵'],
    officialSummary: '損害之發生或擴大，被害人與有過失者，法院得減輕賠償金額，或免除之。'
  },
  '民法第356條': {
    lawName: '民法',
    article: '第356條',
    maxParagraphs: 3,
    keywords: ['買受人檢查義務', '瑕疵通知'],
    officialSummary: '買受人應按物之性質，依通常程序從速檢查其所受領之物。如發見有應由出賣人負擔保責任之瑕疵時，應即通知出賣人。'
  },
  '民法第440條': {
    lawName: '民法',
    article: '第440條',
    maxParagraphs: 3,
    keywords: ['租金遲延', '催告', '欠租達二個月終止租約'],
    officialSummary: '承租人租金支付有遲延者，出租人得定相當期限，催告承租人支付租金，如承租人於其期限內不為支付，出租人得終止契約。租賃物為房屋者，遲付租金之總額，非達二個月之租額，不得依前項之規定，終止契約。'
  },
  '民法第474條': {
    lawName: '民法',
    article: '第474條',
    maxParagraphs: 2,
    keywords: ['消費借貸', '合意', '交付金錢', '移轉金錢所有權'],
    officialSummary: '稱消費借貸者，謂當事人約定，一方移轉金錢或其他代替物之所有權於他方，而約定他方以種類、品質、數量相同之物返還之契約。'
  },
  '民法第478條': {
    lawName: '民法',
    article: '第478條',
    maxParagraphs: 1,
    keywords: ['消費借貸返還期限', '催告返還'],
    officialSummary: '借用人應於約定期限內，返還與借用物種類、品質、數量相同之物，未定返還期限者，借用人得隨時返還，貸與人亦得定一個月以上之相當期限，催告返還。'
  },
  '民法第492條': {
    lawName: '民法',
    article: '第492條',
    maxParagraphs: 1,
    keywords: ['承攬瑕疵擔保', '約定品質'],
    officialSummary: '承攬人完成工作，應使其具備約定之品質及無減少或滅失價值或不適於通常或約定使用之瑕疵。'
  },
  '民法第493條': {
    lawName: '民法',
    article: '第493條',
    maxParagraphs: 3,
    keywords: ['承攬瑕疵修補', '定作人自行修補償還費用'],
    officialSummary: '工作有瑕疵者，定作人得定相當期限，請求承攬人修補之。承攬人不於前項期限內修補者，定作人得自行修補，並得向承攬人請求償還修補必要之費用。'
  },
  '民法第767條': {
    lawName: '民法',
    article: '第767條',
    maxParagraphs: 1,
    keywords: ['物上請求權', '所有人對於無權占有其所有物者得請求返還', '除去妨害'],
    officialSummary: '所有人對於無權占有或侵奪其所有物者，得請求返還之。對於妨害其所有權者，得請求除去之。有妨害其所有權之虞者，得請求防止之。'
  },
  '民法第1030條': {
    lawName: '民法',
    article: '第1030條',
    maxParagraphs: 4,
    keywords: ['剩餘財產差額分配'],
    officialSummary: '法定財產制關係消滅時，夫妻剩餘財產之差額分配（同民法第1030條之1意旨）。'
  },
  '民法第1030條之1': {
    lawName: '民法',
    article: '第1030條之1',
    maxParagraphs: 4,
    keywords: ['剩餘財產差額分配', '法定財產制消滅', '平均分配'],
    officialSummary: '法定財產制關係消滅時，夫或妻現存之婚後財產，扣除婚姻關係存續所負債務後，如有剩餘，其雙方剩餘財產之差額，應平均分配。'
  },
  '民法第1049條': {
    lawName: '民法',
    article: '第1049條',
    maxParagraphs: 1,
    keywords: ['兩願離婚', '協議離婚'],
    officialSummary: '夫妻得以兩願離婚。但未成年人，應得法定代理人之同意。'
  },
  '民法第1050條': {
    lawName: '民法',
    article: '第1050條',
    maxParagraphs: 1,
    keywords: ['兩願離婚方式', '書面', '二人以上證人簽名', '戶政登記'],
    officialSummary: '兩願離婚，應以書面為之，有二人以上證人之簽名並應向戶政機關為離婚之登記。'
  },
  '民法第1052條': {
    lawName: '民法',
    article: '第1052條',
    maxParagraphs: 2,
    keywords: ['裁判離婚', '重大事由難以維持婚姻'],
    officialSummary: '夫妻之一方，有重大事由難以維持婚姻者，得向法院請求裁判離婚。'
  },
  '民法第1055條': {
    lawName: '民法',
    article: '第1055條',
    maxParagraphs: 5,
    keywords: ['未成年子女親權', '監護權酌定'],
    officialSummary: '夫妻離婚者，對於未成年子女權利義務之行使或負擔，依協議由一方或雙方共同任之。未為協議或協議不成者，法院得依聲請酌定之。'
  },
  '民法第1113條': {
    lawName: '民法',
    article: '第1113條',
    maxParagraphs: 1,
    keywords: ['成年人監護準用'],
    officialSummary: '成年人之監護，除本節有規定者外，準用關於未成年人監護之規定。'
  },
  '民法第1113條之2': {
    lawName: '民法',
    article: '第1113條之2',
    maxParagraphs: 2,
    keywords: ['意定監護', '公證人', '意思能力'],
    officialSummary: '稱意定監護者，謂本人與受任人約定，於本人受監護宣告時，受任人答應擔任監護人之契約。'
  },
  '民法第1138條': {
    lawName: '民法',
    article: '第1138條',
    maxParagraphs: 1,
    keywords: ['法定繼承人', '配偶', '直系血親卑親屬', '父母', '兄弟姊妹', '祖父母'],
    officialSummary: '遺產繼承人，除配偶外，依左列順序定之：一、直系血親卑親屬。二、父母。三、兄弟姊妹。四、祖父母。'
  },
  '民法第1144條': {
    lawName: '民法',
    article: '第1144條',
    maxParagraphs: 1,
    keywords: ['應繼分', '配偶之應繼分', '同順序繼承人平均'],
    officialSummary: '配偶有相互繼承遺產之權，其應繼分依各順序與直系血親卑親屬均分，或與父母/兄弟姊妹按比例繼承。'
  },
  '民法第1174條': {
    lawName: '民法',
    article: '第1174條',
    maxParagraphs: 3,
    keywords: ['拋棄繼承', '知悉得繼承起三個月內', '書面向法院為之'],
    officialSummary: '繼承人得拋棄其繼承權。前項拋棄，應於知悉其得繼承之時起三個月內，以書面向法院為之。並以書面通知因其拋棄而應為繼承之人。'
  },
  '民法第1190條': {
    lawName: '民法',
    article: '第1190條',
    maxParagraphs: 1,
    keywords: ['自書遺囑', '自書全文', '記明年日月', '親自簽名', '非打字'],
    officialSummary: '自書遺囑者，應自書遺囑全文，記明年、月、日，並親自簽名；如有增減、塗改，應註明增減、塗改之處所及字數，另行簽名。'
  },
  '民法第1223條': {
    lawName: '民法',
    article: '第1223條',
    maxParagraphs: 1,
    keywords: ['特留分', '直系血親卑親屬二分之一', '父母二分之一', '配偶二分之一', '兄弟姊妹三分之一'],
    officialSummary: '繼承人之特留分，依左列規定：直系血親卑親屬、父母、配偶為其應繼分二分之一；兄弟姊妹、祖父母為三分之一。'
  },
  '民法第1225條': {
    lawName: '民法',
    article: '第1225條',
    maxParagraphs: 1,
    keywords: ['特留分扣減權', '遺贈扣減'],
    officialSummary: '應得特留分之人，如因被繼承人所為之遺贈，致其應得之數不足者，得按其不足之數由遺贈財產扣減之。受遺贈人有數人時，應按其受遺贈價額比例扣減。'
  },
  // 民事訴訟法
  '民事訴訟法第277條': {
    lawName: '民事訴訟法',
    article: '第277條',
    maxParagraphs: 1,
    keywords: ['舉證責任', '有利於己之事實', '規範說'],
    officialSummary: '當事人主張有利於己之事實者，就其事實有舉證之責任。但法律別有規定，或依其情形顯失公平者，不在此限。'
  },
  '民事訴訟法第279條': {
    lawName: '民事訴訟法',
    article: '第279條',
    maxParagraphs: 3,
    keywords: ['自認', '毋庸舉證', '追認', '撤銷自認'],
    officialSummary: '當事人主張之事實，經他造於準備書狀內或言詞辯論時，或在受命法官、受託法官前自認者，無庸舉證。自認之撤銷，除別有規定外，以自認人能證明與事實不符且係出於錯誤者為限。'
  },
  '民事訴訟法第358條': {
    lawName: '民事訴訟法',
    article: '第358條',
    maxParagraphs: 2,
    keywords: ['私文書', '本人簽名蓋章', '推定為真正'],
    officialSummary: '私文書經本人或其代理人簽名、蓋章或按指印或有法院或公證人之認證者，推定為真正。'
  },
  '民事訴訟法第508條': {
    lawName: '民事訴訟法',
    article: '第508條',
    maxParagraphs: 2,
    keywords: ['支付命令', '督促程序', '金錢請求'],
    officialSummary: '債權人之請求，以給付一定數量之金錢、可代替物或有價證券為標的者，得聲請法院發支付命令。'
  },
  // 票據法
  '票據法第123條': {
    lawName: '票據法',
    article: '第123條',
    maxParagraphs: 1,
    keywords: ['本票裁定', '發票人', '向法院聲請裁定後強制執行'],
    officialSummary: '執票人向本票發票人行使追索權時，得聲請法院裁定後強制執行。'
  },
  // 刑法
  '刑法第284條': {
    lawName: '刑法',
    article: '第284條',
    maxParagraphs: 1,
    keywords: ['過失傷害', '因過失傷害人', '過失致重傷'],
    officialSummary: '因過失傷害人者，處一年以下有期徒刑、拘役或十萬元以下罰金；致重傷者，處三年以下有期徒刑、拘役或三十萬元以下罰金。'
  },
  '刑法第310條': {
    lawName: '刑法',
    article: '第310條',
    maxParagraphs: 3,
    keywords: ['誹謗罪', '散布文字圖畫', '指摘或傳述毀損他人名譽'],
    officialSummary: '意圖散布於眾，而指摘或傳述足以毀損他人名譽之事者，為誹謗罪，處一年以下有期徒刑、拘役或一萬五千元以下罰金。散布文字、圖畫犯前項之罪者，處二年以下有期徒刑、拘役或三萬元以下罰金。'
  },
  '刑法第315條': {
    lawName: '刑法',
    article: '第315條',
    maxParagraphs: 1,
    keywords: ['妨害書信秘密', '開拆隱匿他人信函', '窺視內容'],
    officialSummary: '無故開拆或隱匿他人之封緘信函、文書或圖畫者，處拘役或九千元以下罰金。無故以開拆以外之方法，窺視其內容者，亦同。'
  },
  '刑法第315條之1': {
    lawName: '刑法',
    article: '第315條之1',
    maxParagraphs: 1,
    keywords: ['妨害秘密罪', '無故利用工具設備窺視竊聽', '竊錄他人非公開活動言論談話身體隱私部位'],
    officialSummary: '有下列行為之一者，處三年以下有期徒刑、拘役或三十萬元以下罰金：一、無故利用工具或設備窺視、竊聽他人非公開之活動、言論、談話或身體隱私部位者。二、無故以錄音、照相、錄影或電磁紀錄竊錄他人非公開之活動、言論、談話或身體隱私部位者。'
  },
  '刑法第319條之1': {
    lawName: '刑法',
    article: '第319條之1',
    maxParagraphs: 3,
    keywords: ['未經同意攝錄性影像', '科技方法攝錄性影像'],
    officialSummary: '未經他人同意，無故以照相、錄影、電磁紀錄或其他科技方法攝錄其性影像者，處三年以下有期徒刑。'
  },
  '刑法第319條之3': {
    lawName: '刑法',
    article: '第319條之3',
    maxParagraphs: 4,
    keywords: ['散布性私密影像', '未經同意散布性影像', '重刑公訴罪'],
    officialSummary: '未經他人同意，無故重製、散布、播送、交付、公然陳列，或以他法供人觀覽其性影像者，處五年以下有期徒刑，得併科五十萬元以下罰金。'
  },
  '刑法第339條': {
    lawName: '刑法',
    article: '第339條',
    maxParagraphs: 3,
    keywords: ['詐欺取財', '意圖為自己不法所有', '施用詐術', '陷於錯誤'],
    officialSummary: '意圖為自己或第三人不法之所有，以詐術使人將本人或第三人之物交付者，處五年以下有期徒刑、拘役或科或併科五十萬元以下罰金。'
  },
  '刑法第339條之4': {
    lawName: '刑法',
    article: '第339條之4',
    maxParagraphs: 2,
    keywords: ['加重詐欺', '冒用政府機關名義', '三人以上共同犯罪', '傳播工具向公眾散布'],
    officialSummary: '犯第三百三十九條詐欺罪而有下列情形之一者，處一年以上七年以下有期徒刑，得併科一百萬元以下罰金：一、冒用政府機關或公務員名義犯之。二、三人以上共同犯之。三、以廣播電視、電子通訊、網際網路或其他媒體等傳播工具，向公眾散布而犯之。'
  },
  '刑法第277條': {
    lawName: '刑法',
    article: '第277條',
    maxParagraphs: 2,
    keywords: ['普通傷害罪', '傷害人之身體或健康'],
    officialSummary: '傷害人之身體或健康者，處五年以下有期徒刑、拘役或五十萬元以下罰金。'
  },
    '刑法第10條': {
    lawName: '刑法',
    article: '第10條',
    maxParagraphs: 8,
    keywords: ['性交', '定義', '公務員', '重傷'],
    officialSummary: '稱性交者，謂非基於正當目的所為之下列性侵入行為...'
  },
  '家庭暴力防治法第2條': {
    lawName: '家庭暴力防治法',
    article: '第2條',
    maxParagraphs: 4,
    keywords: ['家庭暴力', '騷擾', '跟蹤', '親密關係伴侶'],
    officialSummary: '本法用詞定義：一、家庭暴力：指家庭成員間實施身體、精神或經濟上之騷擾、控制、脅迫或其他不法侵害之行為。'
  },
  '刑法第221條': {
    lawName: '刑法',
    article: '第221條',
    maxParagraphs: 2,
    keywords: ['強制性交罪', '違反意願', '強暴脅迫', '妨害性自主', '非告訴乃論'],
    officialSummary: '對於男女以強暴、脅迫、恐嚇、催眠術或其他違反其意願之方法而為性交者，處三年以上十年以下有期徒刑。前項之未遂犯罰之。'
  },
  '刑法第224條': {
    lawName: '刑法',
    article: '第224條',
    maxParagraphs: 1,
    keywords: ['強制猥褻罪', '違反意願', '妨害性自主'],
    officialSummary: '對於男女以強暴、脅迫、恐嚇、催眠術或其他違反其意願之方法，而為猥褻之行為者，處六月以上五年以下有期徒刑。'
  },
  '刑法第229條之1': {
    lawName: '刑法',
    article: '第229條之1',
    maxParagraphs: 1,
    keywords: ['非告訴乃論', '妨害性自主公訴', '告訴乃論除外'],
    officialSummary: '對配偶犯第二百二十一條、第二百二十四條之罪者，或合於第二百二十七條等特定情形者除外，其餘妨害性自主罪均為非告訴乃論（公訴罪）。'
  },
  '刑法第225條': {
    lawName: '刑法',
    article: '第225條',
    maxParagraphs: 3,
    keywords: ['乘機性交猥褻罪', '不能或不知抗拒', '利用精神身體障礙或其他相類情形'],
    officialSummary: '對於男女利用其精神、身體障礙、心智缺陷或其他相類之情形，不能或不知抗拒而為性交者，處三年以上十年以下有期徒刑；為猥褻之行為者，處六月以上五年以下有期徒刑。'
  },
  '家庭暴力防治法第63條之1': {
    lawName: '家庭暴力防治法',
    article: '第63條之1',
    maxParagraphs: 3,
    keywords: ['親密關係暴力', '恐怖情人', '伴侶暴力', '聲請保護令'],
    officialSummary: '被害人年滿十六歲，遭受現有或曾有親密關係之未同居伴侶施以身體或精神上不法侵害之情事者，準用保護令聲請及執行相關規定。'
  },
  '家庭暴力防治法第14條': {
    lawName: '家庭暴力防治法',
    article: '第14條',
    maxParagraphs: 2,
    keywords: ['通常保護令', '禁止實施家庭暴力', '禁止騷擾接觸', '遠離住居所工作場所'],
    officialSummary: '法院得依聲請核發保護令，命相對人禁止實施家庭暴力、禁止騷擾、接觸、通話，命遠離被害人住居所、學校、工作場所一定距離等款項。'
  },
  '家庭暴力防治法第16條': {
    lawName: '家庭暴力防治法',
    article: '第16條',
    maxParagraphs: 4,
    keywords: ['暫時保護令', '緊急保護令', '職權核發'],
    officialSummary: '法院核發通常保護令得命相對人遵守一定防護條款；得依職權或聲請核發暫時保護令或緊急保護令。'
  },
  '刑法第309條': {
    lawName: '刑法',
    article: '第309條',
    maxParagraphs: 2,
    keywords: ['公然侮辱', '公然侮辱人', '強暴侮辱'],
    officialSummary: '公然侮辱人者，處拘役或九千元以下罰金。以強暴犯前項之罪者，處一年以下有期徒刑、拘役或一萬五千元以下罰金。'
  },
  '刑法第320條': {
    lawName: '刑法',
    article: '第320條',
    maxParagraphs: 3,
    keywords: ['竊盜罪', '意圖為自己不法所有', '竊取他人動產', '非告訴乃論'],
    officialSummary: '意圖為自己或第三人不法之所有，而竊取他人之動產者，為竊盜罪，處五年以下有期徒刑、拘役或五十萬元以下罰金。意圖為自己或第三人不法之利益，而竊佔他人之不動產者，依前項之規定處斷。前二項之未遂犯罰之。'
  },
  '刑法第324條': {
    lawName: '刑法',
    article: '第324條',
    maxParagraphs: 2,
    keywords: ['親屬間竊盜', '同財共居親屬', '告訴乃論', '得免除其刑'],
    officialSummary: '於直系血親、配偶或同財共居親屬之間，犯本章之罪者，得免除其刑。前項親屬或其他五親等內血親或三親等內姻親之間，犯本章之罪者，須告訴乃論。'
  },
  '刑法第335條': {
    lawName: '刑法',
    article: '第335條',
    maxParagraphs: 2,
    keywords: ['侵占罪', '侵占自己持有他人之物', '不法所有意圖'],
    officialSummary: '意圖為自己或第三人不法之所有，而侵占自己持有他人之物者，處五年以下有期徒刑、拘役或科或併科三萬元以下罰金。前項之未遂犯罰之。'
  },
  '刑法第305條': {
    lawName: '刑法',
    article: '第305條',
    maxParagraphs: 1,
    keywords: ['恐嚇危安罪', '以加害生命身體自由名譽財產之事恐嚇他人', '致生危害於安全'],
    officialSummary: '以加害生命、身體、自由、名譽、財產之事恐嚇他人，致生危害於安全者，處二年以下有期徒刑、拘役或九千元以下罰金。'
  },
  '刑法第304條': {
    lawName: '刑法',
    article: '第304條',
    maxParagraphs: 2,
    keywords: ['強制罪', '以強暴脅迫使人行無義務之事', '妨害人行使權利'],
    officialSummary: '以強暴、脅迫使人行無義務之事或妨害人行使權利者，處三年以下有期徒刑、拘役或九千元以下罰金。前項之未遂犯罰之。'
  },
  '刑法第19條': {
    lawName: '刑法',
    article: '第19條',
    maxParagraphs: 3,
    keywords: ['精神障礙', '心智缺陷', '責任能力', '不罰或減輕其刑'],
    officialSummary: '行為時因精神障礙或其他心智缺陷，致不能辨識其行為違法或欠缺依其辨識而行為之能力者，不罰。致其能力顯著減低者，得減輕其刑。'
  },
  // 刑事訴訟法
  '刑事訴訟法第232條': {
    lawName: '刑事訴訟法',
    article: '第232條',
    maxParagraphs: 1,
    keywords: ['被害人告訴權'],
    officialSummary: '犯罪之被害人，得為告訴。'
  },
  '刑事訴訟法第237條': {
    lawName: '刑事訴訟法',
    article: '第237條',
    maxParagraphs: 2,
    keywords: ['告訴乃論', '知悉犯人之時起六個月', '告訴期間'],
    officialSummary: '告訴乃論之罪，其告訴應自得為告訴之人知悉犯人之時起，於六個月內為之。'
  },
  '刑事訴訟法第242條': {
    lawName: '刑事訴訟法',
    article: '第242條',
    maxParagraphs: 3,
    keywords: ['告訴方式', '書狀或言詞'],
    officialSummary: '告訴、告發，應以書狀或言詞向檢察官或司法警察官為之；其以言詞為之者，應制作筆錄。'
  },
  '刑事訴訟法第487條': {
    lawName: '刑事訴訟法',
    article: '第487條',
    maxParagraphs: 2,
    keywords: ['刑事附帶民事訴訟', '犯罪受損害人', '免繳裁判費'],
    officialSummary: '因犯罪而受損害之人，於刑事訴訟程序得附帶提起民事訴訟，對於被告及依民法負賠償責任之人，請求回復其損害。'
  },
  // 民事訴訟法追加
  '民事訴訟法第522條': {
    lawName: '民事訴訟法',
    article: '第522條',
    maxParagraphs: 2,
    keywords: ['假扣押聲請', '金錢請求保全'],
    officialSummary: '債權人就金錢請求或得易為金錢請求之請求，欲保全強制執行者，得聲請假扣押。前項聲請，就附條件或期限之請求，亦得為之。'
  },
  '民事訴訟法第526條': {
    lawName: '民事訴訟法',
    article: '第526條',
    maxParagraphs: 4,
    keywords: ['假扣押釋明', '供擔保以代釋明'],
    officialSummary: '請求及假扣押之原因，應釋明之。前項釋明如有不足，而債權人陳明願供擔保或法院認為適當者，法院得定相當之擔保，命供擔保後為假扣押。'
  },
  // 勞動基準法
  '勞動基準法第14條': {
    lawName: '勞動基準法',
    article: '第14條',
    maxParagraphs: 4,
    keywords: ['勞工不經預告終止契約', '雇主不依勞動契約給付報酬', '欠薪終止'],
    officialSummary: '有下列情形之一者，勞工得不經預告終止契約：...五、雇主不依勞動契約給付報酬，或對於按件計酬之勞工不供給充分之工作者。六、雇主違反勞動契約或勞工法令，致有損害勞工權益之虞者。'
  },
  // 強制執行法
  '強制執行法第75條': {
    lawName: '強制執行法',
    article: '第75條',
    maxParagraphs: 4,
    keywords: ['不動產查封', '囑託查封登記'],
    officialSummary: '不動產之查封，由執行法院囑託該管地政機關為查封登記，並由執行法官或書記官率同執達員實施之。'
  },
  '強制執行法第115條': {
    lawName: '強制執行法',
    article: '第115條',
    maxParagraphs: 3,
    keywords: ['金錢債權執行', '扣押命令', '禁止第三人清償'],
    officialSummary: '就債務人對於第三人之金錢債權為執行時，執行法院應發扣押命令，禁止債務人收取或為其他處分，並禁止第三人向債務人清償。'
  },
  '強制執行法第122條': {
    lawName: '強制執行法',
    article: '第122條',
    maxParagraphs: 5,
    keywords: ['生活必需費用禁止扣押', '薪資扣押上限', '維持親屬生活必需'],
    officialSummary: '債務人依法領取之社會福利津貼、社會救助或補助，不得為強制執行。債務人依法領取之社會保險給付或其對於第三人之債權，係維持債務人及其共同生活之親屬生活所必需者，不得為強制執行。'
  },
  // 家事事件法
  '家事事件法第132條': {
    lawName: '家事事件法',
    article: '第132條',
    maxParagraphs: 3,
    keywords: ['拋棄繼承管轄', '被繼承人住所地法院'],
    officialSummary: '拋棄繼承，由繼承開始時被繼承人住所地之法院管轄。'
  },
  '家事事件法第164條': {
    lawName: '家事事件法',
    article: '第164條',
    maxParagraphs: 2,
    keywords: ['監護宣告管轄', '應受監護宣告人住居所地法院'],
    officialSummary: '監護宣告之聲請，由應受監護宣告人之住所地或居所地法院管轄。'
  },
  // 非訟事件法
  '非訟事件法第194條': {
    lawName: '非訟事件法',
    article: '第194條',
    maxParagraphs: 1,
    keywords: ['本票裁定管轄', '票據付款地法院'],
    officialSummary: '執票人依票據法第一百二十三條規定，聲請法院裁定許可對本票發票人強制執行者，由票據付款地之法院管轄。'
  }
};

/**
 * Verified Real Supreme Court Precedents (Taiwan Supreme Court Database)
 */
export const VERIFIED_REAL_PRECEDENTS: RealPrecedentDatabaseItem[] = [
  {
    caseYear: '98',
    court: '最高法院',
    caseWord: '台上',
    caseNum: '1045',
    fullCitation: '最高法院98年度台上字第1045號民事判決',
    holdingSummary: '消費借貸契約之成立，除金錢或其他代替物之交付外，尚須當事人間有借貸之「合意」。僅有匯款之事實，尚不足以證明雙方已成立借貸合意。',
    legalKeywords: ['消費借貸合意', '金錢交付', '舉證責任'],
    officialJudicialUrl: 'https://judgment.judicial.gov.tw/'
  },
  {
    caseYear: '43',
    court: '最高法院',
    caseWord: '台上',
    caseNum: '377',
    fullCitation: '最高法院43年台上字第377號判例',
    holdingSummary: '民事訴訟如係由原告主張權利者，應先由原告負舉證之責，若原告先不能舉證，以證實自己主張之事實為真實，則被告就其抗辯事實即令不能舉證，亦應駁回原告之請求。',
    legalKeywords: ['舉證責任分配', '原告先負舉證之責'],
    officialJudicialUrl: 'https://judgment.judicial.gov.tw/'
  },
  {
    caseYear: '18',
    court: '最高法院',
    caseWord: '上',
    caseNum: '2855',
    fullCitation: '最高法院18年上字第2855號判例',
    holdingSummary: '原告於其所主張之起訴原因，不能為相當之證明，而被告就其抗辯事實，已有相當之反證者，當然駁回原告之請求。',
    legalKeywords: ['反證提出', '駁回原告之訴'],
    officialJudicialUrl: 'https://judgment.judicial.gov.tw/'
  },
  {
    caseYear: '26',
    court: '最高法院',
    caseWord: '渝上',
    caseNum: '805',
    fullCitation: '最高法院26年渝上字第805號判例',
    holdingSummary: '消滅時效完成後，債務人所為之承認，除別有規定外，為拋棄時效利益之默示意思表示，恢復原請求權之行使。',
    legalKeywords: ['時效完成後之承認', '拋棄時效利益'],
    officialJudicialUrl: 'https://judgment.judicial.gov.tw/'
  },
  {
    caseYear: '46',
    court: '最高法院',
    caseWord: '台上',
    caseNum: '1158',
    fullCitation: '最高法院46年台上字第1158號判例',
    holdingSummary: '民事訴訟法第358條關於私文書經本人簽名蓋章者推定為真正之規定，必須先由提出文書之當事人證明該簽名或印章確為本人所為，始有推定之適用。',
    legalKeywords: ['私文書真正推定', '印章簽名真實性'],
    officialJudicialUrl: 'https://judgment.judicial.gov.tw/'
  },
  {
    caseYear: '73',
    court: '最高法院',
    caseWord: '台上',
    caseNum: '344',
    fullCitation: '最高法院73年度台上字第344號民事判決',
    holdingSummary: '物之瑕疵通知，應於受領物後依通常檢查程序進行。買受人怠於通知者，除有不能即知之瑕疵外，視為承認其所受領之物。',
    legalKeywords: ['物之瑕疵擔保', '檢查與通知義務', '除斥期間'],
    officialJudicialUrl: 'https://judgment.judicial.gov.tw/'
  }
];

export interface VerifyCitationsOptions {
  allowedCitations?: string[];
  strictAllowedOnly?: boolean;
}

/**
 * Anti-Hallucination Ghost Citation Verifier
 * Scans generated legal text for statutory articles and case citations,
 * verifying them against official database rules and allowed_citations to detect ghost/hallucinated items.
 */
export function verifyLegalCitations(
  text: string,
  options?: VerifyCitationsOptions
): {
  totalChecked: number;
  ghostCount: number;
  results: CitationVerificationResult[];
  sanitizedText: string;
} {
  const results: CitationVerificationResult[] = [];
  let sanitizedText = text;
  const allowedList = options?.allowedCitations?.filter(Boolean) || [];
  const hasAllowedConstraint = allowedList.length > 0;

  const isPrecedentAllowed = (fullMatch: string, year: string, caseWord: string, caseNum: string): boolean => {
    if (!hasAllowedConstraint) return false;
    for (const allowed of allowedList) {
      if (allowed === fullMatch) return true;
      if (allowed.includes(fullMatch) || fullMatch.includes(allowed)) return true;
      if (allowed.includes(year) && allowed.includes(caseWord) && allowed.includes(caseNum)) return true;
    }
    return false;
  };

  const STATUTE_MAX_ARTICLES: Record<string, number> = {
    '民法': 1225,
    '刑法': 363,
    '民事訴訟法': 607,
    '刑事訴訟法': 512,
    '票據法': 144,
    '勞動基準法': 86,
    '強制執行法': 142,
    '家事事件法': 204,
    '家庭暴力防治法': 66,
    '非訟事件法': 199
  };

  // 1. Scan for statutory mentions (e.g. 民法第xxx條、民法第1030條之1第1項、民事訴訟法第xxx條第x項)
  const statuteRegex = /(民法|民事訴訟法|刑法|刑事訴訟法|票據法|勞動基準法|強制執行法|家事事件法|家庭暴力防治法|非訟事件法)第([0-9０-９]+)(?:條之([0-9０-９]+)|(?:之([0-9０-９]+))?條)(?:第([0-9０-９]+)項)?(?:第([0-9０-９]+)款)?/g;
  let match: RegExpExecArray | null;

  while ((match = statuteRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const lawName = match[1];
    const mainArt = match[2];
    const subArt = match[3] || match[4];
    const paraNum = match[5] ? parseInt(match[5], 10) : null;

    const baseKey = subArt ? `${lawName}第${mainArt}條之${subArt}` : `${lawName}第${mainArt}條`;
    const altKey = subArt ? `${lawName}第${mainArt}之${subArt}條` : undefined;

    const knownStatute = VERIFIED_REAL_STATUTES[baseKey] || (altKey ? VERIFIED_REAL_STATUTES[altKey] : undefined);
    const maxArticleForLaw = STATUTE_MAX_ARTICLES[lawName];

    if (maxArticleForLaw && parseInt(mainArt, 10) > maxArticleForLaw) {
      // Impossible article number (e.g. 刑法第999條)
      results.push({
        verified: false,
        citationText: fullMatch,
        type: 'STATUTE',
        officialTitle: `${fullMatch}（${lawName}現行法最高僅至第${maxArticleForLaw}條）`,
        officialSourceUrl: 'https://law.moj.gov.tw/',
        isGhostOrFake: true,
        hallucinationRisk: 'SUSPICIOUS_NUMBERING',
        correctionSuggestion: `請核對正確條號，我國${lawName}目前最高僅有${maxArticleForLaw}條。`
      });
    } else if (knownStatute) {
      if (paraNum && paraNum > knownStatute.maxParagraphs) {
        // Hallucinated paragraph number (e.g., 民事訴訟法第279條第5項)
        results.push({
          verified: false,
          citationText: fullMatch,
          type: 'STATUTE',
          officialTitle: `${baseKey}（真實條文僅有 ${knownStatute.maxParagraphs} 項）`,
          officialSourceUrl: 'https://law.moj.gov.tw/',
          isGhostOrFake: true,
          hallucinationRisk: 'SUSPICIOUS_NUMBERING',
          correctionSuggestion: `修正為：${baseKey}第${Math.min(paraNum, knownStatute.maxParagraphs)}項 或 直接引用 ${baseKey}`,
          officialSnippet: knownStatute.officialSummary
        });
      } else {
        // Safe verified statute
        results.push({
          verified: true,
          citationText: fullMatch,
          type: 'STATUTE',
          officialTitle: baseKey,
          officialSourceUrl: 'https://law.moj.gov.tw/',
          isGhostOrFake: false,
          hallucinationRisk: 'SAFE_VERIFIED',
          officialSnippet: knownStatute.officialSummary
        });
      }
    } else {
      // Unindexed or non-standard article
      results.push({
        verified: false,
        citationText: fullMatch,
        type: 'STATUTE',
        officialTitle: fullMatch,
        officialSourceUrl: 'https://law.moj.gov.tw/',
        isGhostOrFake: false,
        hallucinationRisk: 'UNVERIFIED'
      });
    }
  }

  // 2. Scan for Supreme Court Case Citations (e.g. 最高法院111年度台上字第99999號判決)
  const precedentRegex = /(最高法院|高等法院)([0-9０-９]+)年(?:度)?(台上|上|重上|台抗|抗|聲)字第([0-9０-９]+)號(判決|判例|裁定)/g;
  while ((match = precedentRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const court = match[1];
    const year = match[2];
    const caseWord = match[3];
    const caseNum = match[4];

    // Check if it matches our verified real precedents
    const foundPrecedent = VERIFIED_REAL_PRECEDENTS.find(p => 
      p.caseYear === year && p.caseWord === caseWord && p.caseNum === caseNum
    );

    // Check if it matches allowed_citations from RAG retrieval
    const allowedByRag = isPrecedentAllowed(fullMatch, year, caseWord, caseNum);

    if (allowedByRag) {
      results.push({
        verified: true,
        citationText: fullMatch,
        type: 'PRECEDENT',
        officialTitle: fullMatch,
        officialSourceUrl: 'https://judgment.judicial.gov.tw/',
        isGhostOrFake: false,
        hallucinationRisk: 'SAFE_VERIFIED',
        officialSnippet: '檢索庫 RAG 檢索核可之實務裁判見解（allowed_citations）。'
      });
    } else if (foundPrecedent) {
      results.push({
        verified: true,
        citationText: fullMatch,
        type: 'PRECEDENT',
        officialTitle: foundPrecedent.fullCitation,
        officialSourceUrl: foundPrecedent.officialJudicialUrl,
        isGhostOrFake: false,
        hallucinationRisk: 'SAFE_VERIFIED',
        officialSnippet: foundPrecedent.holdingSummary
      });
    } else {
      // If AI generated an impossible/suspicious high number (e.g. 9999號) or recent fake citation,
      // OR if RAG allowed_citations were strictly provided but AI hallucinated an unapproved citation
      const numVal = parseInt(caseNum, 10);
      const isSuspicious = numVal > 6000 || parseInt(year, 10) > 115 || hasAllowedConstraint;

      results.push({
        verified: false,
        citationText: fullMatch,
        type: 'PRECEDENT',
        officialTitle: fullMatch,
        officialSourceUrl: 'https://judgment.judicial.gov.tw/',
        isGhostOrFake: isSuspicious,
        hallucinationRisk: isSuspicious ? 'FAKE_GHOST_CITATION' : 'UNVERIFIED',
        correctionSuggestion: isSuspicious ? '建議改用最高法院權威穩定見解（如最高法院98年度台上字第1045號判決），或改為實務通說表述。' : undefined,
        officialSnippet: hasAllowedConstraint
          ? '⚠️ 該裁判未在本次檢索之 allowed_citations 列表中，已被安全機制判定為未授權引用。'
          : (isSuspicious ? '⚠️ 本機規則判定為高度可疑，請至官方資料庫人工查證。' : '本機索引未收錄，無法由 heuristic 判定為真實。')
      });

      if (isSuspicious) {
        // Auto replace in sanitized text to protect the user
        sanitizedText = sanitizedText.replace(fullMatch, `最高法院穩定裁判見解（參最高法院98年度台上字第1045號裁判意旨）`);
      }
    }
  }

  const ghostCount = results.filter(r => r.isGhostOrFake).length;

  return {
    totalChecked: results.length,
    ghostCount,
    results,
    sanitizedText
  };
}
