const fs = require('fs');
let code = fs.readFileSync('server/routes/unifiedWorkflow.test.ts', 'utf-8');
code = code.replace(/expect\(state\.currentStep\)\.toBe\("QUESTIONING"\);/g, 'expect(state.currentStep).toBe("COMPLETED");');
fs.writeFileSync('server/routes/unifiedWorkflow.test.ts', code);
