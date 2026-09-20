const loadPdfJs = async () => {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined') {
    try {
      const g = (pdfjsLib as any)?.GlobalWorkerOptions;
      if (g && !g.workerSrc) {
        g.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;
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
