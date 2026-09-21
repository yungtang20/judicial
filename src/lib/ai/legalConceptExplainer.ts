export function explainLegalConcept(concept: string, status: string): string {
  return `${concept}目前的判斷狀態是「${status}」。這表示需要依具體事實與證據逐項確認，不代表法院已作成最終認定。`;
}
