import type { ChangeEvent } from 'react';
import { scrubPersonalInfo } from '../lib/deidentifier';
import { parsePdfFile } from '../lib/pdfUtils';

type TextSetter = (value: string) => void;
type BooleanSetter = (value: boolean) => void;
type JudgmentTarget = 'first' | 'second';

export interface FetchJudicialUrlOptions {
  targetField: JudgmentTarget;
  firstUrl: string;
  secondUrl: string;
  setTargetJudicialField: (value: JudgmentTarget) => void;
  setIsFetchingUrl: BooleanSetter;
  setUrlFetchSuccessMsg: TextSetter;
  setRawText: TextSetter;
  setSecondText: TextSetter;
}

export async function fetchJudicialUrl({
  targetField,
  firstUrl,
  secondUrl,
  setTargetJudicialField,
  setIsFetchingUrl,
  setUrlFetchSuccessMsg,
  setRawText,
  setSecondText
}: FetchJudicialUrlOptions): Promise<void> {
  setTargetJudicialField(targetField);
  const targetUrl = targetField === 'first' ? firstUrl : secondUrl;
  if (!targetUrl) return;

  setIsFetchingUrl(true);
  setUrlFetchSuccessMsg('');
  try {
    const response = await fetch('/api/fetch-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl })
    });

    if (!response.ok) {
      let errStr = '無法讀取網址內容';
      try {
        const errData = await response.json();
        if (errData.error) errStr = errData.error;
      } catch {}
      throw new Error(errStr);
    }
    const data = await response.json();
    if (data.text) {
      if (targetField === 'first') {
        setRawText(data.text);
      } else {
        setSecondText(data.text);
      }
      if (data.title) {
        setUrlFetchSuccessMsg(`✅ 已自動透過判決書資料庫帶入【${data.title}】！`);
      }
    } else {
      throw new Error('未讀取到文字內容');
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '未知錯誤';
    alert(`網址讀取失敗：\n\n${errorMsg}\n\n您亦可使用上方【⚖️ 判決全文庫檢索】按鈕直接輸入案號調閱，或手動複製貼上裁判內文。`);
  } finally {
    setIsFetchingUrl(false);
  }
}

export interface ImportJudgmentFileOptions {
  event: ChangeEvent<HTMLInputElement>;
  targetField: JudgmentTarget;
  setIsParsingPdf: BooleanSetter;
  setRawText: TextSetter;
  setSecondText: TextSetter;
}

export async function importJudgmentFile({
  event,
  targetField,
  setIsParsingPdf,
  setRawText,
  setSecondText
}: ImportJudgmentFileOptions): Promise<void> {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.type === 'application/pdf') {
    setIsParsingPdf(true);
    try {
      const { text, images } = await parsePdfFile(file);
      let fullText = text;

      if (fullText.trim().length < 100 && images.length > 0) {
        try {
          const ocrRes = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images })
          });
          if (ocrRes.ok) {
            const ocrData = await ocrRes.json();
            if (ocrData.text) fullText = ocrData.text;
          } else {
            const errData = await ocrRes.json().catch(() => ({}));
            alert(errData.error || 'OCR 辨識失敗，請檢查 API Key 設定。');
          }
        } catch (ocrErr) {
          console.warn('OCR fetch failed:', ocrErr instanceof Error ? ocrErr.message : ocrErr);
        }
      }

      if (targetField === 'second') {
        setSecondText(fullText);
      } else {
        setRawText(fullText);
      }
    } catch (err) {
      console.warn('PDF Parse Error:', err instanceof Error ? err.message : err);
      alert('PDF 解析失敗，請直接複製貼上判決內文。');
    } finally {
      setIsParsingPdf(false);
    }
  } else {
    const text = await file.text();
    if (targetField === 'second') {
      setSecondText(text);
    } else {
      setRawText(text);
    }
  }
}

export interface DeidentifyJudgmentsOptions {
  rawText: string;
  secondText: string;
  setRawText: TextSetter;
  setSecondText: TextSetter;
}

export function deidentifyJudgments({
  rawText,
  secondText,
  setRawText,
  setSecondText
}: DeidentifyJudgmentsOptions): void {
  let modified = false;
  if (rawText) {
    setRawText(scrubPersonalInfo(rawText));
    modified = true;
  }
  if (secondText) {
    setSecondText(scrubPersonalInfo(secondText));
    modified = true;
  }
  if (modified) {
    alert('✅ 已執行基本去識別化（身分證字號、電話、部分地址與當事人稱謂前方）。\n⚠️ 注意：人工閱讀時請再次確認是否還有遺漏個資。');
  }
}

export interface AppealDeadlineOptions {
  deliveryDate: string;
  travelDays: string | number;
  caseType: string;
  currentDate?: Date;
}

export interface AppealDeadlineInfo {
  declarationDeadline: string;
  reasoningDeadline: string;
  daysLeft: number;
}

export function calculateAppealDeadline({
  deliveryDate,
  travelDays,
  caseType,
  currentDate = new Date()
}: AppealDeadlineOptions): AppealDeadlineInfo {
  if (!deliveryDate) {
    return { declarationDeadline: '未知', reasoningDeadline: '未知', daysLeft: 0 };
  }
  const date = new Date(deliveryDate);
  if (Number.isNaN(date.getTime())) {
    return { declarationDeadline: '無效日期', reasoningDeadline: '無效日期', daysLeft: 0 };
  }

  const declarationDate = new Date(date);
  declarationDate.setDate(declarationDate.getDate() + 20 + Number(travelDays));
  if (declarationDate.getDay() === 6) declarationDate.setDate(declarationDate.getDate() + 2);
  if (declarationDate.getDay() === 0) declarationDate.setDate(declarationDate.getDate() + 1);

  const reasoningDate = new Date(date);
  reasoningDate.setDate(reasoningDate.getDate() + (caseType === 'criminal' ? 40 : 20) + Number(travelDays));
  if (reasoningDate.getDay() === 6) reasoningDate.setDate(reasoningDate.getDate() + 2);
  if (reasoningDate.getDay() === 0) reasoningDate.setDate(reasoningDate.getDate() + 1);

  const diffTime = declarationDate.getTime() - currentDate.getTime();
  return {
    declarationDeadline: declarationDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }),
    reasoningDeadline: reasoningDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }),
    daysLeft: Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  };
}
