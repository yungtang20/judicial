import { LegalCalculatorConfig } from '../../types/legalTools';
import { formatCurrency } from './statutoryStandards';

export const INHERITANCE_PORTION_CALCULATOR_CONFIG: LegalCalculatorConfig = {
  toolId: 'INHERITANCE_PORTION_CALCULATOR',
  title: '遺產分配與特留分試算器',
  subtitle: '依據民法第 1138 條繼承順位與第 1223 條特留分扣減比例，精準試算各繼承人之應繼分與最低特留分保障額',
  category: 'FAMILY',
  categoryName: '家事 · 離婚｜親權｜財產',
  inputs: [
    {
      id: 'estateTotal',
      label: '被繼承人遺產淨額總額（資產扣除負債後）',
      type: 'number',
      defaultValue: 12000000,
      suffix: '元',
      helperText: '包含不動產、存款、股票、有價證券等，扣除喪葬費與被繼承人生前債務後之淨遺產總值。'
    },
    {
      id: 'hasSpouse',
      label: '是否有生存配偶',
      type: 'select',
      defaultValue: 'true',
      options: [
        { label: '有生存配偶（當然繼承人）', value: 'true' },
        { label: '無生存配偶（配偶已歿或未婚/離婚）', value: 'false' }
      ]
    },
    {
      id: 'order',
      label: '同順序繼承人身分（民法第1138條法定順序）',
      type: 'select',
      defaultValue: 'ORDER_1_CHILDREN',
      options: [
        { label: '第一順位：直系血親卑親屬（子女／孫子女）', value: 'ORDER_1_CHILDREN', subtitle: '特留分為應繼分之 1/2' },
        { label: '第二順位：父母（無第一順位時）', value: 'ORDER_2_PARENTS', subtitle: '特留分為應繼分之 1/2' },
        { label: '第三順位：兄弟姊妹（無一、二順位時）', value: 'ORDER_3_SIBLINGS', subtitle: '特留分為應繼分之 1/3' },
        { label: '第四順位：祖父母（無一、二、三順位時）', value: 'ORDER_4_GRANDPARENTS', subtitle: '特留分為應繼分之 1/3' },
        { label: '僅有配偶，無任何血親繼承人', value: 'ONLY_SPOUSE', subtitle: '配偶取得全部遺產，特留分 1/2' }
      ]
    },
    {
      id: 'heirCount',
      label: '同順位繼承人總人數（不含配偶）',
      type: 'number',
      defaultValue: 2,
      min: 1,
      max: 20,
      suffix: '人',
      helperText: '例如有 2 位子女，此處填 2。'
    }
  ],
  calculate: (inputs) => {
    const estateTotal = Math.max(0, Number(inputs.estateTotal) || 0);
    const hasSpouse = inputs.hasSpouse === 'true';
    const order = inputs.order || 'ORDER_1_CHILDREN';
    const heirCount = Math.max(1, Number(inputs.heirCount) || 1);

    interface HeirCalc {
      name: string;
      fractionName: string;
      statutoryPortion: number;
      forcedShareFractionName: string;
      forcedShareAmount: number;
    }

    const heirs: HeirCalc[] = [];

    if (order === 'ONLY_SPOUSE' || !hasSpouse && heirCount <= 0) {
      if (hasSpouse) {
        heirs.push({
          name: '生存配偶',
          fractionName: '全部 (1/1)',
          statutoryPortion: estateTotal,
          forcedShareFractionName: '應繼分之 1/2 (即全部之 1/2)',
          forcedShareAmount: estateTotal * 0.5
        });
      }
    } else if (order === 'ORDER_1_CHILDREN') {
      // 第一順序：直系卑親屬與配偶平均分配
      const totalParts = (hasSpouse ? 1 : 0) + heirCount;
      const partAmount = estateTotal / totalParts;
      if (hasSpouse) {
        heirs.push({
          name: '生存配偶',
          fractionName: `1/${totalParts}`,
          statutoryPortion: partAmount,
          forcedShareFractionName: '應繼分之 1/2',
          forcedShareAmount: partAmount * 0.5
        });
      }
      for (let i = 1; i <= heirCount; i++) {
        heirs.push({
          name: `第 ${i} 位子女`,
          fractionName: `1/${totalParts}`,
          statutoryPortion: partAmount,
          forcedShareFractionName: '應繼分之 1/2',
          forcedShareAmount: partAmount * 0.5
        });
      }
    } else if (order === 'ORDER_2_PARENTS') {
      // 第二順位：父母與配偶，配偶1/2，父母均分其餘1/2
      if (hasSpouse) {
        heirs.push({
          name: '生存配偶',
          fractionName: '1/2',
          statutoryPortion: estateTotal * 0.5,
          forcedShareFractionName: '應繼分之 1/2',
          forcedShareAmount: estateTotal * 0.5 * 0.5
        });
        const remaining = estateTotal * 0.5;
        const perParent = remaining / heirCount;
        for (let i = 1; i <= heirCount; i++) {
          heirs.push({
            name: `父母（第 ${i} 人）`,
            fractionName: `1/${2 * heirCount}`,
            statutoryPortion: perParent,
            forcedShareFractionName: '應繼分之 1/2',
            forcedShareAmount: perParent * 0.5
          });
        }
      } else {
        const perParent = estateTotal / heirCount;
        for (let i = 1; i <= heirCount; i++) {
          heirs.push({
            name: `父母（第 ${i} 人）`,
            fractionName: `1/${heirCount}`,
            statutoryPortion: perParent,
            forcedShareFractionName: '應繼分之 1/2',
            forcedShareAmount: perParent * 0.5
          });
        }
      }
    } else if (order === 'ORDER_3_SIBLINGS') {
      // 第三順位：兄弟姊妹。配偶1/2，兄弟姊妹均分其餘1/2。兄弟姊妹特留分僅1/3。
      if (hasSpouse) {
        heirs.push({
          name: '生存配偶',
          fractionName: '1/2',
          statutoryPortion: estateTotal * 0.5,
          forcedShareFractionName: '應繼分之 1/2',
          forcedShareAmount: estateTotal * 0.5 * 0.5
        });
        const remaining = estateTotal * 0.5;
        const perSibling = remaining / heirCount;
        for (let i = 1; i <= heirCount; i++) {
          heirs.push({
            name: `兄弟姊妹（第 ${i} 人）`,
            fractionName: `1/${2 * heirCount}`,
            statutoryPortion: perSibling,
            forcedShareFractionName: '應繼分之 1/3',
            forcedShareAmount: perSibling * (1 / 3)
          });
        }
      } else {
        const perSibling = estateTotal / heirCount;
        for (let i = 1; i <= heirCount; i++) {
          heirs.push({
            name: `兄弟姊妹（第 ${i} 人）`,
            fractionName: `1/${heirCount}`,
            statutoryPortion: perSibling,
            forcedShareFractionName: '應繼分之 1/3',
            forcedShareAmount: perSibling * (1 / 3)
          });
        }
      }
    } else if (order === 'ORDER_4_GRANDPARENTS') {
      // 第四順位：祖父母。配偶2/3，祖父母均分1/3。特留分1/3。
      if (hasSpouse) {
        heirs.push({
          name: '生存配偶',
          fractionName: '2/3',
          statutoryPortion: estateTotal * (2 / 3),
          forcedShareFractionName: '應繼分之 1/2',
          forcedShareAmount: estateTotal * (2 / 3) * 0.5
        });
        const remaining = estateTotal * (1 / 3);
        const perGrand = remaining / heirCount;
        for (let i = 1; i <= heirCount; i++) {
          heirs.push({
            name: `祖父母（第 ${i} 人）`,
            fractionName: `1/${3 * heirCount}`,
            statutoryPortion: perGrand,
            forcedShareFractionName: '應繼分之 1/3',
            forcedShareAmount: perGrand * (1 / 3)
          });
        }
      } else {
        const perGrand = estateTotal / heirCount;
        for (let i = 1; i <= heirCount; i++) {
          heirs.push({
            name: `祖父母（第 ${i} 人）`,
            fractionName: `1/${heirCount}`,
            statutoryPortion: perGrand,
            forcedShareFractionName: '應繼分之 1/3',
            forcedShareAmount: perGrand * (1 / 3)
          });
        }
      }
    }

    const summary = heirs.map(h => ({
      label: `${h.name} 法定應繼分`,
      value: formatCurrency(Math.round(h.statutoryPortion)),
      note: `比例：${h.fractionName}（特留分底線保障額：${formatCurrency(Math.round(h.forcedShareAmount))}）`
    }));

    const breakdown = heirs.map(h => ({
      label: `${h.name} 最低特留分保障`,
      value: `${formatCurrency(Math.round(h.forcedShareAmount))}（${h.forcedShareFractionName}）`
    }));

    const clauseLines = heirs.map(h => 
      `・繼承人【${h.name}】：應繼分比例為 ${h.fractionName}，分配遺產價值新台幣 ${formatCurrency(Math.round(h.statutoryPortion)).replace('$', '')} 元整（特留分保障額 ${formatCurrency(Math.round(h.forcedShareAmount)).replace('$', '')} 元整）。`
    ).join('\n');

    const clause = `遺產分割協議條款：\n全體繼承人同意就立被繼承人所遺留之全部遺產，依下列比例進行分割與繼承登記：\n${clauseLines}\n立協議書人均確認上開分配無侵害各繼承人之法定特留分，並同意共同配合辦理稅捐申報及產權移轉登記。`;

    return {
      summary,
      breakdown,
      legalClause: clause,
      notice: '註：特留分為民法強制規定之繼承人最低保障比例，被繼承人雖得立遺囑指定遺產分配，但若侵害特留分，受侵害之繼承人得依民法第1225條行使扣減權。另生存配偶可於遺產分配前，優先主張民法第1030條之1夫妻剩餘財產分配請求權。'
    };
  },
  guide: [
    {
      title: '應繼分與特留分的差異',
      content: '「應繼分」是若被繼承人未立遺囑時，各繼承人依法得繼承遺產之比例。「特留分」則是法律為了防止被繼承人因偏愛或私心將遺產全部給予特定人，特別為法定繼承人保留之「最低底線份額」。',
      statutes: [
        { title: '民法第1138條', article: '§1138', text: '遺產繼承人，除配偶外，依左列順序定之：一、直系血親卑親屬。二、父母。三、兄弟姊妹。四、祖父母。' },
        { title: '民法第1144條', article: '§1144', text: '配偶有相互繼承遺產之權，其應繼分，依左列各款定之：一、與第一千一百三十八條所定第一順序之繼承人同為繼承時，其應繼分與他繼承人平均。' },
        { title: '民法第1223條', article: '§1223', text: '繼承人之特留分，依左列各款定之：一、直系血親卑親屬之特留分，為其應繼分二分之一。二、父母之特留分，為其應繼分二分之一。三、配偶之特留分，為其應繼分二分之一。四、兄弟姊妹之特留分，為其應繼分三分之一。五、祖父母之特留分，為其應繼分三分之一。' }
      ]
    },
    {
      title: '遺產規劃與特留分侵害救濟',
      content: '實務上被繼承人透過立「自書遺囑」或「代筆遺囑」處分遺產時，若將全部遺產指定由單一子女繼承，其他繼承人受特留分侵害時，得行使「特留分扣減權」。',
      practicalTips: [
        '遺囑中若侵害他人特留分，該遺囑「並非整份無效」，僅受侵害之部分得被扣減。',
        '扣減權之行使性質上屬於形成權，得向受遺贈人或受分配之人以存證信函或訴訟為意思表示。',
        '配偶在計算遺產前，可先計算夫妻剩餘財產差額，將差額抽離遺產總額後再行分割，通常可達節省遺產稅與保障配偶權益之效。'
      ],
      risksToAvoid: [
        '扣減權時效：實務通常類推適用民法第1146條繼承回復請求權之規定，自知悉被侵害之時起2年，或繼承開始起逾10年者，不得行使。',
        '生前贈與：若為結婚、分居或營業而為之特留分生前特種贈與，依民法第1173條須歸扣入遺產計算。'
      ]
    }
  ]
};
