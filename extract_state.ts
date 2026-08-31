import { Project, SyntaxKind, VariableDeclaration, Node } from "ts-morph";
import * as fs from "fs";

const project = new Project();
const sourceFile = project.addSourceFileAtPath("src/components/SmartAppealAssistant.tsx");

// Find today definitions to move them
const todayObj = "const todayObj = new Date();";
const todayIso = "const todayIso = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;";
const todayRoc = "const todayRoc = `${todayObj.getFullYear() - 1911}年${todayObj.getMonth() + 1}月${todayObj.getDate()}日`;";

let storeContent = `
import { create } from 'zustand';
import { IssueRow, EvidenceRow, PrecedentItem } from '../types';

${todayObj}
${todayIso}
${todayRoc}

export interface AppealState {
`;

let storeActions = "";
let storeInitializers = "";

// Get all useStates
const useStates = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration)
  .filter(vd => {
    const init = vd.getInitializer();
    return init && Node.isCallExpression(init) && init.getExpression().getText() === "useState";
  });

console.log(`Found ${useStates.length} states.`);

useStates.forEach(vd => {
  const nameNode = vd.getNameNode();
  if (nameNode.getKind() === SyntaxKind.ArrayBindingPattern) {
    const elements = (nameNode as any).getElements();
    if (elements.length === 2) {
      const stateName = elements[0].getText();
      const setterName = elements[1].getText();
      
      const initCall = vd.getInitializerIfKindOrThrow(SyntaxKind.CallExpression);
      const typeArgs = initCall.getTypeArguments();
      let typeText = "any";
      if (typeArgs.length > 0) {
        typeText = typeArgs[0].getText();
      } else {
        // Infer from argument
        const args = initCall.getArguments();
        if (args.length > 0) {
           const argText = args[0].getText();
           if (argText === 'false' || argText === 'true') typeText = "boolean";
           else if (argText.startsWith("'") || argText.startsWith('"') || argText.startsWith('`')) typeText = "string";
           else if (argText.match(/^\d+$/)) typeText = "number";
        }
      }
      
      let initArg = "null as any";
      const args = initCall.getArguments();
      if (args.length > 0) {
        initArg = args[0].getText();
      }
      
      storeContent += `  ${stateName}: ${typeText};\n`;
      storeContent += `  ${setterName}: (val: ${typeText} | ((prev: ${typeText}) => ${typeText})) => void;\n`;
      
      storeInitializers += `  ${stateName}: ${initArg},\n`;
      storeActions += `  ${setterName}: (val) => set((state) => ({ ${stateName}: typeof val === 'function' ? (val as any)(state.${stateName}) : val })),\n`;
    }
  }
});

storeContent += `}

export const useAppealStore = create<AppealState>((set) => ({
${storeInitializers}
${storeActions}
}));
`;

fs.writeFileSync("src/store/useAppealStore.ts", storeContent);
console.log("Store created.");

// Now replace in component
sourceFile.addImportDeclaration({
  moduleSpecifier: "../store/useAppealStore",
  namedImports: ["useAppealStore"]
});

useStates.forEach(vd => {
  const nameNode = vd.getNameNode();
  if (nameNode.getKind() === SyntaxKind.ArrayBindingPattern) {
    const elements = (nameNode as any).getElements();
    if (elements.length === 2) {
      const stateName = elements[0].getText();
      const setterName = elements[1].getText();
      const parent = vd.getParent().getParentIfKind(SyntaxKind.VariableStatement);
      if (parent) {
        parent.replaceWithText(`const ${stateName} = useAppealStore(s => s.${stateName});\n  const ${setterName} = useAppealStore(s => s.${setterName});`);
      }
    }
  }
});

// Remove todayObj, todayIso, todayRoc from the component since they are in the store now (or they can remain, it's fine. Wait, they might be used elsewhere. Let's leave them).
// Actually if we leave them, it's fine. 

sourceFile.saveSync();
console.log("Component updated.");

