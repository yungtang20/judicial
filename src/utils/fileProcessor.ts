import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.mjs`;
  } catch (err) {
    console.warn('pdfjs setup warning:', err);
  }
}

export interface ProcessResult {
  accumulatedText: string;
  hasRichNativeText: boolean;
}

export async function processUploadedFiles(
  files: FileList | null,
  onProgress: (status: string) => void
): Promise<ProcessResult | null> {
  if (!files || files.length === 0) return null;

  onProgress('正在載入並解析卷宗檔案...');

  let accumulatedText = '';

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
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
                accumulatedText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
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
    return { accumulatedText, hasRichNativeText };
  } catch (err) {
    console.error('檔案處理過程發生未預期錯誤:', err);
    throw err;
  }
}
