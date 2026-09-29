import { useEffect } from 'react';

/**
 * 輸入尚未送出時，在離開頁面前提示使用者。
 *
 * 實測缺陷：首頁的案情描述輸入框內容不會自動保存，
 * 重新整理頁面後 151 字的輸入直接消失，且沒有任何提示。
 * 使用者填寫案情往往需要數分鐘，誤觸重新整理或誤關分頁
 * 就會白費——法律工具的輸入成本高，這是實際的損失。
 *
 * 刻意不做自動保存：應用已提供「儲存目前內容」與「案件備份」，
 * 自動寫入會在使用者未預期時產生內容。這個 hook 只加一道提示，
 * 不改變既有的儲存模型。
 *
 * 觸發時機：使用者已輸入內容、尚未送出分析、且已離開分析流程。
 * 已完成分析或已清空輸入時不提示，避免造成騷擾。
 */
export function useUnsavedInputWarning(
  inputNarrative: string,
  已送出分析: boolean
): void {
  useEffect(() => {
    const 有未送出內容 = inputNarrative.trim().length > 0 && !已送出分析;
    if (!有未送出內容) return;

    const 提示 = (event: BeforeUnloadEvent) => {
      // 現代瀏覽器需要 preventDefault 與 returnValue 才會顯示確認框。
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', 提示);
    return () => window.removeEventListener('beforeunload', 提示);
  }, [inputNarrative, 已送出分析]);
}
