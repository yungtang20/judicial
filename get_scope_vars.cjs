const fs = require('fs');
const content = fs.readFileSync('src/components/SmartAppealAssistant.tsx', 'utf-8');

const ts = require('typescript');
const sourceFile = ts.createSourceFile('test.tsx', content, ts.ScriptTarget.Latest, true);

let vars = new Set();
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.kind === ts.SyntaxKind.Identifier) {
    vars.add(node.name.text);
  } else if (ts.isVariableDeclaration(node) && node.name.kind === ts.SyntaxKind.ArrayBindingPattern) {
    node.name.elements.forEach(el => {
      if (el.name && el.name.kind === ts.SyntaxKind.Identifier) {
        vars.add(el.name.text);
      }
    });
  } else if (ts.isFunctionDeclaration(node) && node.name) {
    vars.add(node.name.text);
  }
  ts.forEachChild(node, visit);
}

// Find the SmartAppealAssistant function
sourceFile.statements.forEach(stmt => {
  if (ts.isFunctionDeclaration(stmt) && stmt.name.text === 'SmartAppealAssistant') {
    stmt.body.statements.forEach(child => {
      if (child.kind === ts.SyntaxKind.VariableStatement || child.kind === ts.SyntaxKind.FunctionDeclaration) {
        visit(child);
      }
    });
  }
});
console.log(Array.from(vars).join(', '));
