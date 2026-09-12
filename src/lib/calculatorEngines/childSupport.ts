import { LegalCalculatorConfig } from '../../types/legalTools';
import { REGIONAL_LIVING_EXPENSES_113, formatCurrency } from './statutoryStandards';

export const CHILD_SUPPORT_CALCULATOR_CONFIG: LegalCalculatorConfig = {
  toolId: 'CHILD_SUPPORT_CALCULATOR',
  title: '未成年子女扶養費試算器',
  subtitle: '依據主計總處各縣市每人每月平均消費支出與雙方經濟能力比例，快速試算子女扶養費與約定條款',
  category: 'FAMILY',
  categoryName: '家事 · 離婚｜親權｜財產',
  inputs: [
    {
      id: 'region',
      label: '子女實際居住縣市（參考主計總處消費支出）',
      type: 'select',
      defaultValue: 'TAIPEI',
      options: Object.entries(REGIONAL_LIVING_EXPENSES_113).map(([key, data]) => ({
        label: `${data.name}（月均生活支出：${formatCurrency(data.amount)}）`,
        value: key
      })),
      helperText: '法院通常以未成年子女居住地主計總處平均每人每月消費支出作為標準裁量基準。'
    },
    {
      id: 'actualExpense',
      label: '實際每名子女每月花費（若自行協議，選填）',
      type: 'number',
      defaultValue: 0,
      suffix: '元/月',
      helperText: '若輸入大於 0，則優先以此金額計算；填 0 則採用上方所選縣市主計總處標準。'
    },
    {
      id: 'childCount',
      label: '受扶養子女總人數',
      type: 'number',
      defaultValue: 1,
      min: 1,
      max: 10,
      suffix: '人'
    },
    {
      id: 'childAge',
      label: '最小子女目前年齡',
      type: 'number',
      defaultValue: 8,
      min: 0,
      max: 18,
      suffix: '歲',
      helperText: '民法成年年齡現為 18 歲，計算給付至成年日之剩餘月數。'
    },
    {
      id: 'payerIncome',
      label: '給付方（通常為非主要照顧者）每月平均收入',
      type: 'number',
      defaultValue: 60000,
      suffix: '元/月'
    },
    {
      id: 'receiverIncome',
      label: '受領方（主要照顧監護者）每月平均收入',
      type: 'number',
      defaultValue: 40000,
      suffix: '元/月'
    }
  ],
  calculate: (inputs) => {
    const regionKey = inputs.region || 'TAIPEI';
    const standardAmount = REGIONAL_LIVING_EXPENSES_113[regionKey]?.amount || 34321;
    const actualExpense = Number(inputs.actualExpense) || 0;
    const monthlyPerChild = actualExpense > 0 ? actualExpense : standardAmount;
    const childCount = Math.max(1, Number(inputs.childCount) || 1);
    const childAge = Math.min(18, Math.max(0, Number(inputs.childAge) || 0));
    
    const payerIncome = Math.max(0, Number(inputs.payerIncome) || 0);
    const receiverIncome = Math.max(0, Number(inputs.receiverIncome) || 0);
    const totalIncome = payerIncome + receiverIncome;

    // 依比例分攤，若雙方皆未填收入，則預設 1:1 (各 50%)
    const payerRatio = totalIncome > 0 ? (payerIncome / totalIncome) : 0.5;
    const receiverRatio = totalIncome > 0 ? (receiverIncome / totalIncome) : 0.5;

    // 給付方每名子女每月應負擔金額
    const payerPerChildMonthly = Math.round(monthlyPerChild * payerRatio);
    // 給付方全部子女每月總給付金額
    const payerTotalMonthly = payerPerChildMonthly * childCount;

    // 給付至成年 (18歲) 之剩餘總期數 (月)
    const remainingMonths = Math.max(0, (18 - childAge) * 12);
    const grandTotal = payerTotalMonthly * remainingMonths;

    const clause = `一、未成年子女之扶養費，由相對人（給付方）自民國　年　月起至未成年子女各年滿十八歲（成年前一日）止，按月於每月五日以前，給付聲請人（受領方）扶養費用每名每月新台幣 ${formatCurrency(payerPerChildMonthly).replace('$', '')} 元整（合計每月新台幣 ${formatCurrency(payerTotalMonthly).replace('$', '')} 元整），逕匯入聲請人指定之金融機構帳戶。\n二、相對人如有一期遲延履行或未完全給付，其後之給付視為全部到期，聲請人得就未到期之全部扶養費一次聲請強制執行。`;

    return {
      summary: [
        { label: '給付方每月應付總額', value: formatCurrency(payerTotalMonthly), isHighlight: true, note: `共 ${childCount} 名子女` },
        { label: '每名子女每月負擔金額', value: formatCurrency(payerPerChildMonthly), note: `分攤比例 ${(payerRatio * 100).toFixed(1)}%` },
        { label: '計算基準（每人每月）', value: formatCurrency(monthlyPerChild), note: actualExpense > 0 ? '依實際花費' : `依 ${REGIONAL_LIVING_EXPENSES_113[regionKey]?.name} 主計總處標準` },
        { label: '至 18 歲成年累計總金額', value: formatCurrency(grandTotal), note: `剩餘約 ${remainingMonths} 個月` }
      ],
      breakdown: [
        { label: '受領照顧方月收入', value: `${formatCurrency(receiverIncome)}（分攤 ${(receiverRatio * 100).toFixed(1)}%）` },
        { label: '給付負擔方月收入', value: `${formatCurrency(payerIncome)}（分攤 ${(payerRatio * 100).toFixed(1)}%）` },
        { label: '子女成年前尚餘期間', value: `${18 - childAge} 年（${remainingMonths} 期）` }
      ],
      legalClause: clause,
      notice: '註：此試算金額為法院裁判或協商常採之基準，非絕對法定單一標準；雙方如有特殊醫療、教育需求（如私校、早療），可另行提出具體單據協議或由法院審酌調增。'
    };
  },
  guide: [
    {
      title: '扶養費的法定依據與原則',
      content: '父母對於未成年子女之扶養義務，不因結婚經撤銷或離婚而受影響（民法第1116條之2）。扶養義務係本於父母子女之身分關係而生，即使未取得親權（監護權）之一方，仍依法負擔扶養未成年子女之法定義務。',
      statutes: [
        { title: '民法第1116條之2', article: '§1116-2', text: '父母對於未成年子女之扶養義務，不因結婚經撤銷或離婚而受影響。' },
        { title: '民法第1119條', article: '§1119', text: '扶養之程度，應按受扶養權利者之需要，與負扶養義務者之經濟能力及身分定之。' }
      ]
    },
    {
      title: '法院裁判實務審酌標準',
      content: '若父母雙方無法就扶養費金額達成共識，法院於裁定時，實務上多參考行政院主計總處每年公布之「各縣市平均每人每月消費支出」，作為未成年子女生活所需之客觀基準，並斟酌雙方之薪資收入、財產現況及主要照顧負擔時間（主要照顧者以勞務照顧折抵部分義務），通常以雙方經濟能力比例（例如 5:5、6:4 或 7:3）分配給付金額。',
      practicalTips: [
        '民法自民國 112 年 1 月 1 日起，已將法定成年年齡下修為 18 歲，扶養義務至滿 18 歲為止。',
        '雙方簽署協議時，務必約定「加速條款」（如有一期遲延，後續期數視為全部到期），以利後續逕行聲請強制執行。',
        '扶養費請求權屬於未成年子女本身，可由主要照顧之法定代理人代為向他方起訴請求。'
      ],
      risksToAvoid: [
        '切勿以「放棄探視權」交換「免付扶養費」，探視權與扶養義務為兩種不同身分法上之權利義務，此類約定法院常認為違反公序良俗或子女最佳利益而無效。',
        '若未公證且未經法院和解調解，對方拒付時無法直接強制執行，必須先經家事法院裁定。'
      ]
    }
  ]
};
