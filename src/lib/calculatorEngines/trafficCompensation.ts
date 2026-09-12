import { LegalCalculatorConfig } from '../../types/legalTools';
import { formatCurrency } from './statutoryStandards';

export const TRAFFIC_COMPENSATION_CALCULATOR_CONFIG: LegalCalculatorConfig = {
  toolId: 'TRAFFIC_COMPENSATION_CALCULATOR',
  title: '車禍理賠與折舊線上試算器',
  subtitle: '整合醫療、工作損失、看護費、車輛零件折舊（平均法/定率遞減法）與肇事責任比例分攤，產出求償明細與和解條款',
  category: 'TRAFFIC',
  categoryName: '車禍 · 交通事故',
  inputs: [
    {
      id: 'medicalExpenses',
      label: '實支醫療與醫藥費用（含救護車、掛號、自費醫材）',
      type: 'number',
      defaultValue: 35000,
      suffix: '元'
    },
    {
      id: 'nursingFee',
      label: '看護費用（需有診斷證明載明需專人照顧）',
      type: 'number',
      defaultValue: 48000,
      suffix: '元',
      helperText: '全日看護一般每日約 2,400~2,800 元，半日約 1,200~1,400 元。親屬看護依法亦得比照評價請求。'
    },
    {
      id: 'workLoss',
      label: '不能工作之工資損失（休養期間）',
      type: 'number',
      defaultValue: 90000,
      suffix: '元',
      helperText: '月薪 × 診斷證明註明宜休養月數。請備妥扣繳憑單、薪資轉帳證明與診斷書。'
    },
    {
      id: 'solatium',
      label: '精神慰撫金（非財產上損害）',
      type: 'number',
      defaultValue: 100000,
      suffix: '元',
      helperText: '考量雙方身分、地位、經濟能力、過失情節及傷勢痛苦程度綜合衡定。'
    },
    {
      id: 'partsExpense',
      label: '車輛修理費之「零件費用」（依法須計算折舊）',
      type: 'number',
      defaultValue: 40000,
      suffix: '元',
      helperText: '依最高法院見解，零件以新品更換舊品，應予折舊；工資與塗裝費用則不予折舊。'
    },
    {
      id: 'laborExpense',
      label: '車輛修理費之「工資及烤漆費用」（不計折舊）',
      type: 'number',
      defaultValue: 25000,
      suffix: '元'
    },
    {
      id: 'carAgeYears',
      label: '受損車輛出廠車齡',
      type: 'number',
      defaultValue: 3,
      suffix: '年',
      helperText: '依行政院固定資產耐用年數表，自用小客車耐用年數為 5 年，機車耐用年數為 3 年。'
    },
    {
      id: 'myFaultRatio',
      label: '我方肇事責任比例（%）',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 100,
      suffix: '%',
      helperText: '依初判表或車鑑會鑑定意見：完全無責填 0%；同為肇事原因填 50%；主次因可填 30% 或 70%。'
    }
  ],
  calculate: (inputs) => {
    const medical = Math.max(0, Number(inputs.medicalExpenses) || 0);
    const nursing = Math.max(0, Number(inputs.nursingFee) || 0);
    const workLoss = Math.max(0, Number(inputs.workLoss) || 0);
    const solatium = Math.max(0, Number(inputs.solatium) || 0);
    const parts = Math.max(0, Number(inputs.partsExpense) || 0);
    const labor = Math.max(0, Number(inputs.laborExpense) || 0);
    const carAge = Math.max(0, Number(inputs.carAgeYears) || 0);
    const faultRatio = Math.min(100, Math.max(0, Number(inputs.myFaultRatio) || 0));

    // 自用小客車耐用年數 5 年，定率遞減法每年折舊率 0.369，最後殘值不得低於 1/10 (即 10%)
    // 簡化平均法折舊：殘值 = 成本 / (耐用年數+1)，折舊額 = (成本 - 殘值) / 耐用年數 * 使用年數
    const usefulLife = 5;
    const residual = parts / (usefulLife + 1);
    const yearlyDeprec = (parts - residual) / usefulLife;
    const totalDeprec = Math.min(parts - residual, yearlyDeprec * Math.min(carAge, usefulLife));
    const depreciatedParts = Math.max(residual, parts - totalDeprec);

    const vehicleTotal = Math.round(depreciatedParts + labor);
    const grossTotal = medical + nursing + workLoss + solatium + vehicleTotal;

    // 依與有過失 (民法第217條) 扣減我方肇責
    const otherFaultRatio = (100 - faultRatio) / 100;
    const claimableTotal = Math.round(grossTotal * otherFaultRatio);

    const clause = `車禍和解賠償條款：\n一、對造（賠償義務人）願賠償受害人因本件車禍所受損害（含醫療費、工作損失、車損修復及精神慰撫金），經雙方會算扣除強制責任險與過失比例後，由對造給付受害人新台幣 ${formatCurrency(claimableTotal).replace('$', '')} 元整。\n二、付款方式：於簽署本和解書時一次以現金給付，或於民國　年　月　日以前逕匯入受害人指定帳戶。\n三、受害人於收受前條款項後，願拋棄對對造本件事故之其餘民事請求權，並撤回（或不再提起）刑事過失傷害之告訴。`;

    return {
      summary: [
        { label: '扣除過失比例後得求償總額', value: formatCurrency(claimableTotal), isHighlight: true, note: `對造負擔比例 ${(100 - faultRatio)}%` },
        { label: '車禍損害總估算額（未扣肇責）', value: formatCurrency(grossTotal) },
        { label: '車輛零件折舊後現值', value: formatCurrency(Math.round(depreciatedParts)), note: `原零件費用 ${formatCurrency(parts)}，折舊 ${formatCurrency(Math.round(totalDeprec))}` },
        { label: '人身傷亡損害合計', value: formatCurrency(medical + nursing + workLoss + solatium), note: '醫療、看護、休養工資與慰撫金' }
      ],
      breakdown: [
        { label: '實支醫療費用', value: formatCurrency(medical) },
        { label: '看護費用', value: formatCurrency(nursing) },
        { label: '不能工作損失', value: formatCurrency(workLoss) },
        { label: '精神慰撫金', value: formatCurrency(solatium) },
        { label: '車輛修理（工資不折舊+零件折舊後）', value: formatCurrency(vehicleTotal) },
        { label: '我方與有過失扣除比率', value: `${faultRatio}%（民法第217條）` }
      ],
      legalClause: clause,
      notice: '特別提醒刑事告訴時效：車禍造成受傷之「過失傷害罪」為告訴乃論，依刑事訴訟法第237條規定，告訴期間僅有「知悉犯人之日起 6 個月」，協商和解切勿超過此法定告訴期間！'
    };
  },
  guide: [
    {
      title: '車禍損害賠償法律項目與請求權基礎',
      content: '因故意或過失，不法侵害他人之權利者，負損害賠償責任（民法第184條第1項前段）。汽車、機車或其他動力車輛駕駛人於行車中侵害他人權利，依民法第191條之2推定有過失。',
      statutes: [
        { title: '民法第184條第1項', article: '§184-1', text: '因故意或過失，不法侵害他人之權利者，負損害賠償責任。' },
        { title: '民法第193條第1項', article: '§193-1', text: '不法侵害他人之身體或健康者，對於被害人因此喪失或減少勞動能力或增加生活上之需要時，應負損害賠償責任。' },
        { title: '民法第195條第1項', article: '§195-1', text: '不法侵害他人之身體、健康、名譽、自由、信用、隱私、貞操，或不法侵害其他人格法益而情節重大者，被害人雖非財產上之損害，亦得請求賠償相當之金額。' },
        { title: '民法第217條第1項', article: '§217-1', text: '損害之發生或擴大，被害人與有過失者，法院得減輕賠償金額，或免除之。' }
      ]
    },
    {
      title: '車損零件折舊與親屬看護裁判實務',
      content: '法院裁判車損修復賠償時，依法必須扣除零件因使用年限所生之折舊（平均法或定率遞減法，以固定資產耐用年數表為準）；但「工資及烤漆」費用則全額認列不予折舊。',
      practicalTips: [
        '最高法院 94 年度台上字第 1543 號判決意旨：因親屬受傷由親屬代為照顧，雖無實際支付金錢，仍應衡量僱用職業看護之行情認列損害，加害者不得藉口為親屬照顧而免除賠償。',
        '向保險公司申請強制險理賠與向肇事者求償可同步進行，強制險每人醫療給付上限為 20 萬元。',
        '初判表僅供參考，若對責任歸屬有重大爭議，宜於事故後 6 個月內向各縣市車輛行車事故鑑定會申請鑑定（規費 3,000 元）。'
      ],
      risksToAvoid: [
        '刑事告訴乃論僅 6 個月：若調解未果，務必於 6 個月屆滿前先向地檢署或承辦警局提出過失傷害告訴，避免告訴權消滅。',
        '民法侵權行為損害賠償消滅時效為 2 年（知悉損害及賠償義務人起算），逾 2 年對方得主張時效抗辯拒絕給付。'
      ]
    }
  ]
};
