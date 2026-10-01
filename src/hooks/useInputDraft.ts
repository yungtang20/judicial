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

/** 延遲寫入，避免每個按鍵都動到儲存區。 */
const 寫入延遲毫秒 = 400;

/**
 * 讀取草稿，優先使用分頁隔離的 sessionStorage。
 *
 * 實測缺陷：草稿原本存在 localStorage，而 localStorage 是所有分頁共用的。
 * 開第二個分頁會直接載入第一個分頁的案子草稿；
 * 在分頁 B 輸入另一個案子後，分頁 A 重新整理會還原成案子 B 的內容，
 * 案子 A 的草稿就永久遺失。對要同時比對多個案子的使用者是實際的資料損失。
 *
 * 案件卷宗（useCaseStore）本來就用 sessionStorage 並註明了理由：
 * 足以跨重新整理保留工作階段，又不會在磁碟上長期留放明文個資。
 * 草稿改用同一種儲存，行為才一致。
 *
 * localStorage 的舊草稿仍會被讀取一次，讓既有使用者的草稿不會因為
 * 這次變更而消失；之後的寫入一律進 sessionStorage。
 */
function 讀取草稿(): string | null {
  try {
    const 本分頁 = window.sessionStorage.getItem(草稿鍵);
    if (本分頁 !== null) return 本分頁;
  } catch {
    // 無痕模式或權限限制時往下走
  }
  try {
    return window.localStorage.getItem(草稿鍵);
  } catch {
    return null;
  }
}

export function useInputDraft(
  inputNarrative: string,
  setInputNarrative: (value: string) => void,
  分析已完成: boolean
): void {
  const 計時器 = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 正在從草稿還原，用來避免寫入效果以掛載時的空值覆蓋草稿。 */
  const 還原中 = useRef(false);

  // 恢復草稿。
  //
  // 實測：只在「首次掛載」恢復不夠——切換功能頁面後攔截 localStorage.getItem
  // 確認根本沒有讀取，151 字的草稿留在儲存裡而輸入框是空的。
  //
  // 改為「輸入框為空且草稿存在就恢復」。不會造成誤恢復：
  // 使用者主動清空輸入時，下方的寫入效果會把草稿一併移除，
  // 沒有草稿就不會恢復。
  useEffect(() => {
    if (分析已完成) return;
    if (inputNarrative.trim()) return;
    try {
      const 草稿 = 讀取草稿();
      if (草稿 && 草稿.trim()) {
        還原中.current = true;
        setInputNarrative(草稿);
      }
    } catch {
      // 儲存區不可用（無痕模式、權限限制）時靜默略過，
      // 不能因為無法保存草稿就讓整個輸入框不可用。
    }
  }, [inputNarrative, 分析已完成, setInputNarrative]);

  // 寫入草稿。
  useEffect(() => {
    // 分析完成後清掉草稿：案件已進入歷史記錄，
    // 留著只會讓使用者誤以為舊案情還沒送出。
    if (分析已完成) {
      try {
        window.sessionStorage.removeItem(草稿鍵);
      } catch {
        // 同上，無法操作儲存時不影響功能。
      }
      try {
        // 舊版草稿存在 localStorage。若只清本分頁，新開的分頁會透過
        // 讀取草稿() 的回退路徑又把這份舊案情撈回來，
        // 使用者會在新的案子裡看到上一個案子的內容。
        window.localStorage.removeItem(草稿鍵);
      } catch {
        // 儲存區不可用時不影響功能
      }
      return;
    }

    clearTimeout(計時器.current);
    計時器.current = setTimeout(() => {
      還原中.current = false;
      try {
        if (inputNarrative.trim()) {
          window.sessionStorage.setItem(草稿鍵, inputNarrative);
        } else {
          window.sessionStorage.removeItem(草稿鍵);
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
