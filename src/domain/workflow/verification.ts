/**
 * Fail-Closed Verification & Validator Chain Pipeline
 * 建立標準化 VerificationResult 與多階防護驗證管道
 */

import { AppError } from './errors';
import { verifyLegalCitations } from '../../lib/citationVerifier';
import { RuntimeSchemaValidator, ObjectSchema } from './runtimeSchemaValidator';

export type VerificationStatus = 'PASS' | 'FAIL' | 'NEEDS_REVIEW';

export interface VerificationCheckItem {
  name: string;
  category: 'PRIVACY' | 'SCHEMA' | 'LEGAL' | 'CITATION' | 'SECURITY';
  status: VerificationStatus;
  message: string;
  details?: Record<string, any>;
}

export interface VerificationResult {
  status: VerificationStatus;
  checks: VerificationCheckItem[];
  errors: string[];
  warnings: string[];
  verifiedAt: string;
  verifierVersion: string;
}

export interface IValidator<T = any> {
  name: string;
  validate(target: T, context?: Record<string, any>): Promise<VerificationCheckItem>;
}

// 1. 隱私與去識別化驗證器 (Privacy Validator)
export class PrivacyValidator implements IValidator<string> {
  public name = 'PrivacyValidator';

  // 高風險個資 (身分證字號/居留證號、手機號碼) -> 直接判定 FAIL
  private static readonly HIGH_RISK_ID_REGEX = /[A-Z][1289ABCD]\d{8}/i;
  private static readonly HIGH_RISK_PHONE_REGEX = /(?:09\d{2}[-\s]?\d{3}[-\s]?\d{3}|09\d{8})/;

  // 中度敏感內容 (電子信箱、詳細地址、市內電話) -> 觸發 NEEDS_REVIEW
  private static readonly EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  private static readonly ADDRESS_REGEX = /(?:[台臺][北市中南]|新北市|桃園市|新竹[縣市]|苗栗縣|彰化縣|南投縣|雲林縣|嘉義[縣市]|屏東縣|宜蘭縣|花蓮縣|臺東縣|台東縣|澎湖縣|金門縣|連江縣)(?:[^\s,，。\n]{2,8}[區鄉鎮市])(?:[^\s,，。\n]{2,10}[路街道大道])(?:[一二三四五六七八九十\d]+段)?(?:[^\s,，。\n]{1,6}[巷弄])?(?:\d{1,5}號)/;
  private static readonly LANDLINE_REGEX = /0[2-8][-\s]?\d{3,4}[-\s]?\d{4}/;

  public async validate(text: string): Promise<VerificationCheckItem> {
    if (!text || typeof text !== 'string') {
      return {
        name: this.name,
        category: 'PRIVACY',
        status: 'PASS',
        message: '文本為空，無隱私洩漏風險。'
      };
    }

    // 1. 檢驗高風險個資 (Fail-Closed)
    const hasRawId = PrivacyValidator.HIGH_RISK_ID_REGEX.test(text);
    const hasRawPhone = PrivacyValidator.HIGH_RISK_PHONE_REGEX.test(text);

    if (hasRawId || hasRawPhone) {
      return {
        name: this.name,
        category: 'PRIVACY',
        status: 'FAIL',
        message: `偵測到未脫敏之敏感個資 (包含身分證字號或手機號碼)，違反法律隱私去識別化保護規範。`,
        details: { hasRawId, hasRawPhone }
      };
    }

    // 2. 檢驗中度敏感資訊 (觸發 NEEDS_REVIEW)
    const hasEmail = PrivacyValidator.EMAIL_REGEX.test(text);
    const hasAddress = PrivacyValidator.ADDRESS_REGEX.test(text);
    const hasLandline = PrivacyValidator.LANDLINE_REGEX.test(text);

    if (hasEmail || hasAddress || hasLandline) {
      return {
        name: this.name,
        category: 'PRIVACY',
        status: 'NEEDS_REVIEW',
        message: '偵測到潛在敏感通訊資訊 (包含電子信箱、詳細地址或市話)，標記為待審查 (NEEDS_REVIEW)，需經人工確認是否已完全去識別化。',
        details: { hasEmail, hasAddress, hasLandline }
      };
    }

    return {
      name: this.name,
      category: 'PRIVACY',
      status: 'PASS',
      message: '隱私去識別化合規檢核通過。'
    };
  }
}

// 2. 結構與 Schema 驗證器 (Schema Validator)
export class SchemaValidator implements IValidator<string | Record<string, any>> {
  public name = 'SchemaValidator';
  public async validate(
    content: string | Record<string, any>,
    context?: Record<string, any>
  ): Promise<VerificationCheckItem> {
    if (!content) {
      return {
        name: this.name,
        category: 'SCHEMA',
        status: 'FAIL',
        message: '產物內容為空，未能通過 Schema 結構驗證。'
      };
    }

    // 若 Context 中提供目標結構定義，執行 Runtime Schema Validation
    if (context?.expectedSchema) {
      const schema = context.expectedSchema as ObjectSchema;
      let targetObj = content;
      if (typeof content === 'string') {
        let jsonStr = content.trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        try {
          targetObj = JSON.parse(jsonStr);
        } catch (e: any) {
          return {
            name: this.name,
            category: 'SCHEMA',
            status: 'FAIL',
            message: `JSON 解析失敗，未能符合預期結構契約: ${e.message}`,
            details: { parseError: e.message }
          };
        }
      }

      const valRes = RuntimeSchemaValidator.validate(targetObj, schema);
      if (!valRes.valid) {
        return {
          name: this.name,
          category: 'SCHEMA',
          status: 'FAIL',
          message: `未通過 Runtime Schema 結構驗證：${valRes.errors.join('；')}`,
          details: { errors: valRes.errors }
        };
      }
    }

    if (typeof content === 'string') {
      if (content.trim().length < 20) {
        return {
          name: this.name,
          category: 'SCHEMA',
          status: 'NEEDS_REVIEW',
          message: '產物文字長度過短，可能缺乏完整法律三段論結構，需人工複查。'
        };
      }
    }

    return {
      name: this.name,
      category: 'SCHEMA',
      status: 'PASS',
      message: '結構格式符合交付規範。'
    };
  }
}

// 3. 法律實質與地雷驗證器 (Legal Anti-Mine Validator)
export class LegalValidator implements IValidator<string> {
  public name = 'LegalValidator';
  public async validate(text: string): Promise<VerificationCheckItem> {
    const dangerousMinePatterns = [
      { pattern: /無權處分.*有效/i, reason: '違背民法第118條無權處分效力未定規定' },
      { pattern: /自認.*不利於己/i, reason: '包含可能導致敗訴之自認不利陳述' },
      { pattern: /逾.*時效.*仍得請求/i, reason: '時效抗辯排除依據不足' }
    ];

    const detectedMines: string[] = [];
    for (const mine of dangerousMinePatterns) {
      if (mine.pattern.test(text)) {
        detectedMines.push(mine.reason);
      }
    }

    if (detectedMines.length > 0) {
      return {
        name: this.name,
        category: 'LEGAL',
        status: 'FAIL',
        message: `偵測到嚴重法律漏洞或敗訴地雷：${detectedMines.join('；')}`,
        details: { detectedMines }
      };
    }

    return {
      name: this.name,
      category: 'LEGAL',
      status: 'PASS',
      message: '核心法條適用無明顯牴觸或敗訴地雷。'
    };
  }
}

// 4. 引註真偽檢驗器 (Citation Anti-Ghost Validator - Fail Closed)
export class CitationValidator implements IValidator<string> {
  public name = 'CitationValidator';
  public async validate(text: string): Promise<VerificationCheckItem> {
    const citationRes = verifyLegalCitations(text);

    if (citationRes.ghostCount > 0) {
      const fakeItems = citationRes.results.filter(r => r.isGhostOrFake).map(r => r.citationText);
      return {
        name: this.name,
        category: 'CITATION',
        status: 'FAIL',
        message: `偵測到無效或疑似 AI 幽靈捏造之判決字號/法條引用：${fakeItems.join(', ')}`,
        details: { fakeItems }
      };
    }

    if (citationRes.totalChecked === 0) {
      return {
        name: this.name,
        category: 'CITATION',
        status: 'NEEDS_REVIEW',
        message: '文稿中未偵測到明確最高/高等法院判決字號或具體法條引用，需由專業人員核實論理基礎。'
      };
    }

    return {
      name: this.name,
      category: 'CITATION',
      status: 'PASS',
      message: `引註 heuristic 檢查通過（已檢核 ${citationRes.totalChecked} 處法規與裁判字號；仍需人工查證）。`,
      details: { totalVerified: citationRes.totalChecked }
    };
  }
}

// 5. 安全與 Prompt 注入檢驗器 (Security Validator)
export class SecurityValidator implements IValidator<string> {
  public name = 'SecurityValidator';
  public async validate(text: string): Promise<VerificationCheckItem> {
    const injectionPatterns = [
      /ignore all previous instructions/i,
      /system prompt/i,
      /<script[\s\S]*?>/i,
      /javascript:/i
    ];

    const hasInjection = injectionPatterns.some(p => p.test(text));
    if (hasInjection) {
      return {
        name: this.name,
        category: 'SECURITY',
        status: 'FAIL',
        message: '偵測到潛在惡意腳本或 Prompt Injection 攻擊特徵碼。'
      };
    }

    return {
      name: this.name,
      category: 'SECURITY',
      status: 'PASS',
      message: '安全與防注入檢核通過。'
    };
  }
}

// Validator Pipeline Chain
export class ValidatorPipeline {
  private validators: IValidator[] = [
    new PrivacyValidator(),
    new SchemaValidator(),
    new LegalValidator(),
    new CitationValidator(),
    new SecurityValidator()
  ];

  public async runAll(content: string, context?: Record<string, any>): Promise<VerificationResult> {
    const checks: VerificationCheckItem[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const v of this.validators) {
      try {
        const checkItem = await v.validate(content, context);
        checks.push(checkItem);
        if (checkItem.status === 'FAIL') {
          errors.push(`[${checkItem.category}] ${checkItem.message}`);
        } else if (checkItem.status === 'NEEDS_REVIEW') {
          warnings.push(`[${checkItem.category}] ${checkItem.message}`);
        }
      } catch (err: any) {
        checks.push({
          name: v.name,
          category: 'SECURITY',
          status: 'FAIL',
          message: `驗證器執行崩潰 (Fail-Closed 阻擋): ${err.message}`
        });
        errors.push(`[${v.name}] 驗證器異常退出: ${err.message}`);
      }
    }

    let overallStatus: VerificationStatus = 'PASS';
    if (errors.length > 0) {
      overallStatus = 'FAIL';
    } else if (warnings.length > 0) {
      overallStatus = 'NEEDS_REVIEW';
    }

    return {
      status: overallStatus,
      checks,
      errors,
      warnings,
      verifiedAt: new Date().toISOString(),
      verifierVersion: 'v2.0-deterministic-fail-closed'
    };
  }

  public static assertVerificationPass(result: VerificationResult, stageName: string): void {
    if (result.status === 'FAIL') {
      throw new AppError(
        'VERIFICATION_FAILED',
        `階段 [${stageName}] 驗證失敗 (Fail-Closed)：發現 ${result.errors.length} 項嚴重違規。\n${result.errors.join('\n')}`,
        422,
        { result }
      );
    }

    if (result.status === 'NEEDS_REVIEW') {
      throw new AppError(
        'NEEDS_HUMAN_REVIEW',
        `階段 [${stageName}] 需人工進一步複查：\n${result.warnings.join('\n')}`,
        422,
        { result }
      );
    }
  }
}
