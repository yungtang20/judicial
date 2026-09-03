const fs = require('fs');
const path = './server/knowledge-base/seeds/statutes.json';
let data = JSON.parse(fs.readFileSync(path, 'utf8'));

const newStatutes = [
  {
    "id": "statute-cri-320",
    "type": "statute",
    "citation": "刑法第320條",
    "name": "刑法",
    "articleOrCaseNo": "第320條",
    "title": "普通竊盜罪",
    "content": "意圖為自己或第三人不法之所有，而竊取他人之動產者，為竊盜罪，處五年以下有期徒刑、拘役或五十萬元以下罰金。意圖為自己或第三人不法之利益，而竊佔他人之不動產者，依前項之規定處斷。前二項之未遂犯罰之。",
    "authority": "法務部",
    "date": "2019-12-25",
    "sourceUrl": "https://law.moj.gov.tw/",
    "keywords": ["竊盜", "偷", "拿走", "不法所有", "動產"]
  },
  {
    "id": "statute-cri-324",
    "type": "statute",
    "citation": "刑法第324條",
    "name": "刑法",
    "articleOrCaseNo": "第324條",
    "title": "親屬間竊盜",
    "content": "於直系血親、配偶或同財共居親屬之間，犯本章之罪者，得免除其刑。前項親屬或其他五親等內血親或三親等內姻親之間，犯本章之罪者，須告訴乃論。",
    "authority": "法務部",
    "date": "1935-01-01",
    "sourceUrl": "https://law.moj.gov.tw/",
    "keywords": ["親屬", "配偶", "告訴乃論", "同財共居", "竊盜"]
  },
  {
    "id": "statute-cri-339",
    "type": "statute",
    "citation": "刑法第339條",
    "name": "刑法",
    "articleOrCaseNo": "第339條",
    "title": "普通詐欺罪",
    "content": "意圖為自己或第三人不法之所有，以詐術使人將本人或第三人之物交付者，處五年以下有期徒刑、拘役或科或併科五十萬元以下罰金。以前項方法得財產上不法之利益或使第三人得之者，亦同。前二項之未遂犯罰之。",
    "authority": "法務部",
    "date": "2014-06-18",
    "sourceUrl": "https://law.moj.gov.tw/",
    "keywords": ["詐欺", "騙", "盜刷", "信用卡", "詐術"]
  }
];

const existingIds = new Set(data.map(d => d.id));
for (const stat of newStatutes) {
  if (!existingIds.has(stat.id)) {
    data.push(stat);
  }
}

fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
