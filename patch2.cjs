const fs = require('fs');
let code = fs.readFileSync('src/components/PoliceDossierTool.tsx', 'utf-8');

const oldHandleFileUpload = `  // 檔案上傳解析入口
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsParsingPdf(true);
    setParseStatus(\`正在載入並解析卷宗檔案...\`);

    try {
      const imagesToUpload: string[] = [];
      let accumulatedText = '';
      const localNativeText: { [key: number]: string } = {};

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          setParseStatus(\`正在讀取卷宗圖片 (\${file.name})...\`);
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          imagesToUpload.push(dataUrl);
        } else {
          const text = await file.text();
          accumulatedText += text + '\\n';
        }
      }

      setNativePagesText(localNativeText);
      setDossierText(accumulatedText);
      setUploadedImages(imagesToUpload);

      if (accumulatedText.trim().length < 100 && imagesToUpload.length > 0) {
        setParseStatus(\`偵測到無內嵌文字（此文件為掃描檔），正在啟用智慧分頁 OCR 辨識，並內建連線容錯與重試機制...\`);
        try {
          const processedImages = imagesToUpload.slice(0, 15);
          const ocrCombinedText = await performOcrWithRetry(processedImages, 0, (status) => {
            setParseStatus(status);
          });
          
          if (ocrCombinedText) {
            setDossierText(ocrCombinedText);
            setParseStatus(\`已成功由 AI Vision 識讀並轉換成 \${ocrCombinedText.length} 個繁體中文字！\`);
            setIsParsingPdf(false);
            return;
          }
        } catch (ocrErr) {
          console.error('Auto OCR Error:', ocrErr);
        }
      }

      setParseStatus(\`已成功載入 \${imagesToUpload.length} 頁卷宗檔案！\`);
    } catch (err) {
      console.error('File Upload/OCR Error:', err);
      alert('檔案載入過程發生問題，已自動啟用純文字備用模式。');
    } finally {
      setIsParsingPdf(false);
      // 重置 e.target.value 允許重複 or 連續上傳新檔案
      if (e.target) {
        e.target.value = '';
      }
    }
  };`;

const newHandleFileUpload = `  const { processFiles, isProcessing, processStatus: hookProcessStatus, setProcessStatus: hookSetProcessStatus } = useDossierFileProcessor();

  // 檔案上傳解析入口
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsParsingPdf(true);
    setParseStatus('正在載入並解析卷宗檔案...');

    try {
      const result = await processFiles(files);
      if (!result) return;
      
      const { imagesToUpload, accumulatedText, localNativeText } = result;

      setNativePagesText(localNativeText);
      setDossierText(accumulatedText);
      setUploadedImages(imagesToUpload);

      if (accumulatedText.trim().length < 100 && imagesToUpload.length > 0) {
        setParseStatus('偵測到無內嵌文字（此文件為掃描檔），正在啟用智慧分頁 OCR 辨識，並內建連線容錯與重試機制...');
        try {
          const processedImages = imagesToUpload.slice(0, 15);
          const ocrCombinedText = await performOcrWithRetry(processedImages, 0, (status) => {
            setParseStatus(status);
          });
          
          if (ocrCombinedText) {
            setDossierText(ocrCombinedText);
            setParseStatus(\`已成功由 AI Vision 識讀並轉換成 \${ocrCombinedText.length} 個繁體中文字！\`);
            setIsParsingPdf(false);
            if (e.target) {
              e.target.value = '';
            }
            return;
          }
        } catch (ocrErr) {
          console.error('Auto OCR Error:', ocrErr);
        }
      }

      setParseStatus(\`已成功載入 \${imagesToUpload.length} 頁卷宗檔案！\`);
    } catch (err) {
      console.error('File Upload/OCR Error:', err);
      alert('檔案載入過程發生問題，已自動啟用純文字備用模式。');
    } finally {
      setIsParsingPdf(false);
      // 重置 e.target.value 允許重複 or 連續上傳新檔案
      if (e.target) {
        e.target.value = '';
      }
    }
  };`;

if(code.includes(oldHandleFileUpload)) {
  code = code.replace(oldHandleFileUpload, newHandleFileUpload);
  fs.writeFileSync('src/components/PoliceDossierTool.tsx', code, 'utf-8');
  console.log('Replaced handleFileUpload successfully.');
} else {
  console.log('Could not find oldHandleFileUpload.');
}
