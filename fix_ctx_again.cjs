const fs = require('fs');

const file = 'src/components/SmartAppealAssistant.tsx';
let content = fs.readFileSync(file, 'utf-8');

const undefinedVars = [
  'targetUrl', 'response', 'errStr', 'errData', 'e', 'data', 'err', 'errorMsg', 'v', 'file', 'fullText', 'ocrRes', 'ocrData', 'ocrErr', 'text', 'queryToUse', 'res', 'targetField', 'textToInsert', 'targetJid', 'activeToken', 'authRes', 'authData', 'fetchedContent', 'modified', 'match', 'precedentList', 'selectedPrecedentsList', 'documentId', 'verifyRes', 'date', 'declDate', 'reasonDate', 'today', 'diffTime', 'daysLeft'
];

undefinedVars.forEach(v => {
  const regex = new RegExp(`\\n\\s*${v},`);
  content = content.replace(regex, '');
});

fs.writeFileSync(file, content);

for (let i = 1; i <= 4; i++) {
  let step = fs.readFileSync(`src/components/appeal/AppealStep${i}.tsx`, 'utf-8');
  undefinedVars.forEach(v => {
    const regex = new RegExp(`\\n\\s*${v},`);
    step = step.replace(regex, '');
  });
  fs.writeFileSync(`src/components/appeal/AppealStep${i}.tsx`, step);
}
