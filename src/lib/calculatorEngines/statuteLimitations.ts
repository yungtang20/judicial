import { LegalCalculatorConfig } from '../../types/legalTools';

export const STATUTE_LIMITATIONS_CALCULATOR_CONFIG: LegalCalculatorConfig = {
  toolId: 'STATUTE_LIMITATIONS_CALCULATOR',
  title: '追訴期與民事消滅時效計算器',
  subtitle: '整合民法第 125~127 條請求權消滅時效，以及刑法第 80 條追訴權時效，輸入起算基準日自動計算罹於時效之確切期日',
  category: 'LABOR_CRIMINAL_CONTRACT',
  categoryName: '勞資 · 刑事 · 契約',
  inputs: [
    {
      id: 'legalDomain',
      label: '法律範疇與爭議類型',
      type: 'select',
      defaultValue: 'CIVIL_GENERAL',
      options: [
        { label: '民事：一般請求權（如借款返還、債務不履行）- 15年', value: 'CIVIL_GENERAL', subtitle: '民法第125條' },
        { label: '民事：定期給付債權（如利息、租金、扶養費、薪資）- 5年', value: 'CIVIL_PERIODIC', subtitle: '民法第126條' },
        { label: '民事：侵權行為損害賠償（如車禍、侵害配偶權）- 知悉2年/發生10年', value: 'CIVIL_TORT', subtitle: '民法第197條' },
        { label: '民事：日常短期債權（如貨款、運費、承攬報酬、醫療費）- 2年', value: 'CIVIL_SHORT', subtitle: '民法第127條' },
        { label: '民事：夫妻剩餘財產差額分配請求權 - 知悉2年/離婚起5年', value: 'CIVIL_RESIDUAL', subtitle: '民法第1030條之1第5項' },
        { label: '刑事告訴乃論罪：告訴期間 - 知悉犯人之日起 6 個月', value: 'CRIMINAL_COMPLAINT_6M', subtitle: '刑事訴訟法第237條' },
        { label: '刑事追訴權：最重本刑 10 年以上有期徒刑 - 30年', value: 'CRIMINAL_30Y', subtitle: '刑法第80條第1項第1款' },
        { label: '刑事追訴權：最重本刑 3 年以上 10 年未滿 - 20年', value: 'CRIMINAL_20Y', subtitle: '刑法第80條第1項第2款' },
        { label: '刑事追訴權：最重本刑 1 年以上 3 年未滿 - 10年', value: 'CRIMINAL_10Y', subtitle: '刑法第80條第1項第3款' },
        { label: '刑事追訴權：最重本刑 1 年未滿（含拘役、罰金刑）- 5年', value: 'CRIMINAL_5Y', subtitle: '刑法第80條第1項第4款' }
      ]
    },
    {
      id: 'startDate',
      label: '時效起算基準日（如借款到期日、知悉侵權日、車禍受傷日）',
      type: 'text',
      defaultValue: '2024-01-15',
      helperText: '格式請輸入 YYYY-MM-DD，例如 2024-01-15。'
    }
  ],
  calculate: (inputs) => {
    const domain = inputs.legalDomain || 'CIVIL_GENERAL';
    const dateStr = (inputs.startDate || '2024-01-15').trim();
    
    let baseDate = new Date(dateStr);
    if (isNaN(baseDate.getTime())) {
      baseDate = new Date();
    }

    let yearsToAdd = 0;
    let monthsToAdd = 0;
    let ruleName = '';
    let statuteRef = '';

    switch (domain) {
      case 'CIVIL_GENERAL':
        yearsToAdd = 15;
        ruleName = '民事一般請求權消滅時效（15年）';
        statuteRef = '民法第125條';
        break;
      case 'CIVIL_PERIODIC':
        yearsToAdd = 5;
        ruleName = '定期給付債權短期時效（5年）';
        statuteRef = '民法第126條';
        break;
      case 'CIVIL_TORT':
        yearsToAdd = 2;
        ruleName = '侵權行為主觀知悉時效（2年）';
        statuteRef = '民法第197條第1項前段（知有損害及賠償義務人起）';
        break;
      case 'CIVIL_SHORT':
        yearsToAdd = 2;
        ruleName = '日常營業承攬短期時效（2年）';
        statuteRef = '民法第127條';
        break;
      case 'CIVIL_RESIDUAL':
        yearsToAdd = 2;
        ruleName = '夫妻剩餘財產知悉差額時效（2年）';
        statuteRef = '民法第1030條之1第5項前段';
        break;
      case 'CRIMINAL_COMPLAINT_6M':
        monthsToAdd = 6;
        ruleName = '刑事告訴乃論告訴期間（6個月）';
        statuteRef = '刑事訴訟法第237條第1項';
        break;
      case 'CRIMINAL_30Y':
        yearsToAdd = 30;
        ruleName = '刑事追訴權時效（30年）';
        statuteRef = '刑法第80條第1項第1款';
        break;
      case 'CRIMINAL_20Y':
        yearsToAdd = 20;
        ruleName = '刑事追訴權時效（20年）';
        statuteRef = '刑法第80條第1項第2款';
        break;
      case 'CRIMINAL_10Y':
        yearsToAdd = 10;
        ruleName = '刑事追訴權時效（10年）';
        statuteRef = '刑法第80條第1項第3款';
        break;
      case 'CRIMINAL_5Y':
        yearsToAdd = 5;
        ruleName = '刑事追訴權時效（5年）';
        statuteRef = '刑法第80條第1項第4款';
        break;
    }

    const expiryDate = new Date(baseDate.getTime());
    if (yearsToAdd > 0) {
      expiryDate.setFullYear(expiryDate.getFullYear() + yearsToAdd);
    }
    if (monthsToAdd > 0) {
      expiryDate.setMonth(expiryDate.getMonth() + monthsToAdd);
    }

    const formatYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y} 年 ${m} 月 ${day} 日`;
    };

    const today = new Date();
    const isExpired = expiryDate.getTime() < today.getTime();
    const diffDays = Math.ceil(Math.abs(expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const statusNote = isExpired 
      ? `⚠️ 已罹於時效（已過期約 ${diffDays} 天）`
      : `✅ 時效尚未完成（距時效屆滿尚餘約 ${diffDays} 天）`;

    const clause = `時效法律分析意見書：\n一、本件權利標的適用【${ruleName}】，依據【${statuteRef}】規定。\n二、起算基準日：${formatYMD(baseDate)}。\n三、時效屆滿期日：${formatYMD(expiryDate)}。\n四、時效現況：${statusNote}。\n五、建議法律作為：若時效即將屆滿，請即刻以「存證信函」催告中斷時效，並於催告後 6 個月內向法院起訴或聲請支付命令，始生中斷時效之效力（民法第129條、第130條）。`;

    return {
      summary: [
        { label: '時效屆滿確切期日', value: formatYMD(expiryDate), isHighlight: true, note: statusNote },
        { label: '適用法規依據', value: statuteRef },
        { label: '時效起算基準日', value: formatYMD(baseDate) },
        { label: '法定期間長度', value: yearsToAdd > 0 ? `${yearsToAdd} 年` : `${monthsToAdd} 個月` }
      ],
      breakdown: [
        { label: '時效性質', value: domain.startsWith('CRIMINAL') ? '刑事程序法定期限（逾期不得告訴或追訴）' : '民事實體抗辯權（債務人得拒絕給付）' },
        { label: '消滅時效之中斷事由', value: '民法第129條：請求、承認、起訴（含支付命令、假扣押、聲請調解）' },
        { label: '發存證信函之關鍵陷阱', value: '民法第130條：時效因請求而中斷者，若於請求後 6 個月內不起訴，視為不中斷！' }
      ],
      legalClause: clause,
      notice: '重要防呆：寄發存證信函催告雖然可以中斷民事消滅時效，但法律嚴格規定「必須在催告後 6 個月內向法院起訴或聲請調解/支付命令」，否則時效視為不中斷！'
    };
  },
  guide: [
    {
      title: '民事實體消滅時效與中斷機制',
      content: '民事時效完成後，並非債權自然消滅，而是「債務人取得拒絕給付之抗辯權」。若債務人不知時效完成而仍主動清償，不得以不知時效為由請求返還。',
      statutes: [
        { title: '民法第125條', article: '§125', text: '請求權，因十五年間不行使而消滅。但法律所定期間較短者，依其規定。' },
        { title: '民法第129條第1項', article: '§129', text: '消滅時效，因左列事由而中斷：一、請求。二、承認。三、起訴。' },
        { title: '民法第130條', article: '§130', text: '時效因請求而中斷者，若於請求後六個月內不起訴，視為不中斷。' }
      ]
    },
    {
      title: '刑事告訴乃論與追訴權時效實務',
      content: '告訴乃論之罪（如刑法第 284 條過失傷害罪、第 309 條公然侮辱罪、第 310 條誹謗罪），告訴人自「知悉犯人之時起」，於 6 個月內未提出告訴，告訴權即行消滅，檢察官將依法為不起訴處分。',
      practicalTips: [
        '車禍受傷千萬不要拖延至 6 個月後：即使調解委員會正在排期調解，6 個月告訴乃論期間「不因而停止進行」，若將逾期應先向地檢署具狀提告保全權益。',
        '債務人若在時效完成後口頭或書面表示「我下個月會還一部分」，此構成「承認」或「拋棄時效利益」，時效重新起算。'
      ],
      risksToAvoid: [
        '單純寄發存證信函卻未在 6 個月內起訴：民法第130條為實務最常見之敗訴陷阱，當事人誤以為寄了信時效就永久停住，未在6個月內提告導致全面喪失債權。'
      ]
    }
  ]
};
