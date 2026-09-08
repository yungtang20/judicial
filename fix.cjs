const fs = require('fs');

let guide = fs.readFileSync('src/components/LegalGuideHome.tsx', 'utf-8');
if (!guide.includes('const { handleSelectTool } = useToolContext();')) {
  guide = guide.replace(
    /export const LegalGuideHome: React\.FC = \(\{ onSelectTool \}\) => \{/,
    "export const LegalGuideHome: React.FC = () => {\n  const { handleSelectTool } = useToolContext();"
  );
  // wait, the original was `export const LegalGuideHome: React.FC<LegalGuideHomeProps> = ({ onSelectTool }) => {`
  // if my previous replace failed, let's just do it again manually using string search.
}
fs.writeFileSync('src/components/LegalGuideHome.tsx', guide);
