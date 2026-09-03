import { describe, expect, it } from 'vitest';
import { RuntimeSchemaValidator, ObjectSchema } from './runtimeSchemaValidator';
import { AppError } from './errors';

describe('RuntimeSchemaValidator', () => {
  const schema: ObjectSchema = {
    type: 'object',
    required: ['id', 'status', 'score'],
    properties: {
      id: { type: 'string', minLength: 3 },
      status: { type: 'string', enum: ['PENDING', 'ACTIVE', 'CLOSED'] },
      score: { type: 'number' },
      metadata: {
        type: 'object',
        required: ['category'],
        properties: {
          category: { type: 'string' }
        }
      },
      tags: {
        type: 'array',
        items: { type: 'string', maxLength: 10 }
      }
    }
  };

  it('validates a valid object successfully', () => {
    const validData = {
      id: 'usr123',
      status: 'ACTIVE',
      score: 95.5,
      metadata: { category: 'Premium' },
      tags: ['vip', 'verified']
    };
    const result = RuntimeSchemaValidator.validate(validData, schema);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('fails if missing required fields', () => {
    const missingData = {
      id: 'usr123',
      score: 95.5
      // missing status
    };
    const result = RuntimeSchemaValidator.validate(missingData, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('status') && e.includes('缺少必填欄位'))).toBe(true);
  });

  it('fails if field type is wrong', () => {
    const wrongTypeData = {
      id: 123, // should be string
      status: 'ACTIVE',
      score: '95' // should be number
    };
    const result = RuntimeSchemaValidator.validate(wrongTypeData, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('[$.id]') && e.includes('型態不符'))).toBe(true);
    expect(result.errors.some(e => e.includes('[$.score]') && e.includes('型態不符'))).toBe(true);
  });

  it('fails if enum is invalid', () => {
    const invalidEnum = {
      id: 'usr123',
      status: 'UNKNOWN',
      score: 10
    };
    const result = RuntimeSchemaValidator.validate(invalidEnum, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('UNKNOWN') && e.includes('枚舉值非法'))).toBe(true);
  });

  it('fails on malformed nested object', () => {
    const badNested = {
      id: 'usr',
      status: 'PENDING',
      score: 0,
      metadata: {
        // missing category
        other: 1
      }
    };
    const result = RuntimeSchemaValidator.validate(badNested, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('[$.metadata.category]') && e.includes('缺少必填欄位'))).toBe(true);
  });

  it('fails on malformed array', () => {
    const badArray = {
      id: 'usr',
      status: 'PENDING',
      score: 0,
      tags: [123] // should be string
    };
    const result = RuntimeSchemaValidator.validate(badArray, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('[$.tags[0]]') && e.includes('型態不符'))).toBe(true);
  });

  describe('parseAndValidate', () => {
    it('parses valid JSON and validates', () => {
      const rawText = `\`\`\`json
{
  "id": "item-01",
  "status": "CLOSED",
  "score": 100
}
\`\`\``;
      const result = RuntimeSchemaValidator.parseAndValidate(rawText, schema);
      expect(result.id).toBe('item-01');
    });

    it('throws AppError if parsing fails', () => {
      const rawText = `{ "id": "item-01", "status": "CLOSED" `; // broken json
      expect(() => {
        RuntimeSchemaValidator.parseAndValidate(rawText, schema);
      }).toThrowError(/JSON Parse Error/);
    });

    it('throws AppError if validation fails', () => {
      const rawText = `{ "id": "item", "status": "INVALID", "score": 10 }`;
      expect(() => {
        RuntimeSchemaValidator.parseAndValidate(rawText, schema);
      }).toThrowError(/未通過 Schema 契約檢驗/);
    });
  });
});
