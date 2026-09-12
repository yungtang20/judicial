import { LegalCalculatorConfig } from '../../types/legalTools';
import { formatCurrency } from './statutoryStandards';

export const RESIDUAL_PROPERTY_CALCULATOR_CONFIG: LegalCalculatorConfig = {
  toolId: 'RESIDUAL_PROPERTY_CALCULATOR',
  title: '夫妻剩餘財產分配試算器',
  subtitle: '依據民法第 1030 條之 1，精準計算離婚或一方死亡時，婚後現存財產扣除負債後之差額分配金額',
  category: 'FAMILY',
  categoryName: '家事 · 離婚｜親權｜財產',
  inputs: [
    {
      id: 'husbandAsset',
      label: '夫之婚後財產總值（房產、存款、股票、車輛等現值）',
      type: 'number',
      defaultValue: 8000000,
      suffix: '元',
      helperText: '婚後所取得之財產。注意：依法必須扣除「繼承取得」、「無償受贈」及「慰撫金」。'
    },
    {
      id: 'husbandDebt',
      label: '夫之婚後所負債務總額（房貸、信貸、卡債等）',
      type: 'number',
      defaultValue: 2000000,
      suffix: '元'
    },
    {
      id: 'wifeAsset',
      label: '妻之婚後財產總值（扣除繼承、無償贈與、慰撫金）',
      type: 'number',
      defaultValue: 3000000,
      suffix: '元'
    },
    {
      id: 'wifeDebt',
      label: '妻之婚後所負債務總額',
      type: 'number',
      defaultValue: 500000,
      suffix: '元'
    }
  ],
  calculate: (inputs) => {
    const hAsset = Math.max(0, Number(inputs.husbandAsset) || 0);
    const hDebt = Math.max(0, Number(inputs.husbandDebt) || 0);
    const wAsset = Math.max(0, Number(inputs.wifeAsset) || 0);
    const wDebt = Math.max(0, Number(inputs.wifeDebt) || 0);

    // 剩餘財產 = 婚後財產 - 婚後負債，負數以 0 計 (民法第1030條之1第1項但書)
    const hNet = Math.max(0, hAsset - hDebt);
    const wNet = Math.max(0, wAsset - wDebt);

    const diff = Math.abs(hNet - wNet);
    const distributionAmount = Math.round(diff / 2);

    let payer = '';
    let receiver = '';
    if (hNet > wNet) {
      payer = '夫方';
      receiver = '妻方';
    } else if (wNet > hNet) {
      payer = '妻方';
      receiver = '夫方';
    } else {
      payer = '雙方財產均等';
      receiver = '無須給付';
    }

    const clause = distributionAmount > 0
      ? `雙方依民法第1030條之1規定結算剩餘財產分配：\n確認夫方婚後淨財產為新台幣 ${formatCurrency(hNet).replace('$', '')} 元整，妻方婚後淨財產為新台幣 ${formatCurrency(wNet).replace('$', '')} 元整，雙方淨額差額為新台幣 ${formatCurrency(diff).replace('$', '')} 元整。\n應由【${payer}】給付【${receiver}】剩餘財產差額半數新台幣 ${formatCurrency(distributionAmount).replace('$', '')} 元整，並於民國　年　月　日前一次付清。給付完畢後，雙方相互拋棄其餘一切民法上之剩餘財產分配請求權。`
      : `雙方確認婚後淨財產無差額，互相拋棄民法第1030條之1剩餘財產分配請求權，此後均不得再向他方主張任何財產分配。`;

    return {
      summary: [
        { label: '應分配給付差額金額', value: formatCurrency(distributionAmount), isHighlight: true, note: distributionAmount > 0 ? `由【${payer}】給付予【${receiver}】` : '雙方淨額相同' },
        { label: '雙方婚後淨財產差額', value: formatCurrency(diff) },
        { label: '夫方婚後淨財產 (資產-負債)', value: formatCurrency(hNet), note: `總資產 ${formatCurrency(hAsset)} - 負債 ${formatCurrency(hDebt)}` },
        { label: '妻方婚後淨財產 (資產-負債)', value: formatCurrency(wNet), note: `總資產 ${formatCurrency(wAsset)} - 負債 ${formatCurrency(wDebt)}` }
      ],
      breakdown: [
        { label: '夫方婚後總資產', value: formatCurrency(hAsset) },
        { label: '夫方婚後總負債', value: formatCurrency(hDebt) },
        { label: '妻方婚後總資產', value: formatCurrency(wAsset) },
        { label: '妻方婚後總負債', value: formatCurrency(wDebt) }
      ],
      legalClause: clause,
      notice: '特別注意消滅時效：依民法第1030條之1第5項，剩餘財產分配請求權，自請求權人知有剩餘財產之差額時起，2年間不行使而消滅。自法定財產制關係消滅時（例如判決離婚確定日或離婚登記日）起，逾5年者亦同。'
    };
  },
  guide: [
    {
      title: '剩餘財產分配的計算原則與除外規定',
      content: '法定財產制關係消滅時（離婚、婚姻撤銷或配偶一方死亡），夫或妻現存之婚後財產，扣除婚姻關係存續所負債務後，如有剩餘，其雙方剩餘財產之差額，應平均分配。',
      statutes: [
        { title: '民法第1030條之1第1項', article: '§1030-1', text: '法定財產制關係消滅時，夫或妻現存之婚後財產，扣除婚姻關係存續所負債務後，如有剩餘，其雙方剩餘財產之差額，應平均分配。但下列財產不在此限：一、因繼承或其他無償取得之財產。二、慰撫金。' },
        { title: '民法第1030條之1第5項', article: '§1030-1 (5)', text: '第一項請求權，自請求權人知有剩餘財產之差額時起，二年間不行使而消滅。自法定財產制關係消滅時起，逾五年者亦同。' }
      ]
    },
    {
      title: '實務爭議與法院調整標準（民法第1030條之1第2項）',
      content: '平均分配顯失公平者，法院得調整或免除其分配額。法院審酌時，會綜合考量婚姻存續期間家事勞動、子女撫育、經濟貢獻及雙方協力狀況。',
      practicalTips: [
        '外遇、家暴不直接等於喪失財產分配權，但若一方長年未負擔家計、揮霍無度或脫產，法院得依第2項酌減或免除其分配額。',
        '在離婚前 5 年內為減少他方分配額而處分財產者（例如惡意脫產給親戚），應追加計算為婚後財產（民法第1030條之3）。',
        '雙方協議離婚時，若已在協議書載明「互相拋棄剩餘財產分配請求權」，登記後即不可再行起訴反悔請求。'
      ],
      risksToAvoid: [
        '時效僅有 2 年：知悉有差額起 2 年內必須起訴或發送存證信函並於 6 個月內起訴，切勿拖延。',
        '婚前財產若在婚後增值或已清償貸款，增值部分或以婚後所得償還之貸款部分，在實務上有細膩之求償與計算爭議，應詳備銀行流水帳。'
      ]
    }
  ]
};
