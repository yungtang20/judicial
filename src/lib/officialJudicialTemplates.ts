export interface JudicialTemplateCategory {
  name: string;
  sourceUrl: string;
  total: number;
  groups: readonly string[];
}

export const JUDICIAL_TEMPLATE_CATALOG_VERIFIED_ON = '2026-09-15';

export const JUDICIAL_TEMPLATE_CATEGORIES: readonly JudicialTemplateCategory[] = [
  { name: '民事', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1361-1.html', total: 120, groups: ['0101_民事準備狀', '0102_民事答辯狀', '0103_民事補正狀', '0110_民事委任狀', '0111_民事起訴狀', '0112_民事調解', '0113_民事聲請/請求', '0114_民事陳報/陳明/聲明', '0115_民事撤回', '0121_民事上訴', '0122_民事抗告', '0124_民事再審', '0199_民事其它'] },
  { name: '刑事', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1370-1.html', total: 72, groups: ['0202_刑事答辯狀', '0210_刑事委任狀', '0211_刑事起訴狀', '0213_刑事聲請/請求', '0214_刑事陳報/陳明/聲明', '0215_刑事撤回', '0221_刑事上訴', '0222_刑事抗告', '0224_刑事再審'] },
  { name: '少年', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1381-1.html', total: 9, groups: ['0313_少年聲請/請求'] },
  { name: '家事', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1369-1.html', total: 91, groups: ['0411_家事起訴狀', '0412_家事調解', '0413_家事聲請/請求', '0414_家事陳報/陳明/聲明', '0499_家事其它'] },
  { name: '民事保護令', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-2481-1.html', total: 5, groups: ['1513_民事保護令聲請/請求', '1514_民事保護令陳報/陳明/聲明'] },
  { name: '嚴重病人保護安置事件(精神衛生法)', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-2487-1.html', total: 14, groups: ['4303_嚴重病人保護安置事件(精神衛生法)補正狀', '4310_嚴重病人保護安置事件(精神衛生法)委任狀', '4313_嚴重病人保護安置事件(精神衛生法)聲請/請求', '4322_嚴重病人保護安置事件(精神衛生法)抗告', '4399_嚴重病人保護安置事件(精神衛生法)其它'] },
  { name: '行政訴訟', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1371-1.html', total: 120, groups: ['0502_行政訴訟答辯狀', '0510_行政訴訟委任狀', '0511_行政訴訟起訴狀', '0513_行政訴訟聲請/請求', '0514_行政訴訟陳報/陳明/聲明', '0515_行政訴訟撤回', '0521_行政訴訟上訴', '0522_行政訴訟抗告', '0524_行政訴訟再審', '0599_行政訴訟其它'] },
  { name: '智財', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1372-1.html', total: 40, groups: ['0602_智財答辯狀', '0610_智財委任狀', '0611_智財起訴狀', '0613_智財聲請/請求', '0699_智財其它'] },
  { name: '公務員懲戒', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1373-1.html', total: 46, groups: ['0702_公務員懲戒答辯狀', '0710_公務員懲戒委任狀', '0713_公務員懲戒聲請/請求', '0714_公務員懲戒陳報/陳明/聲明', '0715_公務員懲戒撤回', '0721_公務員懲戒上訴', '0722_公務員懲戒抗告', '0724_公務員懲戒再審', '0799_公務員懲戒其它'] },
  { name: '民事執行', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1366-1.html', total: 55, groups: ['0811_民事執行起訴狀', '0813_民事執行聲請/請求', '0814_民事執行陳報/陳明/聲明', '0815_民事執行撤回', '0899_民事執行其它'] },
  { name: '債務清理', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1397-1.html', total: 11, groups: ['0913_債務清理聲請/請求', '0914_債務清理陳報/陳明/聲明'] },
  { name: '非訟', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1365-1.html', total: 23, groups: ['1013_非訟聲請/請求', '1014_非訟陳報/陳明/聲明', '1016_非訟支付命令'] },
  { name: '公證', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1367-1.html', total: 8, groups: ['1113_公證聲請/請求', '1114_公證陳報/陳明/聲明', '1199_公證其它'] },
  { name: '提存', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1368-1.html', total: 5, groups: ['1213_提存聲請/請求', '1299_提存其它'] },
  { name: '登記', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1387-1.html', total: 2, groups: ['1313_登記聲請/請求'] },
  { name: '跟蹤騷擾保護令', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-2243-1.html', total: 7, groups: ['1413_跟蹤騷擾保護令聲請/請求'] },
  { name: '勞動', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1400-1.html', total: 6, groups: ['1712_勞動調解'] },
  { name: '大法庭', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1393-1.html', total: 3, groups: ['1913_大法庭聲請/請求'] },
  { name: '法官評鑑', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1402-1.html', total: 16, groups: ['2903_法官評鑑補正狀', '2910_法官評鑑委任狀', '2913_法官評鑑聲請/請求', '2914_法官評鑑陳報/陳明/聲明'] },
  { name: '憲法訴訟', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1403-1.html', total: 34, groups: ['3002_憲法訴訟答辯狀', '3003_憲法訴訟補正狀', '3010_憲法訴訟委任狀', '3011_憲法訴訟起訴狀', '3013_憲法訴訟聲請/請求', '3014_憲法訴訟陳報/陳明/聲明', '3015_憲法訴訟撤回', '3099_憲法訴訟其它'] },
  { name: '其他', sourceUrl: 'https://www.judicial.gov.tw/tw/lp-1374-1.html', total: 2, groups: ['9913_其他聲請/請求'] },
] as const;

const criminalTemplates = JUDICIAL_TEMPLATE_CATEGORIES.find(category => category.name === '刑事')!;

export const JUDICIAL_CRIMINAL_TEMPLATE_SOURCE = criminalTemplates.sourceUrl;
export const JUDICIAL_CRIMINAL_TEMPLATE_CATEGORIES = criminalTemplates.groups.map(group => {
  const [value, label] = group.split('_', 2);
  return { value, label: `${value}｜${label}` };
});
