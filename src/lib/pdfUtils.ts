import * as pdfjsLib from 'pdfjs-dist';

export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

export async function parsePdfFile(file: File): Promise<{ text: string; images: string[] }> {
  const text = await extractPdfText(file);
  return { text, images: [] };
}
