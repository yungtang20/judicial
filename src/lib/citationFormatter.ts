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

  // 比對常見簡稱。
  //
  // 最高法院再審的實際字號是「台上再」，
  // 先前清單寫的是「台再」，「台上」先匹配後接不上數字而整組失敗，
  // 導致 112台上再2409 完全沒有被格式化。
  const supremeMatch = str.match(/^(\d{2,3})\s*(台上再|台上|台抗|台再|台聲)\s*(\d+)$/);
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

  // 地方法院簡稱："112北訴123"、"112士訴45"、"112訴67"。
  // 這些字號的法院代碼無法從字號本身推回是哪一間地院
  //（例如「訴」可能是臺北、臺中、臺南等地院），
  // 因此只整理格式並標明法院名稱未載明，不臆測所屬法院。
  // 前置代碼可為零到三字：北訴、士訴、重訴，或僅「訴」。
  const districtMatch = str.match(/^(\d{2,3})\s*([^\d\s]{0,3}(?:易訴|勞訴|刑訴|少訴|交訴|破訴|再訴|重訴|訴))\s*(\d+)$/);
  if (districtMatch) {
    const [, yr, word, num] = districtMatch;
    return `${yr} 年度${word}字第 ${num} 號（地方法院，法院名稱未載明）`;
  }

  // 已含年度與字號但未載明法院："112年度台上字第2409號"
  // 去掉尾端的「字」，否則會組成「台上字第字第」。
  const yearOnly = str.match(/^(\d{2,3})\s*年度\s*([^\d\s]{1,4}?)字?\s*第?\s*(\d+)\s*號?$/);
  if (yearOnly) {
    const [, yr, word, num] = yearOnly;
    return `${yr} 年度${word}字第 ${num} 號（法院名稱未載明）`;
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
