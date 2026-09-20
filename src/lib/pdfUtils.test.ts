import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDocument } from 'pdfjs-dist';
import { extractPdfText, parsePdfFile } from './pdfUtils';

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '' }
}));

describe('pdfUtils', () => {
  beforeEach(() => {
    vi.mocked(getDocument).mockReset();
  });

  describe('extractPdfText', () => {
    it('extracts pure text from all pages', async () => {
      const page1 = {
        getTextContent: vi.fn().mockResolvedValue({ items: [{ str: '臺灣臺北地方法院' }, { str: '113年度訴字第1號民事判決' }] })
      };
      const page2 = {
        getTextContent: vi.fn().mockResolvedValue({ items: [{ str: '主文：原告之訴駁回。' }] })
      };
      vi.mocked(getDocument).mockReturnValue({
        promise: Promise.resolve({
          numPages: 2,
          getPage: vi.fn().mockImplementation((num: number) => Promise.resolve(num === 1 ? page1 : page2))
        })
      } as any);

      const text = await extractPdfText(new File(['dummy'], 'judgment.pdf', { type: 'application/pdf' }));
      expect(text).toContain('臺灣臺北地方法院 113年度訴字第1號民事判決');
      expect(text).toContain('主文：原告之訴駁回。');
    });
  });

  describe('parsePdfFile', () => {
  beforeEach(() => {
    vi.mocked(getDocument).mockReset();
  });

  it('extracts text and rendered page images', async () => {
    const canvas = {
      getContext: vi.fn(() => ({}) as CanvasRenderingContext2D),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,page-1')
    } as unknown as HTMLCanvasElement;
    vi.spyOn(document, 'createElement').mockReturnValue(canvas);

    const page = {
      getTextContent: vi.fn().mockResolvedValue({ items: [{ str: '第一頁' }, { str: '內容' }] }),
      getViewport: vi.fn(() => ({ width: 100, height: 200 })),
      render: vi.fn(() => ({ promise: Promise.resolve() }))
    };
    vi.mocked(getDocument).mockReturnValue({
      promise: Promise.resolve({ numPages: 1, getPage: vi.fn().mockResolvedValue(page) })
    } as any);

    const result = await parsePdfFile(new File(['pdf'], 'sample.pdf', { type: 'application/pdf' }));

    expect(result).toEqual({ text: '第一頁 內容\n', images: ['data:image/jpeg;base64,page-1'] });
    expect(page.render).toHaveBeenCalledOnce();
  });

  it('keeps extracted text when canvas rendering fails', async () => {
    vi.spyOn(document, 'createElement').mockReturnValue({
      getContext: vi.fn(() => null)
    } as unknown as HTMLCanvasElement);
    const page = {
      getTextContent: vi.fn().mockResolvedValue({ items: [{ str: '純文字' }] }),
      getViewport: vi.fn()
    };
    vi.mocked(getDocument).mockReturnValue({
      promise: Promise.resolve({ numPages: 1, getPage: vi.fn().mockResolvedValue(page) })
    } as any);

    await expect(parsePdfFile(new File(['pdf'], 'sample.pdf'))).resolves.toEqual({
      text: '純文字\n',
      images: []
    });
  });
});
});
