/**
 * 送外部 AI 前的個資遮蔽，以及回應後的還原。
 *
 * 為什麼需要：使用者會在案情描述中輸入真實的身分證字號、
 * 手機號碼、地址與電子信箱。這些文字會原樣送到外部 AI 服務，
 * 構成個資法上的資料外傳。實測確認目前完全沒有任何遮蔽。
 *
 * 為什麼不在入口直接阻擋：法院書狀依法必須登載當事人的
 * 姓名、身分證字號與地址（當事人特定化的要求），
 * 直接阻擋等於讓產品無法使用。
 *
 * 因此採「遮蔽 → 送外 → 還原」：
 *   使用者輸入：身分證字號 A123456789
 *   送 AI 前：  身分證字號【ID1】
 *   AI 回應：   （沿用【ID1】）
 *   本地組裝：  還原為 A123456789
 *
 * 外部服務只看到代號，書狀仍完整登載當事人資料。
 *
 * 佔位符採【ID1】形式而非 UUID：短、易讀，且中文字元邊界明確，
 * 模型較不容易改寫。若模型仍改寫了格式，還原會自動略過該筆
 * 而不是產生錯誤內容。
 */

/** 遮蔽後的對照表。一次請求共用一份，供回應還原。 */
export interface PiiMapping {
  /** 佔位符 → 原始值 */
  readonly entries: ReadonlyArray<{ placeholder: string; original: string; kind: PiiKind }>;
}

export type PiiKind = '身分證' | '手機' | '市話' | '電子信箱' | '地址';

interface Rule {
  kind: PiiKind;
  /** 來源標籤，用於產生【ID1】【電話1】這類佔位符 */
  tag: string;
  pattern: RegExp;
  /**
   * 同一種類的佔位符序號。身分證、手機等都用獨立序號，
   * 避免「身分證欄位填了手機號碼」時佔位符語意錯亂。
   */
  index: number;
}

const 規則: Rule[] = [
  // 身分證／居留證／統一編號
  { kind: '身分證', tag: 'ID', index: 1, pattern: /\b[A-Z][12][0-9]{8}\b/gi },
  { kind: '身分證', tag: 'ID', index: 1, pattern: /\b[A-Z][4-9][0-9]{8}\b/gi },
  // 手機（09 開頭）
  { kind: '手機', tag: '手機', index: 1, pattern: /\b09[0-9]{2}[-\s]?[0-9]{3}[-\s]?[0-9]{3}\b/g },
  // 市話：區碼後允許分隔符，02-2375-8888 / 02 2375 8888 / 0223758888 都要涵蓋
  { kind: '市話', tag: '市話', index: 1, pattern: /\b0[2-8][-\s]?[0-9]{3,4}[-\s]?[0-9]{4}\b/g },
  // 電子信箱
  { kind: '電子信箱', tag: '信箱', index: 1, pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g }
];

function 佔位符(標籤: string, 序號: number): string {
  return `【${標籤}${序號}】`;
}

/**
 * 遮蔽文字中的個資。
 *
 * 回傳遮蔽後的文字與對照表；文字中沒有個資時，原字串原樣回傳。
 */
export function maskPii(input: string): { text: string; mapping: PiiMapping } {
  if (typeof input !== 'string' || !input) {
    return { text: typeof input === 'string' ? input : '', mapping: { entries: [] } };
  }

  const 計數 = new Map<string, number>();
  const entries: Array<{ placeholder: string; original: string; kind: PiiKind }> = [];
  let text = input;

  for (const 規則項目 of 規則) {
    text = text.replace(規則項目.pattern, (原值) => {
      // 同一個值只建立一組佔位符，維持全文一致。
      const 既有 = entries.find(e => e.original === 原值 && e.kind === 規則項目.kind);
      if (既有) return 既有.placeholder;
      const 序號 = (計數.get(規則項目.tag) || 0) + 1;
      計數.set(規則項目.tag, 序號);
      const placeholder = 佔位符(規則項目.tag, 序號);
      entries.push({ placeholder, original: 原值, kind: 規則項目.kind });
      return placeholder;
    });
  }

  return { text, mapping: { entries } };
}

/**
 * 還原回應中的佔位符。
 *
 * 模型可能改寫佔位符格式（少書名號、改用其他標點）。
 * 因此比對時忽略書名號本身，只比對內部標籤與序號。
 * 對不上的佔位符會保持原樣——寧可讓使用者看到【ID1】，
 * 也不要把它錯置成別人的資料。
 */
export function restorePii(text: string, mapping: PiiMapping): string {
  if (typeof text !== 'string' || !text) return text;
  if (!mapping.entries.length) return text;

  let out = text;
  for (const entry of mapping.entries) {
    // 同時容忍全形／半形書名號與不同層級的括號。
    const 內文 = entry.placeholder.replace(/【|】/g, '');
    const 樣式 = new RegExp(
      `[【\\[（(]?${內文.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[】\\]）)]?`,
      'g'
    );
    out = out.replace(樣式, () => entry.original);
  }
  return out;
}

/** 遮蔽並還原的成對操作，供單次呼叫直接使用。 */
export function withPiiMask<T>(input: string, fn: (masked: string, mapping: PiiMapping) => T): T {
  const { text, mapping } = maskPii(input);
  return fn(text, mapping);
}

/** 僅供測試與診斷：列出會被遮蔽的個資種類。 */
export function detectPiiKinds(input: string): PiiKind[] {
  if (typeof input !== 'string' || !input) return [];
  const 命中 = new Set<PiiKind>();
  for (const r of 規則) {
    if (new RegExp(r.pattern.source, r.pattern.flags).test(input)) 命中.add(r.kind);
  }
  return [...命中];
}
