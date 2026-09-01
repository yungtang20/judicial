import { CitationVerificationResult, RealStatuteDatabaseItem, RealPrecedentDatabaseItem } from '../types';

/**
 * Verified Real Statutory Database (Taiwan Major Procedural and Substantive Laws)
 */
const VERIFIED_REAL_STATUTES: Record<string, RealStatuteDatabaseItem> = {
  // 民法
  '民法第184條': {
    lawName: '民法',
    article: '第184條',
    maxParagraphs: 2,
    keywords: ['侵權行為', '故意或過失', '不法侵害他人之權利', '背於善良風俗'],
    officialSummary: '因故意或過失，不法侵害他人之權利者，負損害賠償責任。故意以背於善良風俗之方法，加損害於他人者亦同。'
  },
  '民法第179條': {
    lawName: '民法',
    article: '第179條',
    maxParagraphs: 1,
    keywords: ['不當得利', '無法律上之原因', '受利益', '致他人受損害'],
    officialSummary: '無法律上之原因而受利益，致他人受損害者，應返還其利益。雖有法律上之原因，而其後已不存在者，亦同。'
  },
  '民法第474條': {
    lawName: '民法',
    article: '第474條',
    maxParagraphs: 2,
    keywords: ['消費借貸', '合意', '交付金錢', '移轉金錢所有權'],
    officialSummary: '稱消費借貸者，謂當事人約定，一方移轉金錢或其他代替物之所有權於他方，而約定他方以種類、品質、數量相同之物返還之契約。'
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
  '民法第14條': {
    lawName: '民法',
    article: '第14條',
    maxParagraphs: 4,
    keywords: ['監護宣告', '精神障礙', '心智缺陷', '致不能為意思表示'],
    officialSummary: '對於因精神障礙或其他心智缺陷，致不能為意思表示或受意思表示，或不能辨識其意思表示之效果者，法院得依聲請為監護之宣告。'
  },
  '民法第15條之1': {
    lawName: '民法',
    article: '第15條之1',
    maxParagraphs: 3,
    keywords: ['輔助宣告', '辨識能力顯有不足', '家事法院'],
    officialSummary: '對於因精神障礙或其他心智缺陷，致其為意思表示或受意思表示，或辨識其意思表示效果之能力，顯有不足者，法院得依聲請為輔助之宣告。'
  },
  '民法第1113條之2': {
    lawName: '民法',
    article: '第1113條之2',
    maxParagraphs: 2,
    keywords: ['意定監護', '公證人', '意思能力'],
    officialSummary: '稱意定監護者，謂本人與受任人約定，於本人受監護宣告時，受任人答應擔任監護人之契約。'
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
  '刑法第339條': {
    lawName: '刑法',
    article: '第339條',
    maxParagraphs: 3,
    keywords: ['詐欺取財', '意圖為自己不法所有', '施用詐術', '陷於錯誤'],
    officialSummary: '意圖為自己或第三人不法之所有，以詐術使人將本人或第三人之物交付者，處五年以下有期徒刑、拘役或科或併科五十萬元以下罰金。'
  },
  '刑法第277條': {
    lawName: '刑法',
    article: '第277條',
    maxParagraphs: 2,
    keywords: ['普通傷害罪', '傷害人之身體或健康'],
    officialSummary: '傷害人之身體或健康者，處五年以下有期徒刑、拘役或五十萬元以下罰金。'
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
  '刑法第315條之1': {
    lawName: '刑法',
    article: '第315條之1',
    maxParagraphs: 1,
    keywords: ['妨害秘密罪', '無故利用工具設備窺視竊聽', '竊錄他人非公開活動言論談話身體隱私部位'],
    officialSummary: '有下列行為之一者，處三年以下有期徒刑、拘役或三十萬元以下罰金：一、無故利用工具或設備窺視、竊聽他人非公開之活動、言論、談話或身體隱私部位者。二、無故以錄音、照相、錄影或電磁紀錄竊錄他人非公開之活動、言論、談話或身體隱私部位者。'
  },
  '刑法第319條之3': {
    lawName: '刑法',
    article: '第319條之3',
    maxParagraphs: 4,
    keywords: ['散布性私密影像', '未經同意散布性影像', '重刑公訴罪'],
    officialSummary: '未經他人同意，無故重製、散布、播送、交付、公然陳列，或以他法供人觀覽其性影像者，處五年以下有期徒刑，得併科五十萬元以下罰金。'
  },
  '民法第767條': {
    lawName: '民法',
    article: '第767條',
    maxParagraphs: 1,
    keywords: ['物上請求權', '所有人對於無權占有其所有物者得請求返還', '除去妨害'],
    officialSummary: '所有人對於無權占有或侵奪其所有物者，得請求返還之。對於妨害其所有權者，得請求除去之。有妨害其所有權之虞者，得請求防止之。'
  },
  '刑法第19條': {
    lawName: '刑法',
    article: '第19條',
    maxParagraphs: 3,
    keywords: ['精神障礙', '心智缺陷', '責任能力', '不罰或減輕其刑'],
    officialSummary: '行為時因精神障礙或其他心智缺陷，致不能辨識其行為違法或欠缺依其辨識而行為之能力者，不罰。致其能力顯著減低者，得減輕其刑。'
  },
  '刑事訴訟法第237條': {
    lawName: '刑事訴訟法',
    article: '第237條',
    maxParagraphs: 2,
    keywords: ['告訴乃論', '知悉犯人之時起六個月', '告訴期間'],
    officialSummary: '告訴乃論之罪，其告訴應自得為告訴之人知悉犯人之時起，於六個月內為之。'
  }
};

/**
 * Verified Real Supreme Court Precedents (Taiwan Supreme Court Database)
 */
const VERIFIED_REAL_PRECEDENTS: RealPrecedentDatabaseItem[] = [
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

/**
 * Anti-Hallucination Ghost Citation Verifier
 * Scans generated legal text for statutory articles and case citations,
 * verifying them against official database rules to detect ghost/hallucinated items.
 */
export function verifyLegalCitations(text: string): {
  totalChecked: number;
  ghostCount: number;
  results: CitationVerificationResult[];
  sanitizedText: string;
} {
  const results: CitationVerificationResult[] = [];
  let sanitizedText = text;

  // 1. Scan for statutory mentions (e.g. 民法第xxx條、民事訴訟法第xxx條第x項)
  const statuteRegex = /(民法|民事訴訟法|刑法|刑事訴訟法|票據法|勞動基準法|強制執行法|家事事件法)第([0-9０-９]+(?:之[0-9０-９]+)?)條(?:第([0-9０-９]+)項)?(?:第([0-9０-９]+)款)?/g;
  let match: RegExpExecArray | null;

  while ((match = statuteRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const lawName = match[1];
    const articleNum = match[2];
    const paraNum = match[3] ? parseInt(match[3], 10) : null;
    const baseKey = `${lawName}第${articleNum}條`;

    const knownStatute = VERIFIED_REAL_STATUTES[baseKey];
    if (knownStatute) {
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

    if (foundPrecedent) {
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
      // If AI generated an impossible/suspicious high number (e.g. 9999號) or recent fake citation
      const numVal = parseInt(caseNum, 10);
      const isSuspicious = numVal > 6000 || parseInt(year, 10) > 115;

      results.push({
        verified: false,
        citationText: fullMatch,
        type: 'PRECEDENT',
        officialTitle: fullMatch,
        officialSourceUrl: 'https://judgment.judicial.gov.tw/',
        isGhostOrFake: isSuspicious,
        hallucinationRisk: isSuspicious ? 'FAKE_GHOST_CITATION' : 'UNVERIFIED',
        correctionSuggestion: isSuspicious ? '建議改用最高法院權威穩定見解（如最高法院98年度台上字第1045號判決），或改為實務通說表述。' : undefined,
        officialSnippet: isSuspicious ? '⚠️ 本機規則判定為高度可疑，請至官方資料庫人工查證。' : '本機索引未收錄，無法由 heuristic 判定為真實。'
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
