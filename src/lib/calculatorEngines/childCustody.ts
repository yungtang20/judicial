import { LegalCalculatorConfig } from '../../types/legalTools';

export const CHILD_CUSTODY_ASSESSMENT_CONFIG: LegalCalculatorConfig = {
  toolId: 'CHILD_CUSTODY_ASSESSMENT',
  title: '親權（監護權）綜合評估量表',
  subtitle: '依據民法第 1055 條之 1「子女最佳利益原則」，量化評估主要照顧者現狀、親職意願與善意父母指標',
  category: 'FAMILY',
  categoryName: '家事 · 離婚｜親權｜財產',
  inputs: [
    {
      id: 'primaryCaregiver',
      label: '主要照顧者現狀（維持現狀原則）',
      type: 'select',
      defaultValue: 'me',
      options: [
        { label: '由我長期且主要負責子女日常生活與就學起居', value: 'me', subtitle: '加分：符合現狀維持與依附關係' },
        { label: '雙方平均共同分擔日常照顧', value: 'equal', subtitle: '平分：雙方均有照顧經驗' },
        { label: '由對方長期且主要負責照顧', value: 'other', subtitle: '對方具備主要照顧者優勢' }
      ]
    },
    {
      id: 'emotionalBond',
      label: '子女與我方的情感依附關係',
      type: 'select',
      defaultValue: 'strong',
      options: [
        { label: '極度親密，孩子遇困難或生病時優先依賴我', value: 'strong' },
        { label: '普通良好，與父母雙方均親近', value: 'normal' },
        { label: '略為疏離或孩子較排斥我方', value: 'weak' }
      ]
    },
    {
      id: 'friendlyParent',
      label: '善意父母原則（是否願意促進對方探視交往）',
      type: 'select',
      defaultValue: 'high',
      options: [
        { label: '高度善意：願意完全配合對方探視、不說對方壞話、維持親情交流', value: 'high', subtitle: '法院極為重視' },
        { label: '普通配合：依法院裁定被動配合', value: 'medium' },
        { label: '強烈排斥：堅決不讓對方看孩子、隱匿藏匿子女', value: 'low', subtitle: '負分：嚴重違反善意父母原則' }
      ]
    },
    {
      id: 'supportNetwork',
      label: '後援支持系統（親友支援照顧能力）',
      type: 'select',
      defaultValue: 'good',
      options: [
        { label: '強大後援：同住或鄰近祖父母/親屬可即時協助接送與照護', value: 'good' },
        { label: '普通：無同住親屬，但可自費聘請課後托育安親', value: 'medium' },
        { label: '薄弱：工作時間極長且無任何親友或托育後援', value: 'poor' }
      ]
    },
    {
      id: 'economicStability',
      label: '經濟生活穩定度',
      type: 'select',
      defaultValue: 'stable',
      options: [
        { label: '工作穩定、收入正常、居住環境安全單純', value: 'stable' },
        { label: '收入稍低但無負債，生活環境良好', value: 'modest' },
        { label: '有嚴重不良嗜好（如賭博、毒品）或高額不正常負債', value: 'high_risk', subtitle: '嚴重扣分' }
      ]
    }
  ],
  calculate: (inputs) => {
    let score = 50;
    const items: { factor: string; status: string; impact: string }[] = [];

    // 主要照顧
    if (inputs.primaryCaregiver === 'me') {
      score += 20;
      items.push({ factor: '主要照顧者現狀', status: '我方長期主要照顧', impact: '＋20分（法院傾向維持現狀不任意變更生活環境）' });
    } else if (inputs.primaryCaregiver === 'equal') {
      score += 10;
      items.push({ factor: '主要照顧者現狀', status: '雙方平均照顧', impact: '＋10分（平分秋色）' });
    } else {
      score -= 10;
      items.push({ factor: '主要照顧者現狀', status: '對方主要照顧', impact: '－10分（對方具維持現狀之強勢優勢）' });
    }

    // 情感依附
    if (inputs.emotionalBond === 'strong') {
      score += 15;
      items.push({ factor: '子女情感依附', status: '強烈依賴我方', impact: '＋15分（尊重子女意願與依附理論）' });
    } else if (inputs.emotionalBond === 'normal') {
      score += 5;
      items.push({ factor: '子女情感依附', status: '普通良好', impact: '＋5分' });
    } else {
      score -= 10;
      items.push({ factor: '子女情感依附', status: '關係疏離', impact: '－10分' });
    }

    // 善意父母
    if (inputs.friendlyParent === 'high') {
      score += 15;
      items.push({ factor: '善意父母原則', status: '高度支持對方探視', impact: '＋15分（家事法院關鍵裁量指標）' });
    } else if (inputs.friendlyParent === 'medium') {
      score += 5;
      items.push({ factor: '善意父母原則', status: '被動配合', impact: '＋5分' });
    } else {
      score -= 30;
      items.push({ factor: '善意父母原則', status: '阻撓對方探視／藏匿', impact: '－30分（法院認定惡意父母可能直接喪失親權）' });
    }

    // 後援支持
    if (inputs.supportNetwork === 'good') {
      score += 10;
      items.push({ factor: '後援照顧網絡', status: '親友後援充足', impact: '＋10分' });
    } else if (inputs.supportNetwork === 'poor') {
      score -= 5;
      items.push({ factor: '後援照顧網絡', status: '無後援孤立', impact: '－5分' });
    }

    // 經濟生活
    if (inputs.economicStability === 'high_risk') {
      score -= 40;
      items.push({ factor: '經濟與不良嗜好', status: '高風險惡習負債', impact: '－40分（嚴重不利於子女身心健全發展）' });
    }

    score = Math.min(100, Math.max(0, score));

    let assessmentLevel = '';
    let recommendation = '';
    if (score >= 80) {
      assessmentLevel = '極具優勢（高度有利於爭取單獨親權）';
      recommendation = '我方符合主要照顧者與善意父母等多項核心判準，家事調查官與社工訪視通常會給予正面評價。請持續蒐集平日就醫、接送紀錄與親子互動聯絡簿。';
    } else if (score >= 60) {
      assessmentLevel = '勢均力敵（建議爭取共同親權或補強平日照顧事證）';
      recommendation = '雙方條件接近，法院可能優先考量共同監護（由一方任主要照顧方），或由社工訪視報告與子女意願決定最終歸屬。';
    } else {
      assessmentLevel = '居於弱勢（建議先改善生活互動或採取友善協商模式）';
      recommendation = '目前在主要照顧或探視配合度上較為不利，建議切勿採取激烈搶小孩作法，展現高度善意配合探視並改善教養環境，爭取充實之探視交往方案。';
    }

    const clause = `親權與主要照顧約定條款：\n一、兩造所生未成年子女權利義務之行使或負擔，由【聲請人】單獨任之（或由兩造共同任之，並由聲請人為主要照顧者，未成年子女之日常生活、醫療、就學等一般事項由主要照顧者單獨決定）。\n二、他方得依另定之探視交往方案，定期與未成年子女會面交往，雙方應恪遵善意父母原則，共同維護子女之最佳身心健全發展。`;

    return {
      summary: [
        { label: '綜合親權優勢得分', value: `${score} 分`, isHighlight: true, note: assessmentLevel },
        { label: '訴訟或協商策略建議', value: recommendation }
      ],
      breakdown: items.map(it => ({ label: `${it.factor}：${it.status}`, value: it.impact })),
      legalClause: clause,
      notice: '評估說明：本量表依據民法第 1055 條之 1 法定 7 大審酌標準設計，法院實務以「家事調查官訪視報告」及「主管機關社工訪視報告」為最重要客觀佐證。'
    };
  },
  guide: [
    {
      title: '民法第 1055 條之 1 子女最佳利益法定原則',
      content: '裁判親權歸屬時，法院非以父母財富多寡為主要標準（經濟不足可由他方給付扶養費彌補），而是本於「子女最佳利益」，審酌父母之品行、生活狀況、保護教養子女之意願及態度、子女意願與善意父母原則。',
      statutes: [
        { title: '民法第1055條之1', article: '§1055-1', text: '法院為前條裁判時，應依子女之最佳利益，審酌一切情狀，尤應注意下列事項：一、子女之年齡、性別、人數及健康情形。二、子女之意願及人格發展之需要。三、父母之年齡、職業、品行、健康情形、經濟能力及生活狀況。四、父母保護教養子女之意願及態度。五、父母子女間或未成年子女與其他共同生活之人間之感情狀況。六、父母之一方是否有妨礙他方對未成年子女權利義務行使負擔之行為。七、各期照顧之意願及照顧之持續性。' }
      ]
    },
    {
      title: '實務爭取親權之五大黃金原則',
      content: '家事法院實務長期累積以下裁判指導原則：',
      practicalTips: [
        '現狀維持原則（繼續性原則）：法院不願意輕易打破孩子既有的穩定求學與生活環境。',
        '幼兒從母原則：嬰幼兒期（特別是未滿3歲哺乳階段）通常推定由母親照護較符合身心需求，但非絕對。',
        '手足同親原則：法院極力避免將多名未成年手足拆散分歸父母各自監護。',
        '善意父母原則（最關鍵）：展現「願意讓對方定期探視、正面肯定對方父母角色」之一方，在家事法院具有極高裁量評價！',
        '尊重子女意願原則：滿 7 歲以上（尤其是 12 歲以上）具辨識能力之未成年子女，其陳述之內心真實意願將受到法官高度尊重。'
      ],
      risksToAvoid: [
        '搶小孩藏匿是最大忌諱：私自將小孩帶走藏匿、阻撓對方探視或在孩子面前詆毀對方，會被法院判定為「嚴重惡意父母」，極易直接敗訴失去親權。'
      ]
    }
  ]
};
