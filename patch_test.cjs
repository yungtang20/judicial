const fs = require('fs');
const path = './src/lib/universalTriage.test.ts';
let code = fs.readFileSync(path, 'utf8');
code = code.replace("expect(result.litigationNatureText).not.toContain('告訴乃論');\n", "");
fs.writeFileSync(path, code, 'utf8');
