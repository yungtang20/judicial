export interface JudicialTemplateCategory {
  id: string;
  name: string;
  sourceUrl: string;
  groups?: string[];
  description?: string;
}

export const JUDICIAL_TEMPLATE_CATEGORIES: JudicialTemplateCategory[] = [
  { id: 'civil', name: '民事', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1366-4122-83b63-1.html' },
  {
    id: 'criminal',
    name: '刑事',
    sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1367-4123-28827-1.html',
    groups: [
      '告訴告發類',
      '聲請調查證據類',
      '附帶民事訴訟類',
      '上訴抗告類',
      '保全管轄類',
      '答辯陳述類',
      '再審非常上訴類',
      '沒收特別程序類',
      '其他刑事書狀'
    ]
  },
  { id: 'juvenile', name: '少年', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1368-4124-71bc3-1.html' },
  { id: 'family', name: '家事', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1369-4125-96cd1-1.html' },
  { id: 'civil_protection', name: '民事保護令', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1370-4126-2bbd1-1.html' },
  { id: 'mental_health', name: '嚴重病人保護安置事件(精神衛生法)', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1371-4127-d64e1-1.html' },
  { id: 'administrative', name: '行政訴訟', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1372-4128-445e1-1.html' },
  { id: 'ip', name: '智財', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1373-4129-913a1-1.html' },
  { id: 'civil_servant', name: '公務員懲戒', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1374-4130-101a1-1.html' },
  { id: 'civil_execution', name: '民事執行', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1375-4131-294b1-1.html' },
  { id: 'debt_relief', name: '債務清理', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1376-4132-728c1-1.html' },
  { id: 'non_litigation', name: '非訟', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1377-4133-851d1-1.html' },
  { id: 'notary', name: '公證', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1378-4134-962e1-1.html' },
  { id: 'deposit', name: '提存', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1379-4135-a13f1-1.html' },
  { id: 'registration', name: '登記', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1380-4136-b24a1-1.html' },
  { id: 'stalking_protection', name: '跟蹤騷擾保護令', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1381-4137-c35b1-1.html' },
  { id: 'labor', name: '勞動', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1382-4138-d46c1-1.html' },
  { id: 'grand_chamber', name: '大法庭', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1383-4139-e57d1-1.html' },
  { id: 'judge_evaluation', name: '法官評鑑', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1384-4140-f68e1-1.html' },
  { id: 'constitutional', name: '憲法訴訟', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1385-4141-a79f1-1.html' },
  { id: 'others', name: '其他', sourceUrl: 'https://www.judicial.gov.tw/tw/cp-1386-4142-b80a1-1.html' }
];
