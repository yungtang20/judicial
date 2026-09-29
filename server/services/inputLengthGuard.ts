/**
 * 使用者輸入的長度界限。
 *
 * 實測缺陷：送出 170,061 字的案情描述，系統回 HTTP 200 並給出分析，
 * 但 AI 實際只看到開頭——結尾的「訴之聲明：一百萬元」完全消失，
 * 且沒有任何警告。使用者會以為整份案情都被分析。
 *
 * 對法律工具而言這是實質正確性問題：訴之聲明、證據清單、
 * 關鍵事實通常寫在長文件的後段，靜默丟棄等同給出錯誤建議。
 *
 * 兩種輸入性質不同，因此界限也不同：
 * - 敘述型（案情描述、諮詢問題）：使用者的口語陳述，
 *   實際上很少超過幾千字。給寬鬆的 20,000 字仍遠高於正常使用。
 * - 文書型（判決書全文）：真實判決書動輒數萬字，
 *   不可用同一個低界限，否則會擋掉正常的使用情境。
 *
 * 超過界限時明確拒絕並說明，讓使用者知道要分段或摘要，
 * 而不是拿到一份只分析了前段內容的結果。
 */

/** 敘述型輸入的字元上限。遠高於正常口語陳述（數百至數千字）。 */
export const NARRATIVE_MAX_CHARS = 20_000;

/** 文書型輸入的字元上限。真實判決書可能達數萬字。 */
export const DOCUMENT_MAX_CHARS = 200_000;

export type InputKind = 'narrative' | 'document';

export interface 界限檢查結果 {
  通過: boolean;
  /** 使用者看得懂的說明；通過時為空字串。 */
  訊息?: string;
  /** 實際字數，供錯誤訊息顯示。 */
  字數: number;
}

export function 檢查輸入長度(input: unknown, kind: InputKind = 'narrative'): 界限檢查結果 {
  const 字數 = typeof input === 'string' ? input.length : 0;
  const 上限 = kind === 'document' ? DOCUMENT_MAX_CHARS : NARRATIVE_MAX_CHARS;

  if (字數 <= 上限) return { 通過: true, 字數 };

  return {
    通過: false,
    字數,
    訊息: kind === 'document'
      ? `文件過長（${字數.toLocaleString()} 字，上限 ${上限.toLocaleString()} 字）。`
        + '請貼上與本次分析相關的段落，或先刪除與爭點無關的部分。'
        + '系統不會自動截斷——只分析前段內容會遺漏後段的訴求與證據。'
      : `案情描述過長（${字數.toLocaleString()} 字，上限 ${上限.toLocaleString()} 字）。`
        + '請濃縮成關鍵事實，或分段提出。'
        + '系統不會自動截斷——只分析前段內容可能遺漏後段的重要事實。'
  };
}
