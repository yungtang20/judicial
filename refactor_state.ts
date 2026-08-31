import { Project, SyntaxKind, VariableStatement, Node } from "ts-morph";
import * as fs from "fs";

const project = new Project();
const sourceFile = project.addSourceFileAtPath("src/components/SmartAppealAssistant.tsx");

const useStates = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration)
  .filter(vd => {
    const init = vd.getInitializer();
    return init && Node.isCallExpression(init) && init.getExpression().getText() === "useState";
  });

console.log(`Found ${useStates.length} useState calls.`);
