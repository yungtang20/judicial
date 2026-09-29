import { useCallback, useEffect, useRef } from 'react';

/**
 * 案情描述的草稿保留。
 *
 * 實測缺陷：使用者輸入 151 字後切換到其他功能再返回，
 * 輸入框內容變成 0 字，必須重新打字。重新整理頁面亦同。
 *
 * 為什麼做自動保存：
 * 應用已另有「儲存目前內容」與「案件備份」兩個明示的儲存動作，
 * 但那是指把案件存成可重用的自訂案例。
 * 「使用者打的字在切換頁面後消失」不符合任何合理預期——
 * 這是草稿保留，不是替使用者建立新內容。
 *
 * 與分析結果的差別：分析結果在完成後會進入歷史記錄，
 * 不需要靠草稿保留；輸入框在分析完成後應清空，
 * 避免舊案情被誤當成新案件再次送出。
 *
 * 只存案情描述本身，不含任何法律分析內容；
 * 內容不會離開使用者的瀏覽器。
 */

const 草稿鍵 = 'judicial_input_draft_v1';

/** 延遲寫入，避免每個按鍵都動到 localStorage。 */
const 寫入延遲毫秒 = 400;

export function useInputDraft(
  inputNarrative: string,
  setInputNarrative: (value: string) => void,
  分析已完成: boolean
): void {
  const 計時器 = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 掛載時記錄初值，避免把「空」寫回去蓋掉既有草稿。
  const 初次載入 = useRef(true);

  // 恢復草稿：僅在輸入框為空時，避免覆蓋使用者正在輸入的內容。
  useEffect(() => {
    if (初次載入.current) {
      初次載入.current = false;
      if (!inputNarrative.trim()) {
        try {
          const 草稿 = window.localStorage.getItem(草稿鍵);
          if (草稿 && 草稿.trim()) setInputNarrative(草稿);
        } catch {
          // localStorage 不可用（無痕模式、權限限制）時靜默略過，
          // 不能因為無法保存草稿就讓整個輸入框不可用。
        }
      }
    }
  }, [inputNarrative, setInputNarrative]);

  // 寫入草稿。
  useEffect(() => {
    // 分析完成後清掉草稿：案件已進入歷史記錄，
    // 留著只會讓使用者誤以為舊案情還沒送出。
    if (分析已完成) {
      try {
        window.localStorage.removeItem(草稿鍵);
      } catch {
        // 同上，無法操作儲存時不影響功能。
      }
      return;
    }

    clearTimeout(計時器.current);
    計時器.current = setTimeout(() => {
      try {
        if (inputNarrative.trim()) {
          window.localStorage.setItem(草稿鍵, inputNarrative);
        } else {
          window.localStorage.removeItem(草稿鍵);
        }
      } catch {
        // 儲存失敗不影響主要功能。
      }
    }, 寫入延遲毫秒);

    return () => {
      clearTimeout(計時器.current);
    };
  }, [inputNarrative, 分析已完成]);
}

/** 供測試使用：清除草稿。 */
export function clearInputDraft(): void {
  try {
    window.localStorage.removeItem(草稿鍵);
  } catch {
    // 忽略
  }
}

/** 供測試使用：草稿的儲存鍵。 */
export const INPUT_DRAFT_KEY = 草稿鍵;
