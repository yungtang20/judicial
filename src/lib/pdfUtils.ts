// pdf.js 的 worker 必須自架（Vite 會一併打包並以同源網址提供）。
// 過去指向 https://cdn.jsdelivr.net，但正式環境的 CSP 為
// worker-src 'self' blob; connect-src 不含該網域，導致 PDF 解析在正式站完全失效，
// 使用者只會看到「無法讀取文件；掃描版 PDF 請先完成 OCR」這種誤導性訊息。
// 自架同時避免把法律文件的使用行為送到第三方 CDN。
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

// 例外：pdfjs-dist 為延遲載入。靜態匯入會讓約 1MB 的 PDF 解析庫進入首屏 bundle，
// 與 buildOutput 觀測到的首屏 320KB 目標直接衝突，因此這裡必須保留動態載入。
const loadPdfJs = async () => {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined') {
    try {
      const g = (pdfjsLib as any)?.GlobalWorkerOptions;
      if (g && !g.workerSrc) {
        g.workerSrc = pdfWorkerUrl;
      }
    } catch {
      // ignore
    }
  }
  return pdfjsLib;
};

export const extractPdfText = async (file: File): Promise<string> => {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
};

export const parsePdfFile = async (file: File): Promise<{ text: string; images: string[] }> => {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  const imagesToUpload: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';

    try {
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport } as any).promise;
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        imagesToUpload.push(imageDataUrl);
      }
    } catch (canvasErr) {
      console.warn(`Page ${i} canvas render failed:`, canvasErr);
    }
  }

  return { text: fullText, images: imagesToUpload };
};
