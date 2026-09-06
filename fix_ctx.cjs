const fs = require('fs');

const file = 'src/components/SmartAppealAssistant.tsx';
let content = fs.readFileSync(file, 'utf-8');

const undefinedVars = [
  'e', 'data', 'err', 'errorMsg', 'v', 'file', 'fullText', 'ocrRes', 'ocrData', 'ocrErr', 'text', 'queryToUse', 'res', 'targetField', 'textToInsert', 'targetJid', 'activeToken', 'authRes', 'authData', 'fetchedContent', 'modified', 'match', 'precedentList', 'selectedPrecedentsList', 'documentId', 'verifyRes', 'date', 'declDate', 'reasonDate', 'today', 'diffTime', 'daysLeft'
];

undefinedVars.forEach(v => {
  const regex = new RegExp(`\\n\\s*${v},`);
  content = content.replace(regex, '');
});

fs.writeFileSync(file, content);

let step3 = fs.readFileSync('src/components/appeal/AppealStep3.tsx', 'utf-8');
step3 = step3.replace('e.target.files', '(e.target as HTMLInputElement).files');
fs.writeFileSync('src/components/appeal/AppealStep3.tsx', step3);

