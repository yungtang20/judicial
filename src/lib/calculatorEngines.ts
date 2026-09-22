import { LegalCalculatorConfig } from '../types/legalTools';

export const CHILD_SUPPORT_CALCULATOR: LegalCalculatorConfig = {
  id: 'CHILD_SUPPORT_CALCULATOR',
  categoryName: '家事事件',
  title: '未成年子女扶養費計算機',
  subtitle: '依行政院主計總處平均每人月消費支出標準及父母經濟能力比例精準試算',
  inputs: [
    {
      id: 'city',
      label: '居住縣市標準',
      type: 'select',
      defaultValue: 'taipei',
      options: [
        { label: '臺北市（約 33,000 元/月）', value: 'taipei' },
        { label: '新北市（約 26,000 元/月）', value: 'newtaipei' },
        { label: '臺中市（約 25,000 元/月）', value: 'taichung' },
        { label: '高雄市（約 24,000 元/月）', value: 'kaohsiung' },
        { label: '其他縣市（約 22,000 元/月）', value: 'others' }
      ]
    },
    {
      id: 'childrenCount',
      label: '未成年子女人數',
      type: 'number',
      defaultValue: 1,
      min: 1,
      max: 10,
      suffix: '人'
    },
    {
      id: 'fatherIncome',
      label: '父親月收入',
      type: 'number',
      defaultValue: 60000,
      suffix: '元'
    },
    {
      id: 'motherIncome',
      label: '母親月收入',
      type: 'number',
      defaultValue: 40000,
      suffix: '元'
    }
  ],
  calculate: (inputs) => {
    const cityRates: Record<string, number> = {
      taipei: 33000,
      newtaipei: 26000,
      taichung: 25000,
      kaohsiung: 24000,
      others: 22000
    };
    const baseCost = cityRates[inputs.city] || 25000;
    const count = Number(inputs.childrenCount) || 1;
    const fInc = Number(inputs.fatherIncome) || 50000;
    const mInc = Number(inputs.motherIncome) || 50000;
    const totalInc = Math.max(1, fInc + mInc);
    const fRatio = fInc / totalInc;
    const mRatio = mInc / totalInc;

    const totalChildCost = baseCost * count;
    const fatherShare = Math.round(totalChildCost * fRatio);
    const motherShare = Math.round(totalChildCost * mRatio);

    const legalClause = `【未成年子女扶養費負擔約定條款】
雙方同意對未成年子女負擔扶養義務，依雙方經濟能力比例負擔：
一、未成年子女共 ${count} 人，每月每人生活扶養費以新臺幣 ${baseCost.toLocaleString()} 元計，每月總計新臺幣 ${totalChildCost.toLocaleString()} 元。
二、由父親每月負擔新臺幣 ${fatherShare.toLocaleString()} 元整，母親每月負擔新臺幣 ${motherShare.toLocaleString()} 元整。
三、給付方式：按月於每月 5 日前匯入指定之未成年子女帳戶。如有一期遲延未付，視為全部到期。`;

    return {
      summary: [
        { label: '未成年子女每月總扶養費', value: `NT$ ${totalChildCost.toLocaleString()}`, isHighlight: true },
        { label: '父親負擔金額（比例 ' + Math.round(fRatio * 100) + '%）', value: `NT$ ${fatherShare.toLocaleString()}` },
        { label: '母親負擔金額（比例 ' + Math.round(mRatio * 100) + '%）', value: `NT$ ${motherShare.toLocaleString()}` }
      ],
      breakdown: [
        { label: '每人每月平均生活支出標準', value: `NT$ ${baseCost.toLocaleString()}` },
        { label: '受扶養子女人數', value: `${count} 人` },
        { label: '雙方收入比例 (父:母)', value: `${Math.round(fRatio * 100)}% : ${Math.round(mRatio * 100)}%` }
      ],
      notice: '扶養費之約定以子女最佳利益為最高原則，法院裁判時通常參考行政院主計總處發布之各縣市平均每人月消費支出標準。',
      legalClause
    };
  },
  guide: [
    {
      title: '民法法定扶養義務依據',
      content: '民法第1116條之2規定：「父母對於未成年子女之扶養義務，不因結婚經撤銷或離婚而受影響。」'
    },
    {
      title: '比例負擔原則',
      content: '民法第1119條規定：「扶養之程度，應按受扶養權利者之需要，與負扶養義務者之經濟能力及身分定之。」'
    }
  ]
};

export const COURT_FEE_CALCULATOR: LegalCalculatorConfig = {
  id: 'COURT_FEE_CALCULATOR',
  categoryName: '訴訟程序',
  title: '民事裁判費線上試算器',
  subtitle: '依民事訴訟法第77條之13規定計算一審起訴裁判費',
  inputs: [
    {
      id: 'claimAmount',
      label: '訴訟標的金額或價額',
      type: 'number',
      defaultValue: 1000000,
      suffix: '元'
    }
  ],
  calculate: (inputs) => {
    const amount = Number(inputs.claimAmount) || 0;
    let fee = 1000;
    if (amount <= 100000) {
      fee = 1000;
    } else if (amount <= 1000000) {
      fee = 1000 + Math.ceil((amount - 100000) / 10000) * 100;
    } else if (amount <= 10000000) {
      fee = 10900 + Math.ceil((amount - 1000000) / 100000) * 900;
    } else {
      fee = 91900 + Math.ceil((amount - 10000000) / 100000) * 800;
    }

    const legalClause = `【訴訟標的金額及裁判費聲明】
本件訴訟標的金額為新臺幣 ${amount.toLocaleString()} 元整，應徵第一審裁判費新臺幣 ${fee.toLocaleString()} 元整，已依法繳納之。`;

    return {
      summary: [
        { label: '第一審裁判費應繳金額', value: `NT$ ${fee.toLocaleString()}`, isHighlight: true },
        { label: '訴訟標的金額', value: `NT$ ${amount.toLocaleString()}` }
      ],
      legalClause
    };
  },
  guide: [
    {
      title: '民事訴訟法裁判費徵收標準',
      content: '依民事訴訟法第77條之13規定，因財產權而起訴者，其裁判費依訴訟標的金額遞進累退計徵。'
    }
  ]
};

export const INTEREST_CALCULATOR: LegalCalculatorConfig = {
  id: 'INTEREST_CALCULATOR',
  categoryName: '債權債務',
  title: '法定週年利率與違約金試算',
  subtitle: '民法第203條法定利率5%及民法第205條最高約定利率16%對照',
  inputs: [
    {
      id: 'principal',
      label: '本金金額',
      type: 'number',
      defaultValue: 500000,
      suffix: '元'
    },
    {
      id: 'rate',
      label: '年利率百分比',
      type: 'number',
      defaultValue: 5,
      suffix: '%'
    },
    {
      id: 'days',
      label: '計息日數',
      type: 'number',
      defaultValue: 365,
      suffix: '天'
    }
  ],
  calculate: (inputs) => {
    const p = Number(inputs.principal) || 0;
    const r = Number(inputs.rate) || 5;
    const d = Number(inputs.days) || 365;
    const interest = Math.round((p * (r / 100) * d) / 365);
    const total = p + interest;

    const legalClause = `【利息給付請求條款】
被告應給付原告新臺幣 ${p.toLocaleString()} 元，及自起算日起至清償日止，按週年利率 ${r}% 計算之利息（暫計至期滿共 ${d} 日利息新臺幣 ${interest.toLocaleString()} 元，本利合計新臺幣 ${total.toLocaleString()} 元）。`;

    return {
      summary: [
        { label: '試算利息金額', value: `NT$ ${interest.toLocaleString()}`, isHighlight: true },
        { label: '本利合計總金額', value: `NT$ ${total.toLocaleString()}` }
      ],
      legalClause
    };
  },
  guide: [
    {
      title: '法定利率與約定利率上限',
      content: '民法第203條規定：「應付利息之債務，其利率未經約定，亦無法律可據者，週年利率為百分之五。」民法第205條約定利率上限自民國110年修正為週年百分之十六。'
    }
  ]
};

export const SEVERANCE_PAY_CALCULATOR: LegalCalculatorConfig = {
  id: 'SEVERANCE_PAY_CALCULATOR',
  categoryName: '勞資爭議',
  title: '勞退新制資遣費與預告工資計算機',
  subtitle: '依勞工退休金條例第12條規定每滿1年發給二分之一個月平均工資',
  inputs: [
    {
      id: 'monthlySalary',
      label: '月平均工資',
      type: 'number',
      defaultValue: 45000,
      suffix: '元'
    },
    {
      id: 'seniorityYears',
      label: '工作年資（年）',
      type: 'number',
      defaultValue: 3,
      suffix: '年'
    }
  ],
  calculate: (inputs) => {
    const salary = Number(inputs.monthlySalary) || 0;
    const years = Number(inputs.seniorityYears) || 0;
    const severance = Math.round(Math.min(salary * 6, salary * years * 0.5));

    const legalClause = `【資遣費請求聲明】
雇主應給付勞工資遣費新臺幣 ${severance.toLocaleString()} 元整（依勞退新制年資 ${years} 年，以月平均工資新臺幣 ${salary.toLocaleString()} 元計算）。`;

    return {
      summary: [
        { label: '應得資遣費總額', value: `NT$ ${severance.toLocaleString()}`, isHighlight: true }
      ],
      legalClause
    };
  },
  guide: [
    {
      title: '勞退新制資遣費法規標準',
      content: '依勞工退休金條例第12條第1項規定，勞工適用本條例之退休金制度者，適用本條例後之工作年資，於第11條或第12條之規定終止勞動契約時，其資遣費由雇主按其工作年資，每滿一年發給二分之一個月之平均工資，最高以發給六個月平均工資為限。'
    }
  ]
};

const CALCULATOR_REGISTRY: Record<string, LegalCalculatorConfig> = {
  CHILD_SUPPORT_CALCULATOR,
  COURT_FEE_CALCULATOR,
  INTEREST_CALCULATOR,
  SEVERANCE_PAY_CALCULATOR,
};

export function getCalculatorConfig(toolId: string): LegalCalculatorConfig | undefined {
  return CALCULATOR_REGISTRY[toolId] || undefined;
}
