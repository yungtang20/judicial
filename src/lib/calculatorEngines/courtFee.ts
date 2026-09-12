import { LegalCalculatorConfig } from '../../types/legalTools';
import { calculateCourtFee, formatCurrency } from './statutoryStandards';

export const COURT_FEE_CALCULATOR_CONFIG: LegalCalculatorConfig = {
  toolId: 'COURT_FEE_CALCULATOR',
  title: '民事裁判費線上試算器',
  subtitle: '依據民事訴訟法第 77 條之 13 與第 77 條之 16，精確試算一審起訴、二三審上訴與支付命令之應納裁判規費',
  category: 'DEBT',
  categoryName: '討債 · 金錢糾紛',
  inputs: [
    {
      id: 'claimAmount',
      label: '訴訟標的金額／價額（請求賠償或給付之總金額）',
      type: 'number',
      defaultValue: 1000000,
      suffix: '元',
      helperText: '例如：請求借款 1,000,000 元、車禍賠償 500,000 元。非財產權訴訟（如確認親子關係、離婚）則依民事訴訟法第77條之14徵收定額 3,000 元。'
    },
    {
      id: 'procedureType',
      label: '救濟程序或審級階段',
      type: 'select',
      defaultValue: 'first',
      options: [
        { label: '第一審起訴（地方法院）', value: 'first', subtitle: '依民訴§77-13分級累進' },
        { label: '第二審／第三審上訴（高等法院／最高法院）', value: 'second_third', subtitle: '一審之 1.5 倍（加徵 5/10）' },
        { label: '聲請支付命令（督促程序）', value: 'payment_order', subtitle: '定額 500 元（債務人異議視為起訴需補繳差額）' }
      ]
    },
    {
      id: 'isNonProperty',
      label: '是否為非財產權訴訟（如單純訴請離婚、撤銷婚姻）',
      type: 'select',
      defaultValue: 'false',
      options: [
        { label: '否（財產權訴訟，依訴訟標的金額累進計費）', value: 'false' },
        { label: '是（非財產權訴訟，徵收固定規費 3,000 元）', value: 'true' }
      ]
    }
  ],
  calculate: (inputs) => {
    const isNonProp = inputs.isNonProperty === 'true';
    const proc = (inputs.procedureType || 'first') as 'first' | 'second_third' | 'payment_order';
    const claimAmount = Math.max(0, Number(inputs.claimAmount) || 0);

    let fee = 0;
    let ruleText = '';

    if (isNonProp) {
      if (proc === 'second_third') {
        fee = 4500;
        ruleText = '民事訴訟法第77條之14、第77條之16：非財產權訴訟二審/三審加徵5/10，徵收 4,500 元';
      } else {
        fee = 3000;
        ruleText = '民事訴訟法第77條之14：非因財產權而起訴者，徵收裁判費 3,000 元';
      }
    } else {
      const res = calculateCourtFee(claimAmount, proc);
      fee = res.fee;
      ruleText = res.basisRule;
    }

    const firstFee = isNonProp ? 3000 : calculateCourtFee(claimAmount, 'first').fee;
    const secondFee = Math.round(firstFee * 1.5);

    const clause = `訴訟費用由被告負擔。\n（聲明事項：請准原告提供擔保宣告假執行，並命被告負擔第一審裁判費新台幣 ${formatCurrency(fee).replace('$', '')} 元）`;

    return {
      summary: [
        { label: '本階段應繳納裁判費', value: formatCurrency(fee), isHighlight: true, note: ruleText },
        { label: '訴訟標的金額', value: isNonProp ? '非財產權（固定費率）' : formatCurrency(claimAmount) },
        { label: '第一審起訴規費對照', value: formatCurrency(firstFee) },
        { label: '第二審上訴規費對照', value: formatCurrency(secondFee) }
      ],
      breakdown: [
        { label: '程序類別', value: proc === 'payment_order' ? '支付命令（督促程序）' : (proc === 'first' ? '第一審地院起訴' : '二審/三審上訴') },
        { label: '裁判費性質', value: '起訴必備要件（若未繳經通知逾期未繳將裁定駁回起訴）' },
        { label: '最終負擔者', value: '由敗訴之一方依民事訴訟法第78條負擔裁判費' }
      ],
      legalClause: clause,
      notice: '請注意：裁判費需於起訴時向法院收費處一次繳清，或於接獲法院命補繳裁判費裁定之指定期限內（通常5~7日內）繳納，逾期未繳者，法院將以起訴不合法裁定駁回。'
    };
  },
  guide: [
    {
      title: '民事裁判費的計費標準與法規',
      content: '民事訴訟因財產權起訴者，原則上「告多少金額，就按比例繳交一定成數之裁判費」。裁判費屬於「預繳」性質，原告起訴時先由原告代墊，於判決確定後，原則由「敗訴之當事人」負擔裁判費。',
      statutes: [
        { title: '民事訴訟法第77條之13', article: '§77-13', text: '因財產權而起訴，其訴訟標的之金額或價額在十萬元以下部分，徵收一千元；逾十萬元至一百萬元部分，每萬元徵收一百元；逾一百萬元至一千萬元部分，每萬元徵收九十元；逾一千萬元至一億元部分，每萬元徵收八十元；逾一億元部分，每萬元徵收七十元；其畸零之數不滿萬元者，以萬元計。' },
        { title: '民事訴訟法第77條之16', article: '§77-16', text: '向第二審或第三審法院起訴或上訴，依第七十七條之十三及第七十七條之十四規定，加徵裁判費十分之五。' }
      ]
    },
    {
      title: '實務節省訴訟費用策略',
      content: '提起民事訴訟若請求金額較高，裁判費負擔相對沉重。實務上有以下合法的省費途徑：',
      practicalTips: [
        '若債權事實明確且無爭議，可優先聲請「支付命令」（規費僅 500 元），若債務人 20 日內未異議即取得與確定判決同一之執行名義。',
        '若有刑事案件（如車禍過失傷害、詐欺），可待檢察官起訴後提起「刑事附帶民事訴訟」，依法免納第一審裁判費。',
        '調解或和解成立者，原告得於成立之日起三個月內聲請退還該審級所繳納裁判費之三分之二（民事訴訟法第84條第2項）。'
      ],
      risksToAvoid: [
        '收到法院命補繳裁判費裁定，若未在裁定期限內繳費，法院會直接「裁定駁回起訴」，且此裁定確定後原告不得抗告。',
        '請求利息、違約金部分，若為附帶請求者，不併算訴訟標的價額；但若單獨起訴請求利息者，則仍須依利息總額計徵裁判費。'
      ]
    }
  ]
};
