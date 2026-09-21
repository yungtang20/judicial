export interface TriageQuestion {
  question: string;
  reason: string;
  options: string[];
}

export function buildTriageQuestions(missingElements: string[]): TriageQuestion[] {
  return missingElements.slice(0, 3).map(element => ({
    question: `請補充「${element}」的具體情況？`,
    reason: '此資訊會影響適用法源、適格主體或程序路徑。',
    options: ['有明確資料', '只有口頭記憶', '目前不確定']
  }));
}
