const fs = require('fs');
let code = fs.readFileSync('src/components/PoliceDossierTool.tsx', 'utf-8');

const hookCode = `
interface ProcessResult {
  imagesToUpload: string[];
  accumulatedText: string;
  localNativeText: { [key: number]: string };
}

export const useDossierFileProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');

  const processFiles = async (files: FileList | null): Promise<ProcessResult | null> => {
    if (!files || files.length === 0) return null;

    setIsProcessing(true);
    setProcessStatus('正在載入並解析卷宗檔案...');

    const imagesToUpload: string[] = [];
    let accumulatedText = '';
    const localNativeText: { [key: number]: string } = {};

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.type.startsWith('image/')) {
          setProcessStatus(\`正在讀取卷宗圖片 (\${file.name})...\`);
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          imagesToUpload.push(dataUrl);
        } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          setProcessStatus(\`正在解析 PDF 檔案 (\${file.name})...\`);
          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
              setProcessStatus(\`正在提取 PDF 第 \${pageNum}/\${pdf.numPages} 頁...\`);
              
              // 針對無法辨識的頁面使用 try-catch 區塊進行保護，並跳過該頁面繼續處理，確保核心的『陳報單』與『警詢筆錄』內容能被優先解析並提取顯示
              try {
                const page = await pdf.getPage(pageNum);
                
                // 1. 提取原生文字 (若有)
                let pageText = '';
                try {
                  const textContent = await page.getTextContent();
                  pageText = textContent.items.map((item: any) => item.str).join(' ');
                } catch (textErr) {
                  console.warn(\`第 \${pageNum} 頁文字提取失敗，將僅使用影像:\`, textErr);
                }

                if (pageText && pageText.trim().length > 10) {
                  localNativeText[imagesToUpload.length] = pageText;
                  accumulatedText += \`--- Page \${imagesToUpload.length + 1} ---\\n\${pageText}\\n\\n\`;
                }

                // 2. 轉換為圖片供 OCR 使用
                const viewport = page.getViewport({ scale: 2.0 }); // 提高解析度以利 OCR
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d') as CanvasRenderingContext2D;
                if (context) {
                  canvas.height = viewport.height;
                  canvas.width = viewport.width;
                  await page.render({ canvasContext: context, viewport }).promise;
                  
                  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                  imagesToUpload.push(dataUrl);
                }
              } catch (pageErr) {
                console.error(\`[PDF Parsing Error] 無法解析第 \${pageNum} 頁:\`, pageErr);
                setProcessStatus(\`[警告] 無法解析第 \${pageNum} 頁，已自動跳過，繼續處理後續頁面...\`);
                // 跳過該頁面，繼續處理
                continue;
              }
            }
          } catch (pdfErr) {
            console.error('PDF 解析整體失敗:', pdfErr);
            // 如果 PDF 無法使用 PDF.js 解析，將其視為一般文字讀取（保留容錯）
            const text = await file.text();
            accumulatedText += text + '\\n';
          }
        } else {
          // 其他檔案 (txt)
          setProcessStatus(\`正在讀取文字檔案 (\${file.name})...\`);
          const text = await file.text();
          accumulatedText += text + '\\n';
        }
      }
      return { imagesToUpload, accumulatedText, localNativeText };
    } catch (err) {
      console.error('檔案處理過程發生未預期錯誤:', err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return { processFiles, isProcessing, processStatus, setProcessStatus };
};

export default function PoliceDossierTool() {`;

code = code.replace("export default function PoliceDossierTool() {", hookCode);

fs.writeFileSync('src/components/PoliceDossierTool.tsx', code, 'utf-8');
console.log('Hook injected.');
