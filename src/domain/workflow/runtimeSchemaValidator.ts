/**
 * Runtime Schema Validation Engine
 * 專為 AI 原生系統設計之輕量但嚴格的結構驗證引擎
 * 支援 field types, required fields, enum, nested object, array structure 等
 */

import { AppError } from './errors';

export type SchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface FieldDefinition {
  type: SchemaType;
  required?: boolean;
  enum?: (string | number)[];
  minLength?: number;
  maxLength?: number;
  properties?: Record<string, FieldDefinition>;
  items?: FieldDefinition;
  description?: string;
}

export interface ObjectSchema {
  type: 'object';
  required?: string[];
  properties: Record<string, FieldDefinition>;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

export class RuntimeSchemaValidator {
  /**
   * 驗證物件是否符合 ObjectSchema 定義
   */
  public static validate(value: any, schema: ObjectSchema | FieldDefinition, path: string = '$'): SchemaValidationResult {
    const errors: string[] = [];

    if (value === null || value === undefined) {
      if ((schema as FieldDefinition).required) {
        errors.push(`[${path}] 缺少必填欄位。`);
      }
      return { valid: errors.length === 0, errors };
    }

    // 檢查基本型態
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (schema.type !== actualType) {
      errors.push(`[${path}] 型態不符：預期 [${schema.type}]，實際收到 [${actualType}]。`);
      return { valid: false, errors };
    }

    // Enum 檢核
    if ('enum' in schema && schema.enum && schema.enum.length > 0) {
      if (!schema.enum.includes(value)) {
        errors.push(`[${path}] 枚舉值非法：預期 [${schema.enum.join(', ')}]，實際收到 [${value}]。`);
      }
    }

    // 字串長度檢核
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength !== undefined && value.trim().length < schema.minLength) {
        errors.push(`[${path}] 字串長度過短：最小長度 [${schema.minLength}]，實際長度 [${value.trim().length}]。`);
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push(`[${path}] 字串長度超出上限：最大長度 [${schema.maxLength}]，實際長度 [${value.length}]。`);
      }
    }

    // 物件結構檢核
    if (schema.type === 'object' && typeof value === 'object' && !Array.isArray(value)) {
      const objSchema = schema as ObjectSchema;
      const requiredFields = objSchema.required || [];

      for (const reqKey of requiredFields) {
        if (value[reqKey] === undefined || value[reqKey] === null || value[reqKey] === '') {
          errors.push(`[${path}.${reqKey}] 缺少必填欄位。`);
        }
      }

      if (objSchema.properties) {
        for (const [propKey, propDef] of Object.entries(objSchema.properties)) {
          if (value[propKey] !== undefined) {
            const childRes = this.validate(value[propKey], propDef, `${path}.${propKey}`);
            errors.push(...childRes.errors);
          }
        }
      }
    }

    // 陣列結構檢核
    if (schema.type === 'array' && Array.isArray(value)) {
      const fieldDef = schema as FieldDefinition;
      if (fieldDef.items) {
        value.forEach((item, index) => {
          const itemRes = this.validate(item, fieldDef.items!, `${path}[${index}]`);
          errors.push(...itemRes.errors);
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 解析並嚴格驗證 AI JSON 輸出
   */
  public static parseAndValidate<T = any>(rawText: string, schema: ObjectSchema): T {
    if (!rawText || typeof rawText !== 'string') {
      throw new AppError('SCHEMA_VALIDATION_FAILED', 'AI 原始輸出為空，無法進行 Schema 驗證。', 422, {
        errors: ['rawText is empty']
      });
    }

    // 提取 markdown 內嵌之 JSON
    let jsonString = rawText.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err: any) {
      throw new AppError(
        'SCHEMA_VALIDATION_FAILED',
        `AI 輸出非合法 JSON 格式 (JSON Parse Error): ${err.message}`,
        422,
        { rawText, parseError: err.message }
      );
    }

    const validationResult = this.validate(parsed, schema);
    if (!validationResult.valid) {
      throw new AppError(
        'SCHEMA_VALIDATION_FAILED',
        `AI 結構化輸出未通過 Schema 契約檢驗：\n${validationResult.errors.join('\n')}`,
        422,
        { errors: validationResult.errors, parsed }
      );
    }

    return parsed as T;
  }
}
