import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.mjs`;
  } catch (err) {
    console.warn('pdfjs setup warning:', err);
  }
}

export interface ProcessResult {
  imagesToUpload: string[];
  accumulatedText: string;
  localNativeText: { [key: number]: string };
  hasRichNativeText: boolean;
}

export async function processUploadedFiles(
  files: FileList | null,
  onProgress: (status: string) => void
): Promise<ProcessResult | null> {
  if (!files || files.length === 0) return null;

  onProgress('正在載入並解析卷宗檔案...');

  const imagesToUpload: string[] = [];
  let accumulatedText = '';
  const localNativeText: { [key: number]: string } = {};

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.type.startsWith('image/')) {
        onProgress(`正在讀取卷宗圖片 (${file.name})...`);
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        imagesToUpload.push(dataUrl);
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        onProgress(`正在解析 PDF 檔案 (${file.name})...`);
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const maxPages = Math.min(pdf.numPages, 20); // 最多處理 20 頁避免記憶體爆滿

          for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            onProgress(`正在提取 PDF 第 ${pageNum}/${maxPages} 頁...`);

            try {
              const page = await pdf.getPage(pageNum);

              // 1. 提取原生文字 (若有)
              let pageText = '';
              try {
                const textContent = await page.getTextContent();
                pageText = textContent.items.map((item: any) => item.str).join(' ');
              } catch (textErr) {
                console.warn(`第 ${pageNum} 頁文字提取失敗:`, textErr);
              }

              if (pageText && pageText.trim().length > 10) {
                localNativeText[imagesToUpload.length] = pageText;
                accumulatedText += `--- Page ${imagesToUpload.length + 1} ---\n${pageText}\n\n`;
              }

              // 2. 轉換為輕量化圖片供 OCR 使用
              const viewport = page.getViewport({ scale: 1.5 }); // 1.5x scale 足夠清晰且省記憶體
              const canvas = document.createElement('canvas');
              const context = canvas.getContext('2d');
              if (context) {
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await (page.render({
                  canvasContext: context,
                  viewport: viewport,
                  canvas: canvas
                } as any).promise);

                // 使用 0.75 品質 JPEG 壓縮，大幅降低 Base64 體積
                const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
                imagesToUpload.push(dataUrl);
              }
            } catch (pageErr) {
              console.error(`[PDF Parsing Error] 無法解析第 ${pageNum} 頁:`, pageErr);
              onProgress(`[提示] 第 ${pageNum} 頁解析異常，已自動跳過...`);
              continue;
            }
          }
        } catch (pdfErr) {
          console.error('PDF 解析整體失敗:', pdfErr);
          const text = await file.text();
          accumulatedText += text + '\n';
        }
      } else {
        // 純文字或 Markdown
        onProgress(`正在讀取文字檔案 (${file.name})...`);
        const text = await file.text();
        accumulatedText += text + '\n';
      }
    }

    const hasRichNativeText = accumulatedText.trim().length >= 200;
    return { imagesToUpload, accumulatedText, localNativeText, hasRichNativeText };
  } catch (err) {
    console.error('檔案處理過程發生未預期錯誤:', err);
    throw err;
  }
}
