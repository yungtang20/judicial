/**
 * 模型生成法律分析的 fail-closed 一致性攔截器。
 *
 * 背景：`src/lib/universalTriage.ts` 的 `enforceTriageConsistency` 已經能將
 * 告訴權屬性、時效與法條清單校正為正確值（例如刑法第225條一律為非告訴乃論公訴罪）。
 * 但那套校正只作用於結構化欄位，**完全沒有觸及模型自由生成的長文分析**。
 * 實測結果因此出現同一頁面自相矛盾：時效區塊寫「非告訴乃論（公訴重罪）」，
 * 完整分析卻寫「此罪為純犯，且屬於準親告罪（需原告提起告訴）」。
 *
 * 本模組以本機規則為權威，對模型輸出做後置檢查；一旦偵測到矛盾就擋下該段分析，
 * 不讓錯誤陳述進入使用者畫面，符合專案 AGENTS.md 的 fail-closed 硬性規則。
 */

export type ConsistencyViolationCode =
  | 'TELL_NATURE_CONTRADICTION'
  | 'OFFENSE_PARAGRAPH_MISLABEL'
  | 'IMPOSSIBILITY_MISLABEL'
  | 'OBSOLETE_OFFENSE_NAME';

export interface ConsistencyViolation {
  code: ConsistencyViolationCode;
  /** 面向使用者的繁體中文說明。 */
  message: string;
  /** 觸發判定的原文片段，便於稽核。 */
  evidence: string;
  /** 本機規則的權威依據。 */
  authority: string;
}


export interface TriageAuthorityFacts {
  /** 由本機規則判定該案是否為公訴罪。 */
  isPublicProsecution?: boolean;
  /**
   * 呼叫端已確認屬妨害性自主／家暴案件。
   * 矛盾句本身常不帶條號或性自主字樣（例：「此罪屬於準親告罪」），
   * 必須由擁有完整分類結果的呼叫端提供此旗標，否則會整段漏判。
   */
  isSexualAutonomyCase?: boolean;
}

/**
 * 項別與罪名的對應表。
 * 刑法第225條的官方條號罪名是「乘機性交猥褻罪」並同時涵蓋第1項（性交）與第2項（猥褻），
 * 因此不能用「罪名是否完全相符」判斷，必須檢查**項別內容**是否被標錯。
 */
const PARAGRAPH_CONTENT: Array<{ article: number; paragraph: number; isObscene: boolean; content: string }> = [
  { article: 221, paragraph: 1, isObscene: false, content: '性交' },
  { article: 221, paragraph: 2, isObscene: false, content: '性交' },
  { article: 225, paragraph: 1, isObscene: false, content: '性交' },
  { article: 225, paragraph: 2, isObscene: true, content: '猥褻' },
  { article: 224, paragraph: 1, isObscene: true, content: '猥褻' },
  { article: 224, paragraph: 2, isObscene: true, content: '猥褻' }
];

/** 只有落在妨害性自主脈絡下的矛盾才會被視為阻斷級，避免誤判一般民事案件。 */
const SEXUAL_CONTEXT = /第\s?(?:221|224|225)\s?條|乘機性交|強制性交|乘機猥褻|強制猥褻|妨害性自主/;

function splitSentences(text: string): string[] {
  return text
    .split(/[。\n；;]/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

/** 移除明確的否定表述，避免把「非告訴乃論」「不受6個月限制」誤判為矛盾。 */
function stripNegations(sentence: string): string {
  return sentence
    .replace(/非告訴乃論/g, '')
    .replace(/不受[^。；\n]{0,20}6\s*個月[^。；\n]{0,20}限制/g, '')
    .replace(/(不適用|無|沒有|不)[^。；\n]{0,16}告訴乃論/g, '');
}

function detectTellNatureContradiction(sentence: string, publicProsecution: boolean): ConsistencyViolation | null {
  if (!publicProsecution) return null;
  const normalized = stripNegations(sentence);
  if (!normalized) return null;

  const patterns: Array<{ pattern: RegExp; message: string }> = [
    {
      pattern: /準親告/,
      message: '本機規則判定本案為非告訴乃論公訴罪，但模型將其描述為準親告罪。'
    },
    {
      pattern: /屬於[^。；\n]{0,8}告訴乃論|屬[^。；\n]{0,6}告訴乃論/,
      message: '本機規則判定本案為非告訴乃論公訴罪，但模型將其描述為告訴乃論。'
    },
    {
      pattern: /(須|需|必須|要|應)[^。；\n]{0,10}(提起|提出)[^。；\n]{0,6}刑事告訴/,
      message: '本機規則判定本案為非告訴乃論公訴罪，無須主動提起告訴，但模型要求提起告訴。'
    },
    {
      pattern: /(六|6)\s*個月[^。；\n]{0,12}(內|之內)[^。；\n]{0,12}(提出|提起)[^。；\n]{0,6}告訴/,
      message: '本機規則判定本案為公訴罪，無六個月告訴期限，但模型仍要求於六個月內提告。'
    }
  ];

  for (const { pattern, message } of patterns) {
    const matched = normalized.match(pattern);
    if (matched) {
      return {
        code: 'TELL_NATURE_CONTRADICTION',
        message,
        evidence: sentence,
        authority: 'universalTriage.enforceTriageConsistency 規則 1：刑法第225條不在刑法第229條之1告訴乃論列舉範圍內，屬非告訴乃論公訴罪。'
      };
    }
  }
  return null;
}

function detectOffenseParagraphMislabel(sentence: string): ConsistencyViolation | null {
  const pattern = /第\s?(\d{2,3})\s?條第\s?(\d)\s?項[（(]([^）)]{2,24})[）)]/g;
  let match = pattern.exec(sentence);
  while (match) {
    const article = Number(match[1]);
    const paragraph = Number(match[2]);
    const label = match[3];
    const known = PARAGRAPH_CONTENT.find(item => item.article === article && item.paragraph === paragraph);
    if (known) {
      const labelIsObscene = label.includes('猥褻');
      if (known.isObscene && !labelIsObscene) {
        return {
          code: 'OFFENSE_PARAGRAPH_MISLABEL',
          message: `刑法第${article}條第${paragraph}項規範的是「${known.content}」，模型卻標示為「${label}」。`,
          evidence: sentence,
          authority: `刑法第${article}條第${paragraph}項條文內容為「${known.content}」。`
        };
      }
      if (!known.isObscene && labelIsObscene) {
        return {
          code: 'OFFENSE_PARAGRAPH_MISLABEL',
          message: `刑法第${article}條第${paragraph}項規範的是「${known.content}」，模型卻以「猥褻」罪名標示，法定刑將被誤導。`,
          evidence: sentence,
          authority: `刑法第${article}條第${paragraph}項為「${known.content}」且處三年以上十年以下有期徒刑。`
        };
      }
    }
    match = pattern.exec(sentence);
  }
  return null;
}

function detectImpossibilityMislabel(sentence: string): ConsistencyViolation | null {
  if (!/(第\s?225\s?條|乘機性交)/.test(sentence)) return null;
  if (!sentence.includes('純犯')) return null;
  return {
    code: 'IMPOSSIBILITY_MISLABEL',
    message: '刑法第225條第1項為「利用他人不能或不知抗拒」之不能犯，模型卻描述為純犯。',
    evidence: sentence,
    authority: '刑法第225條第1項構成要件為「不能或不知抗拒」，屬不能犯，故意與過失皆罰。'
  };
}

/**
 * 已廢止的舊罪名。2019 年修法後，刑法第221條的罪名為「強制性交罪」，
 * 「強姦罪」已不再是現行條號罪名；沿用舊稱會讓當事人誤以為法律已過時。
 */
const OBSOLETE_OFFENSE_NAMES: ReadonlyArray<readonly [RegExp, string]> = [
  [/強姦(罪|未遂|未遂犯)?/, '強制性交罪（刑法第221條）'],
  [/和姦罪/, '強制性交罪（刑法第221條）'],
  [/強制猥褻罪第\d+項第\d+項/, '強制猥褻罪（刑法第224條）']
];

function detectObsoleteOffenseName(sentence: string): ConsistencyViolation | null {
  for (const [pattern, current] of OBSOLETE_OFFENSE_NAMES) {
    if (!pattern.test(sentence)) continue;
    // 句中若已使用現行罪名（僅以舊稱作沿革說明），不視為違規。
    if (sentence.includes(current.slice(0, 4))) continue;
    return {
      code: 'OBSOLETE_OFFENSE_NAME',
      message: `模型使用已廢止的舊罪名，現行條號罪名應為「${current}」。`,
      evidence: sentence,
      authority: '刑法第221條自民國108年修法後罪名為「強制性交罪」，「強姦罪」已非現行條號罪名。'
    };
  }
  return null;
}

/**
 * 把已廢止的舊罪名改寫為現行條號罪名。
 *
 * 與 `detectAnalysisContradictions` 的差別：追問文字是「向使用者提問的引導」，
 * 不是交給當事人採信的法律論述，阻擋整句會中斷流程。
 * 因此這裡採確定性改寫，確保舊稱不會出現在任何使用者可見的畫面上。
 */
export function normalizeObsoleteOffenseNames(text: string): string {
  if (!text) return text;
  return text
    .replace(/和姦罪/g, '強制性交罪')
    .replace(/強姦未遂犯/g, '強制性交罪未遂犯')
    .replace(/強姦未遂/g, '強制性交未遂')
    .replace(/強姦罪/g, '強制性交罪')
    .replace(/構成強姦/g, '構成強制性交')
    .replace(/是否構成強姦/g, '是否構成強制性交')
    .replace(/(?<!強制性交)強姦(?!罪|未遂)/g, '強制性交');
}

/**
 * 對分流載荷中所有使用者可見的字串欄位套用舊罪名改寫。
 * LLM 分流結果可能出現在 `identifiedIssue`、`plainExplanation`、`legalBasis` 等欄位，
 * 逐一手工處理容易漏掉，因此統一在此掃描。
 */
export function normalizeObsoleteOffenseNamesInPayload<T>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload;
  const source = payload as Record<string, unknown>;
  const next: Record<string, unknown> = { ...source };
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string') {
      next[key] = normalizeObsoleteOffenseNames(value);
    } else if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
      next[key] = value.map(item => normalizeObsoleteOffenseNames(item));
    }
  }
  return next as T;
}

/**
 * 檢查模型生成的法律分析是否與本機規則矛盾。
 * 命中任一條即視為阻斷級（BLOCK），呼叫端必須擋下該段分析。
 *
 * 妨害性自主脈絡以「整份文件」或呼叫端旗標判定：矛盾句本身常不帶條號
 * （例如「此罪屬於準親告罪」），若逐句要求條號會整段漏判。
 */
export function detectAnalysisContradictions(
  analysisText: string,
  facts: TriageAuthorityFacts = {}
): ConsistencyViolation[] {
  const text = (analysisText || '').trim();
  if (!text) return [];

  // 妨害性自主的判斷以「整份文件」為範圍：矛盾句本身常不帶條號
  // （例如「此罪屬於準親告罪」），若逐句要求條號會整段漏判。
  if (!facts.isSexualAutonomyCase && !SEXUAL_CONTEXT.test(text)) return [];

  const violations: ConsistencyViolation[] = [];
  for (const sentence of splitSentences(text)) {
    const found = [
      detectTellNatureContradiction(sentence, facts.isPublicProsecution === true),
      detectOffenseParagraphMislabel(sentence),
      detectImpossibilityMislabel(sentence),
      detectObsoleteOffenseName(sentence)
    ].filter((item): item is ConsistencyViolation => item !== null);
    violations.push(...found);
  }
  return violations;
}

export class AnalysisConsistencyError extends Error {
  readonly violations: ConsistencyViolation[];

  constructor(violations: ConsistencyViolation[]) {
    const detail = violations.map(item => `${item.message}（${item.evidence}）`).join('；');
    super(`模型生成的法律分析與本機法律規則矛盾，已依 fail-closed 原則停止回傳：${detail}`);
    this.name = 'AnalysisConsistencyError';
    this.violations = violations;
  }
}

/**
 * fail-closed 閘門：偵測到矛盾就丟出，呼叫端不得繼續把該段分析送給使用者。
 */
export function assertAnalysisConsistent(analysisText: string, facts: TriageAuthorityFacts = {}): void {
  const violations = detectAnalysisContradictions(analysisText, facts);
  if (violations.length > 0) {
    throw new AnalysisConsistencyError(violations);
  }
}
