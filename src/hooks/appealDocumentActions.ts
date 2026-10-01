import type { ChangeEvent } from 'react';
import { scrubPersonalInfo } from '../lib/deidentifier';
import { fetchWithAuth } from '../lib/apiClient';
import { parsePdfFile } from '../lib/pdfUtils';
import { notify, notifyError } from '../lib/userNotice';
import { calculateDeadline } from '../lib/deadlineCalculator';

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
  isCurrent?: () => boolean;
}

export async function fetchJudicialUrl({
  targetField,
  firstUrl,
  secondUrl,
  setTargetJudicialField,
  setIsFetchingUrl,
  setUrlFetchSuccessMsg,
  setRawText,
  setSecondText,
  isCurrent
}: FetchJudicialUrlOptions): Promise<void> {
  setTargetJudicialField(targetField);
  const targetUrl = targetField === 'first' ? firstUrl : secondUrl;
  if (!targetUrl) return;

  setIsFetchingUrl(true);
  setUrlFetchSuccessMsg('');
  try {
    const response = await fetchWithAuth('/api/fetch-url', {
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
    if (isCurrent && !isCurrent()) return;
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
    if (!isCurrent || isCurrent()) {
      const errorMsg = err instanceof Error ? err.message : '未知錯誤';
      notifyError(`網址讀取失敗：\n\n${errorMsg}\n\n您亦可使用上方【⚖️ 判決全文庫檢索】按鈕直接輸入案號調閱，或手動複製貼上裁判內文。`);
    }
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
  isCurrent?: () => boolean;
}

export async function importJudgmentFile({
  event,
  targetField,
  setIsParsingPdf,
  setRawText,
  setSecondText,
  isCurrent
}: ImportJudgmentFileOptions): Promise<void> {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.type === 'application/pdf') {
    setIsParsingPdf(true);
    try {
      const { text, images } = await parsePdfFile(file);
      if (isCurrent && !isCurrent()) return;
      let fullText = text;

      if (fullText.trim().length < 100 && images.length > 0) {
        try {
          const ocrRes = await fetchWithAuth('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images })
          });
          if (ocrRes.ok) {
            const ocrData = await ocrRes.json();
            if (ocrData.text) fullText = ocrData.text;
          } else {
            const errData = await ocrRes.json().catch(() => ({}));
            notifyError(errData.error || 'OCR 辨識失敗，請檢查 API Key 設定。');
          }
        } catch (ocrErr) {
          console.warn('OCR fetch failed:', ocrErr instanceof Error ? ocrErr.message : ocrErr);
        }
      }
      if (isCurrent && !isCurrent()) return;

      if (targetField === 'second') {
        setSecondText(fullText);
      } else {
        setRawText(fullText);
      }
    } catch (err) {
      console.warn('PDF Parse Error:', err instanceof Error ? err.message : err);
      notifyError('PDF 解析失敗，請直接複製貼上判決內文。');
    } finally {
      setIsParsingPdf(false);
    }
  } else {
    const text = await file.text();
    if (isCurrent && !isCurrent()) return;
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
    notify('已執行基本去識別化（身分證字號、電話、部分地址與當事人稱謂前方）。\n⚠️ 注意：人工閱讀時請再次確認是否還有遺漏個資。');
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
  /**
   * 期限末日是否落在國定假日表維護範圍之外。
   * 超出時順延判斷不足以依賴，介面必須提示使用者另行向法院確認。
   */
  declarationBeyondCoverage: boolean;
  reasoningBeyondCoverage: boolean;
}

export function calculateAppealDeadline({
  deliveryDate,
  travelDays,
  caseType,
  currentDate = new Date()
}: AppealDeadlineOptions): AppealDeadlineInfo {
  if (!deliveryDate) {
    return { declarationDeadline: '未知', reasoningDeadline: '未知', daysLeft: 0, declarationBeyondCoverage: false, reasoningBeyondCoverage: false };
  }
  const date = new Date(deliveryDate);
  if (Number.isNaN(date.getTime())) {
    return { declarationDeadline: '無效日期', reasoningDeadline: '無效日期', daysLeft: 0, declarationBeyondCoverage: false, reasoningBeyondCoverage: false };
  }

  // 期限計算必須以假日表為單一來源。
  //
  // 先前這裡自己寫了一份，只處理 getDay() === 6 與 0（週六、週日），
  // 完全不查國定假日。專案另有一份會查表的
  // src/lib/deadlineCalculator.ts（AppealDeadlineTool 用的就是那份），
  // 兩套並存等於同一個法律計算有兩個答案。
  //
  // 實測後果：2026-10-25 送達、20 日不變期間，原始末日落在 2026-11-15，
  // 但真正決定期限的是該日之後的國定假日順延；舊邏輯不看表，
  // 就會把假日當成可遞狀日，使用者依畫面上的紅字期限遞狀而逾期。
  // 另外舊邏輯也沒有涵蓋範圍警告，超出假日表維護範圍時同樣不會提示。
  const travel = Number(travelDays) || 0;
  const declaration = calculateDeadline(date, 20, travel);
  const reasoning = calculateDeadline(date, caseType === 'criminal' ? 40 : 20, travel);

  const diffTime = declaration.date.getTime() - currentDate.getTime();
  return {
    declarationDeadline: declaration.date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }),
    reasoningDeadline: reasoning.date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' }),
    daysLeft: Math.ceil(diffTime / (1000 * 60 * 60 * 24)),
    // 超過假日表涵蓋範圍時必須讓介面知道，否則使用者會把不確定的日期當定論。
    declarationBeyondCoverage: declaration.beyondHolidayCoverage,
    reasoningBeyondCoverage: reasoning.beyondHolidayCoverage
  };
}
