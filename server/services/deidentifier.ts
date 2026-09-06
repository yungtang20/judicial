/**
 * 法律與訴訟個資去識別化服務 (Taiwan PII De-identifier)
 *
 * 功能：
 * 1. 偵測並遮蔽台灣常見敏感個人資料（身分證字號、手機、市話、Email、住址）
 * 2. 提供暫存映射表以支援事後「雙向復原 (restorePII)」
 * 3. 提供審計與永久日誌用的「不可逆去識別化 (anonymizePII)」
 * 4. 遵循 Fail-Closed 原則與個人資料保護法規
 */

export interface DeidentificationResult {
  maskedText: string;
  mapping: Record<string, string>; // placeholder -> originalValue
  detectedTypes: string[];
}

export class DeidentifierService {
  // 台灣身分證字號 / 外籍居留證統一證號
  private static readonly NATIONAL_ID_REGEX = /\b[A-Z][1289ABCD]\d{8}\b/gi;
  // 台灣手機號碼 (09xxxxxxxx, 09xx-xxx-xxx)
  private static readonly MOBILE_REGEX = /\b09\d{2}[-\s]?\d{3}[-\s]?\d{3}\b/g;
  // 台灣市內電話 (02-xxxxxxxx, 04-xxxxxxxx 等)
  private static readonly LANDLINE_REGEX = /\b0[2-8][-\s]?\d{3,4}[-\s]?\d{4}\b/g;
  // 電子郵件地址
  private static readonly EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  // 台灣地址特徵 (包含縣市區鄉鎮及路街巷弄號樓)
  private static readonly ADDRESS_REGEX = /(?:[台臺][北市中南]|新北市|桃園市|新竹[縣市]|苗栗縣|彰化縣|南投縣|雲林縣|嘉義[縣市]|屏東縣|宜蘭縣|花蓮縣|臺東縣|台東縣|澎湖縣|金門縣|連江縣)(?:[^\s,，。]{2,8}[區鄉鎮市])(?:[^\s,，。]{2,10}[路街道])(?:[^\s,，。]{1,6}[巷弄])?(?:\d{1,5}號)(?:之\d{1,3})?(?:[^\s,，。]{1,6}[樓室])?/g;

  /**
   * 將文本中的敏感個資進行代碼替換（例如 [身份證號_1], [手機號碼_1]）
   * 並產生反向對照表供後續還原
   */
  public static maskPII(text: string): DeidentificationResult {
    if (!text || typeof text !== 'string') {
      return { maskedText: text, mapping: {}, detectedTypes: [] };
    }

    const mapping: Record<string, string> = {};
    const detectedTypes = new Set<string>();
    let masked = text;
    let idCounter = 1;
    let phoneCounter = 1;
    let emailCounter = 1;
    let addressCounter = 1;

    // 1. 遮蔽身分證
    masked = masked.replace(this.NATIONAL_ID_REGEX, (match) => {
      detectedTypes.add('NATIONAL_ID');
      const placeholder = `[當事人身分證_${idCounter++}]`;
      mapping[placeholder] = match;
      return placeholder;
    });

    // 2. 遮蔽手機號碼
    masked = masked.replace(this.MOBILE_REGEX, (match) => {
      detectedTypes.add('MOBILE_PHONE');
      const placeholder = `[當事人手機_${phoneCounter++}]`;
      mapping[placeholder] = match;
      return placeholder;
    });

    // 3. 遮蔽市內電話
    masked = masked.replace(this.LANDLINE_REGEX, (match) => {
      detectedTypes.add('LANDLINE_PHONE');
      const placeholder = `[聯絡電話_${phoneCounter++}]`;
      mapping[placeholder] = match;
      return placeholder;
    });

    // 4. 遮蔽電子郵件
    masked = masked.replace(this.EMAIL_REGEX, (match) => {
      detectedTypes.add('EMAIL');
      const placeholder = `[電子信箱_${emailCounter++}]`;
      mapping[placeholder] = match;
      return placeholder;
    });

    // 5. 遮蔽詳細地址
    masked = masked.replace(this.ADDRESS_REGEX, (match) => {
      detectedTypes.add('ADDRESS');
      const placeholder = `[通訊處所_${addressCounter++}]`;
      mapping[placeholder] = match;
      return placeholder;
    });

    return {
      maskedText: masked,
      mapping,
      detectedTypes: Array.from(detectedTypes)
    };
  }

  /**
   * 利用 mapping 表，將 AI 生成回傳後的替換代碼復原為真實資料
   */
  public static restorePII(maskedText: string, mapping: Record<string, string>): string {
    if (!maskedText || !mapping || Object.keys(mapping).length === 0) {
      return maskedText;
    }

    let restored = maskedText;
    for (const [placeholder, original] of Object.entries(mapping)) {
      // 全域替換該 placeholder
      restored = restored.split(placeholder).join(original);
    }
    return restored;
  }

  /**
   * 永久不可逆遮蔽（用於審計日誌與一般日誌紀錄）
   * 範例：身分證 A123456789 -> A1*****89
   *       手機 0912345678 -> 0912****78
   */
  public static anonymizeForLogs(text: string): string {
    if (!text || typeof text !== 'string') return text;

    let sanitized = text;
    // 身分證遮蔽中間碼
    sanitized = sanitized.replace(this.NATIONAL_ID_REGEX, (match) => {
      return match.slice(0, 2) + '*****' + match.slice(-2);
    });
    // 手機遮蔽中間碼
    sanitized = sanitized.replace(this.MOBILE_REGEX, (match) => {
      const clean = match.replace(/[-\s]/g, '');
      return clean.slice(0, 4) + '****' + clean.slice(-2);
    });
    // Email 遮蔽
    sanitized = sanitized.replace(this.EMAIL_REGEX, (match) => {
      const parts = match.split('@');
      const name = parts[0];
      const domain = parts[1];
      return (name.length > 2 ? name.slice(0, 2) + '***' : '***') + '@' + domain;
    });

    return sanitized;
  }
}
