/**
 * 臺灣司法裁判與法源權威引註標準化工具 (Taiwan Legal Citation Formatter)
 * 
 * 依照司法院與最高法院標準書狀引註格式，將裁判檢索資料轉換為法庭通用之權威引註字串。
 */

export interface PrecedentCitationInput {
  type?: string;
  citation?: string;
  summary?: string;
  courtName?: string;
  date?: string;
}

/**
 * 將使用者或 API 回傳的案號字串轉換為正規之書狀引註格式
 * 例如：
 * "112台上2409" -> "最高法院 112 年度台上字第 2409 號判決"
 * "最高法院110年度台上字第123號民事判決" -> "最高法院 110 年度台上字第 123 號民事判決"
 */
export function formatStandardCourtCitation(rawCitation: string, defaultType: string = '裁判'): string {
  if (!rawCitation) return '';
  let str = rawCitation.trim();

  // 若已包含完整法院名稱與年度字號，僅美化空格
  if (/^(最高法院|最高行政法院|憲法法庭|臺灣高等法院|高等法院|臺灣.+地方法院)/.test(str)) {
    return str
      .replace(/^(最高法院|最高行政法院|憲法法庭|臺灣高等法院|高等法院|臺灣.+地方法院)\s*/, '$1 ')
      .replace(/(\d{2,3})年(度)?\s*/, '$1 年度 ')
      .replace(/字第\s*/, '字第 ')
      .replace(/(\d+)\s*號/, '$1 號');
  }

  // 比對常見簡稱："112台上2409" 或 "112 台上 2409"
  const supremeMatch = str.match(/^(\d{2,3})\s*(台上|台抗|台再|台聲)\s*(\d+)$/);
  if (supremeMatch) {
    const [, yr, word, num] = supremeMatch;
    const isCivilOrCriminal = word.includes('抗') ? '裁定' : '判決';
    return `最高法院 ${yr} 年度${word}字第 ${num} 號${isCivilOrCriminal}`;
  }

  // 地院或高院簡稱："110上易1234"
  const highMatch = str.match(/^(\d{2,3})\s*(上易|上訴|重上|抗)\s*(\d+)$/);
  if (highMatch) {
    const [, yr, word, num] = highMatch;
    return `高等法院 ${yr} 年度${word}字第 ${num} 號判決`;
  }

  return str;
}

/**
 * 產生書狀可直接引用的完整論理引註字串（含核心要旨）
 */
export function buildPleadingCitationSnippet(item: PrecedentCitationInput): string {
  const stdCitation = formatStandardCourtCitation(item.citation || '', item.type);
  const summary = (item.summary || '').trim();

  if (summary) {
    return `【裁判字號】${stdCitation}\n【裁判要旨】「${summary}」\n（依法應予參照並適用於本案）`;
  }
  return `參照${stdCitation}`;
}

/**
 * 複製文字至剪貼簿（安全兼具非同步）
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  // Fallback
  try {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    }
  } catch {}

  return false;
}
