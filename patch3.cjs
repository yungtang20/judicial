const fs = require('fs');
let code = fs.readFileSync('src/components/PoliceDossierTool.tsx', 'utf-8');

code = code.replace(
  `export const useDossierFileProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');

  const processFiles = async (files: FileList | null): Promise<ProcessResult | null> => {`,
  `export const useDossierFileProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processFiles = async (files: FileList | null, onProgress: (status: string) => void): Promise<ProcessResult | null> => {`
);

code = code.replace(/setProcessStatus\(/g, "onProgress(");

code = code.replace(
  `return { processFiles, isProcessing, processStatus, setProcessStatus };`,
  `return { processFiles, isProcessing };`
);

code = code.replace(
  `const { processFiles, isProcessing, processStatus: hookProcessStatus, setProcessStatus: hookSetProcessStatus } = useDossierFileProcessor();`,
  `const { processFiles } = useDossierFileProcessor();`
);

code = code.replace(
  `const result = await processFiles(files);`,
  `const result = await processFiles(files, (status) => setParseStatus(status));`
);

fs.writeFileSync('src/components/PoliceDossierTool.tsx', code, 'utf-8');
console.log('Hook updated.');
