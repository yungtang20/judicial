import { Project, SyntaxKind } from "ts-morph";
import * as fs from "fs";

const project = new Project();
const sourceFile = project.addSourceFileAtPath("src/components/SmartAppealAssistant.tsx");
const typesFile = project.addSourceFileAtPath("src/types.ts");

const interfaces = sourceFile.getInterfaces();
let added = false;
interfaces.forEach(intf => {
  if (['IssueRow', 'EvidenceRow', 'PrecedentItem'].includes(intf.getName())) {
    typesFile.addInterface({
      name: intf.getName(),
      isExported: true,
      properties: intf.getProperties().map(p => ({
        name: p.getName(),
        type: p.getTypeNode()?.getText() || 'any',
        hasQuestionToken: p.hasQuestionToken()
      }))
    });
    intf.remove();
    added = true;
  }
});

if (added) {
  sourceFile.addImportDeclaration({
    moduleSpecifier: "../types",
    namedImports: ["IssueRow", "EvidenceRow", "PrecedentItem"]
  });
  sourceFile.saveSync();
  typesFile.saveSync();
  console.log("Types extracted.");
} else {
  console.log("Types already extracted.");
}
