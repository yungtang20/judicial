/**
 * 系統核心 API 規格與響應型別定義 (Standard API Schema & Response Types)
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  requestId: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  requestId: string;
  details?: unknown;
  timestamp?: string;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ValidationErrorDetail {
  field: string;
  message: string;
  received?: unknown;
  expected?: string;
}

/**
 * 輕量且嚴謹的 Schema 驗證工具
 */
export interface FieldRule {
  required?: boolean;
  type?: "string" | "number" | "boolean" | "array" | "object";
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  enum?: (string | number)[];
}

export type SchemaRules<T> = {
  [K in keyof T]?: FieldRule;
};

export class SchemaValidator {
  public static validate<T extends Record<string, unknown>>(
    data: unknown,
    schema: SchemaRules<T>
  ): { valid: boolean; errors: ValidationErrorDetail[]; sanitizedData: T } {
    const errors: ValidationErrorDetail[] = [];
    const sanitizedData = (data && typeof data === "object" ? { ...data } : {}) as T;

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      errors.push({
        field: "body",
        message: "請求本體必須為合法的 JSON 物件",
        received: typeof data,
        expected: "object"
      });
      return { valid: false, errors, sanitizedData };
    }

    const input = data as Record<string, unknown>;

    for (const [field, rule] of Object.entries(schema) as [string, FieldRule][]) {
      const val = input[field];

      // 檢查必填
      if (rule.required && (val === undefined || val === null || val === "")) {
        errors.push({
          field,
          message: `缺少必填欄位 '${field}'`,
          expected: "non-empty value"
        });
        continue;
      }

      if (val === undefined || val === null) {
        continue;
      }

      // 檢查型別
      if (rule.type) {
        if (rule.type === "array") {
          if (!Array.isArray(val)) {
            errors.push({
              field,
              message: `欄位 '${field}' 必須為陣列`,
              received: typeof val,
              expected: "array"
            });
            continue;
          }
        } else if (typeof val !== rule.type) {
          errors.push({
            field,
            message: `欄位 '${field}' 型別錯誤`,
            received: typeof val,
            expected: rule.type
          });
          continue;
        }
      }

      // 字串長度檢查
      if (typeof val === "string") {
        if (rule.maxLength && val.length > rule.maxLength) {
          errors.push({
            field,
            message: `欄位 '${field}' 長度超過最大限制 ${rule.maxLength} 字元`,
            received: val.length,
            expected: `<=${rule.maxLength}`
          });
        }
        if (rule.minLength && val.length < rule.minLength) {
          errors.push({
            field,
            message: `欄位 '${field}' 長度小於最小限制 ${rule.minLength} 字元`,
            received: val.length,
            expected: `>=${rule.minLength}`
          });
        }
        if (rule.pattern && !rule.pattern.test(val)) {
          errors.push({
            field,
            message: `欄位 '${field}' 格式不符合規範`,
            received: val
          });
        }
      }

      // 列舉檢查
      if (rule.enum && !rule.enum.includes(val as any)) {
        errors.push({
          field,
          message: `欄位 '${field}' 包含無效選項`,
          received: val,
          expected: `One of [${rule.enum.join(", ")}]`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedData
    };
  }
}
