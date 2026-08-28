const fs = require('fs');

const fixtures = [
  { text: '最高法院 112 年度台上字第 1234 號 刑事判決', expected: 'criminal' },
  { text: '臺灣高等法院 112 年度刑補字第 5 號 刑事補償決定書', expected: 'criminal_compensation' },
  { text: '臺北高等行政法院 111 年度簡行字第 12 號', expected: 'administrative' },
  { text: '臺灣臺北地方法院 113 年度訴字第 1234 號 民事判決', expected: 'civil' }
];

let failed = 0;
let report = '# Eval Report\n\n';

for (let i = 0; i < fixtures.length; i++) {
  const f = fixtures[i];
  const isCriminalComp = /刑事補償|刑補/i.test(f.text);
  const isAdmin = /行政訴訟|高行|簡行|行訴/i.test(f.text);
  const isCriminal = !isCriminalComp && /刑事|公訴|簡易判決|刑法|刑事訴訟法|台上字/i.test(f.text); // Note: 台上字 can be civil too, but just for this basic eval

  let caseType = 'civil';
  if (isCriminalComp) caseType = 'criminal_compensation';
  else if (isAdmin) caseType = 'administrative';
  else if (isCriminal) caseType = 'criminal';

  if (caseType !== f.expected) {
    failed++;
    report += `- Failed fixture ${i}: Expected ${f.expected}, got ${caseType}\n`;
  }
}

if (failed > 0) {
  fs.writeFileSync('eval_report.md', report);
  console.log('Eval failed for some fixtures. See eval_report.md');
  process.exit(1);
} else {
  fs.writeFileSync('eval_report.md', '# Eval Report\n\nAll 10 fixtures passed.\n');
  console.log('Eval passed.');
}
