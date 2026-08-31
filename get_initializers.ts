import { Project, SyntaxKind, Node } from "ts-morph";
const project = new Project();
const sourceFile = project.addSourceFileAtPath("src/components/SmartAppealAssistant.tsx");

const useStates = sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration)
  .filter(vd => {
    const init = vd.getInitializer();
    return init && Node.isCallExpression(init) && init.getExpression().getText() === "useState";
  });

useStates.forEach(vd => {
  const init = vd.getInitializerIfKindOrThrow(SyntaxKind.CallExpression);
  const args = init.getArguments();
  if (args.length > 0) {
    const argText = args[0].getText();
    if (!argText.match(/^(true|false|'|`|"|\[|\{|\d)/)) {
       console.log(vd.getText());
    }
  }
});
