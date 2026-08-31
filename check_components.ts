import { Project, SyntaxKind } from "ts-morph";
const project = new Project();
const sourceFile = project.addSourceFileAtPath("src/components/SmartAppealAssistant.tsx");

const components = sourceFile.getFunctions().filter(f => f.getName()?.match(/^[A-Z]/));
const arrowComponents = sourceFile.getVariableDeclarations().filter(v => v.getName().match(/^[A-Z]/) && v.getInitializerIfKind(SyntaxKind.ArrowFunction));

console.log("Functions:", components.map(c => c.getName()));
console.log("Arrow components:", arrowComponents.map(c => c.getName()));
