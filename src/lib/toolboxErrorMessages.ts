/**
 * 工具箱產製失敗的使用者友善訊息對照。
 *
 * 背景：伺服端回傳的是英文內部訊息（例如
 * "Production toolbox fallback is disabled for DEMAND_LETTER_GENERAL; no unverified
 * substitute document may be returned."），前端直接顯示會讓使用者看到
 * 與自身無關的實作細節，也分不出「可以重試」與「必須補正資料」。
 */

export interface ToolboxErrorPresentation {
  /** 面向使用者的繁體中文說明。 */
  message: string;
  /** 使用者下一步該做什麼。 */
  guidance: string;
  /** true 表示屬於暫時性故障，按下產製即可再試一次。 */
  retryable: boolean;
}

const GENERIC: ToolboxErrorPresentation = {
  message: '文件產製未完成。',
  guidance: '請稍候再試；若持續失敗，請確認案情描述是否完整，或改用其他工具類型。',
  retryable: true
};

const BY_CODE: Record<string, ToolboxErrorPresentation> = {
  PRODUCTION_TOOLBOX_FALLBACK_BLOCKED: {
    message: '系統服務暫時無法完成產製。',
    guidance: '這是暫時性的服務問題，請直接再次點選產製；若持續失敗，請稍後再試。',
    retryable: true
  },
  DOCUMENT_VERIFICATION_FAILED: {
    message: '產製的文件含有無法確認的法律引用，為避免誤導已停止交付。',
    guidance: '請補充案情細節或調整引用內容後再次產製；系統不會交付引用未經確認的文件。',
    retryable: true
  },
  CANONICAL_PLEADING_INPUT_REQUIRED: {
    message: '書狀必要欄位尚未填寫完整。',
    guidance: '請依畫面列出的缺漏欄位（當事人、地址、訴之聲明、證據、法院、日期、簽章等）補齊後再次產製。',
    retryable: false
  },
  P9_FINAL_GATE_FAILED: {
    message: '此類書狀尚未開放產製。',
    guidance: '該類書狀的格式與合規結構尚未完成核准，因此無法產製。請改用其他可用的工具類型。',
    retryable: false
  },
  UNKNOWN_TOOLBOX_CATEGORY: {
    message: '不支援這個工具類別。',
    guidance: '請重新選擇左側的工具項目後再試。',
    retryable: false
  },
  TOOLBOX_CATEGORY_REQUIRED: {
    message: '請先選擇要產製的工具類別。',
    guidance: '請於左側點選工具後再按產製。',
    retryable: false
  },
  CITATION_FULLTEXT_REQUIRED: {
    message: '所引用的裁判尚未取得全文。',
    guidance: '請先開啟裁判全文並確認內容後再進行產製，系統不會引用未讀取的來源。',
    retryable: false
  },
  LEGAL_INPUT_REJECTED: {
    message: '輸入內容包含無法確認的法律條號。',
    guidance: '請確認條號是否正確，或移除無法確認的引用後再試。',
    retryable: false
  },
  RATE_LIMITED: {
    message: '請求過於頻繁，請稍候再試。',
    guidance: '請等待約一分鐘後再次產製。',
    retryable: true
  }
};

export function presentToolboxError(code: string | undefined, rawMessage?: string): ToolboxErrorPresentation {
  if (code && BY_CODE[code]) return BY_CODE[code];
  // 伺服端偶爾以英文原始訊息回應（非程式碼），此時不得直接顯示給使用者。
  if (rawMessage && /[A-Za-z]{4,}/.test(rawMessage) && !/[，。；]/.test(rawMessage)) {
    return GENERIC;
  }
  return {
    ...GENERIC,
    message: rawMessage?.trim() || GENERIC.message
  };
}
