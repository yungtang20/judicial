/**
 * AI 提煉內容的「來源支持度」檢查。
 *
 * 背景：把一段很薄、甚至無意義的原文交給模型提煉「案件事實故事與裁判結果」時，
 * 模型會補寫出**看似合理但原文並未載明**的內容。實測上傳 29 字元的無意義字串，
 * 產出了長篇的法庭言詞交鋒、證人證言、心證認定等描述。
 *
 * 對法律工具而言，使用者可能直接把這段內容當成案件事實陳述，是實質傷害。
 *
 * 本模組只做**提醒**，不阻擋：合理的摘要本來就會改寫用詞，
 * 硬性阻擋會誤傷正常流程。真正的防線是要求使用者逐句核對原文。
 */
/** 中文以字為單位、英文以詞為單位的詞元切分。 */
function tokenize(text: string): string[] {
  const source = text || '';
  // 英文詞必須在移除空白之前切出，否則整句會被合併成單一詞而無法比對。
  const latin = (source.match(/[A-Za-z0-9]+/g) || []).map(word => word.toLowerCase());
  const cjk = source.replace(/[\s　]/g, '').match(/[一-龥]/g) || [];
  return [...cjk, ...latin];
}

export interface GroundingAssessment {
  /** 0–1，輸出內容有多少比例的詞元能在原文找到依據。 */
  coverage: number;
  /** 是否低到足以警示使用者。 */
  likelyUngrounded: boolean;
  /** 面向使用者的說明；未觸發時為 null。 */
  warning: string | null;
}

const LOW_COVERAGE_THRESHOLD = 0.12;

export function assessGrounding(sourceText: string, generatedText: string): GroundingAssessment {
  const sourceTokens = new Set(tokenize(sourceText || ''));
  const generatedTokens = tokenize(generatedText || '');

  if (sourceTokens.size === 0 || generatedTokens.length === 0) {
    return {
      coverage: 0,
      likelyUngrounded: Boolean((generatedText || '').trim()),
      warning: (generatedText || '').trim()
        ? '無法比對提煉內容與原文的用詞依據，請務必逐句核對原始裁判書。'
        : null
    };
  }

  const supported = generatedTokens.filter(token => sourceTokens.has(token)).length;
  const coverage = supported / generatedTokens.length;

  if (coverage >= LOW_COVERAGE_THRESHOLD) {
    return { coverage, likelyUngrounded: false, warning: null };
  }

  return {
    coverage,
    likelyUngrounded: true,
    warning:
      '此提煉內容與原始裁判書的用詞重疊極低，可能包含原文未載明的內容。' +
      '請在引用或據以撰寫書狀前，逐句核對原始裁判書。'
  };
}
