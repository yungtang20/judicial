import { LegalCalculatorConfig } from '../../types/legalTools';
import { formatCurrency } from './statutoryStandards';

export const SEVERANCE_PAY_CALCULATOR_CONFIG: LegalCalculatorConfig = {
  toolId: 'SEVERANCE_PAY_CALCULATOR',
  title: '勞工資遣費與預告期線上試算器',
  subtitle: '依據勞工退休金條例（勞退新制）第 12 條及勞動基準法第 16 條，精準計算資遣費基數、預告工資與應給謀職假',
  category: 'LABOR_CRIMINAL_CONTRACT',
  categoryName: '勞資 · 刑事 · 契約',
  inputs: [
    {
      id: 'monthlySalary',
      label: '離職前 6 個月平均工資（全薪，含固定津貼、加班費）',
      type: 'number',
      defaultValue: 50000,
      suffix: '元/月',
      helperText: '依勞基法第2條第4款規定，指計算事由發生當日前 6 個月內所得工資總額除以該期間之總日數，乘以 30 之金額。'
    },
    {
      id: 'seniorityYears',
      label: '工作年資：年（滿完整整年數）',
      type: 'number',
      defaultValue: 3,
      min: 0,
      max: 50,
      suffix: '年'
    },
    {
      id: 'seniorityMonths',
      label: '工作年資：剩餘未滿一年之月數（0~11 個月）',
      type: 'number',
      defaultValue: 6,
      min: 0,
      max: 11,
      suffix: '個月'
    },
    {
      id: 'seniorityDays',
      label: '工作年資：剩餘零星日數（0~30 天）',
      type: 'number',
      defaultValue: 0,
      min: 0,
      max: 30,
      suffix: '天'
    },
    {
      id: 'unusedLeaveDays',
      label: '當年度未休特別休假日數',
      type: 'number',
      defaultValue: 5,
      min: 0,
      max: 30,
      suffix: '天',
      helperText: '勞動契約終止時，勞工尚未休畢之特別休假日數，雇主依法應折發工資（勞基法第38條第4項）。'
    }
  ],
  calculate: (inputs) => {
    const salary = Math.max(0, Number(inputs.monthlySalary) || 0);
    const years = Math.max(0, Number(inputs.seniorityYears) || 0);
    const months = Math.max(0, Number(inputs.seniorityMonths) || 0);
    const days = Math.max(0, Number(inputs.seniorityDays) || 0);
    const unusedDays = Math.max(0, Number(inputs.unusedLeaveDays) || 0);

    // 換算總年資 (小數點)
    const totalSeniorityYears = years + (months / 12) + (days / 365);

    // 勞退新制第 12 條：每滿 1 年發給 0.5 個月平均工資，未滿 1 年按比例計給，最高以 6 個月平均工資為限 (年資上限 12 年)
    const rawMultiplier = totalSeniorityYears * 0.5;
    const cappedMultiplier = Math.min(6, rawMultiplier);
    const severancePay = Math.round(salary * cappedMultiplier);

    // 勞基法第 16 條預告期
    let noticeDays = 0;
    if (totalSeniorityYears >= 3) {
      noticeDays = 30;
    } else if (totalSeniorityYears >= 1) {
      noticeDays = 20;
    } else if (totalSeniorityYears >= (3 / 12)) {
      noticeDays = 10;
    } else {
      noticeDays = 0;
    }

    // 預告期間工資（雇主若未依法提前預告，須補發預告工資）
    const dailyWage = Math.round(salary / 30);
    const noticeWage = dailyWage * noticeDays;

    // 特休未休工資折現
    const unusedLeaveWage = dailyWage * unusedDays;

    const grandTotal = severancePay + noticeWage + unusedLeaveWage;

    const clause = `勞資資遣結算證明與給付協議：\n雇主依勞動基準法第11條終止勞動契約，雙方合意結算給付項目如下：\n一、新制資遣費：按年資結算發給 ${cappedMultiplier.toFixed(3)} 個月，計新台幣 ${formatCurrency(severancePay).replace('$', '')} 元整。\n二、預告期間工資：應預告日數為 ${noticeDays} 日，若未經預告離職，折算給付預告工資新台幣 ${formatCurrency(noticeWage).replace('$', '')} 元整。\n三、特休未休日數 ${unusedDays} 天折現工資：新台幣 ${formatCurrency(unusedLeaveWage).replace('$', '')} 元整。\n合計雇主應給付新台幣 ${formatCurrency(grandTotal).replace('$', '')} 元整，並依法於終止勞動契約後 30 日內發給資遣費，並開立「非自願離職證明書」。`;

    return {
      summary: [
        { label: '資遣結算給付總額（含預告與特休）', value: formatCurrency(grandTotal), isHighlight: true },
        { label: '新制法定資遣費金額', value: formatCurrency(severancePay), note: `基數：${cappedMultiplier.toFixed(3)} 個月工資` },
        { label: '法定預告期間', value: `${noticeDays} 天`, note: noticeDays > 0 ? `未預告折現工資：${formatCurrency(noticeWage)}` : '未滿三個月無預告期' },
        { label: '特休未休工資折現', value: formatCurrency(unusedLeaveWage), note: `${unusedDays} 天工資` }
      ],
      breakdown: [
        { label: '平均月薪全薪', value: formatCurrency(salary) },
        { label: '總年資折算', value: `${years} 年 ${months} 個月 ${days} 天（約 ${totalSeniorityYears.toFixed(2)} 年）` },
        { label: '有薪謀職假規定', value: noticeDays > 0 ? `每星期得請假 2 天外出謀職，請假期間工資照給（勞基法§16-2）` : '無預告期' },
        { label: '法定發給期限', value: '終止契約日起 30 日內給付（勞工退休金條例§12-2）' }
      ],
      legalClause: clause,
      notice: '雇主開立非自願離職證明：勞工遭資遣有權要求雇主開立非自願離職證明書，憑以向公立就業服務機構申請最長 6 個月之失業給付（前 6 個月平均投保薪資之 60%）。'
    };
  },
  guide: [
    {
      title: '勞退新制資遣費計算標準（勞工退休金條例第12條）',
      content: '民國 94 年 7 月 1 日以後適用勞工退休金條例之勞工，每滿 1 年發給 0.5 個月平均工資，未滿 1 年按比例計給，最高以 6 個月平均工資為限。',
      statutes: [
        { title: '勞工退休金條例第12條', article: '§12', text: '勞工適用本條例之退休金制度者，其資遣費由雇主按其工作年資，每滿一年發給二分之一個月之平均工資，未滿一年者，以比例計給；最高以發給六個月平均工資為限。雇主應於終止勞動契約後三十日內發給。' },
        { title: '勞動基準法第16條', article: '§16', text: '雇主依第十一條或第十三條但書規定終止勞動契約者，其預告期間依左列各款之規定：一、繼續工作三個月以上一年未滿者，於十日前預告之。二、繼續工作一年以上三年未滿者，於二十日前預告之。三、繼續工作三年以上者，於三十日前預告之。' }
      ]
    },
    {
      title: '資遣程序法定要件與實務注意事項',
      content: '雇主資遣勞工必須具備勞動基準法第 11 條各款法定事由（如虧損、業務緊縮、業務性質變更無適當工作可安置，或勞工確不能勝任工作），並符合「解僱最後手段性原則」。',
      practicalTips: [
        '平均工資計算：應包含底薪、全勤獎金、職務加給、績效獎金及固定加班費等所有經常性給與，雇主不得自行片面扣減。',
        '預告期間勞工享有每星期最多 2 日之「有薪謀職假」，雇主不得扣薪或阻撓。',
        '非自願離職證明：雇主不得拒絕開立。若雇主拒絕開立，勞工可向地方勞工局申訴或申請勞資爭議調解，勞工局可依法代為開立就業保險專用離職證明。'
      ],
      risksToAvoid: [
        '切勿輕易簽署自願離職單：一旦簽署自願離職或員工自請離職申請書，將喪失請求資遣費及申請失業給付之權利。',
        '資遣通報義務：雇主應於資遣員工 10 日前向當地主管機關及公立就業服務機構通報（就業服務法第33條），否則處新台幣 3 萬至 15 萬元罰鍰。'
      ]
    }
  ]
};
