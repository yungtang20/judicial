import { describe, expect, it } from 'vitest';
import { DEFAULT_FORM_INPUTS } from './toolFormDefaults';
import { LEGAL_TOOLS } from './legalToolRegistry';
import { TOOL_FIELD_SCHEMAS } from './toolFieldSchemas';

describe('DEFAULT_FORM_INPUTS', () => {
  it('is a non-empty record with typed demo values', () => {
    const keys = Object.keys(DEFAULT_FORM_INPUTS);
    expect(keys.length).toBeGreaterThan(20);
    for (const key of keys) {
      const value = DEFAULT_FORM_INPUTS[key];
      expect(['string', 'number']).toContain(typeof value);
    }
  });

  it('身分證字號不得預填，避免使用者誤將示範值提交到正式書狀', () => {
    // 先前的斷言要求每個預設值都非空，那等於要求示範身分證必須存在於表單中，
    // 使用者很容易直接沿用並提交到法院文件裡。
    // 身分證改為留空，格式改由欄位 placeholder 提示。
    for (const [key, value] of Object.entries(DEFAULT_FORM_INPUTS)) {
      if (!/(^|[a-z])(Id|IdNo)$/.test(key)) continue;
      expect(String(value), `${key} 不應預填身分證`).toBe('');
    }
  });

  it('does not leak credential-like or real-id-like personal secrets', () => {
    for (const [key, value] of Object.entries(DEFAULT_FORM_INPUTS)) {
      expect(key.toLowerCase()).not.toMatch(/(password|secret|token|apikey)/);
      expect(String(value)).not.toMatch(/(sk-[A-Za-z0-9]{16,}|-----BEGIN)/);
    }
  });

  it('covers a useful baseline of demo inputs shared across tools', () => {
    const defaults = new Set(Object.keys(DEFAULT_FORM_INPUTS));
    const widelyUsed = ['complainantName', 'plaintiffName', 'defendant1Name', 'evidenceList', 'claimAmount'];
    for (const key of widelyUsed) {
      expect(defaults.has(key), `missing default for ${key}`).toBe(true);
    }
  });

  it('keeps registry integrity: every legal tool has schema and demo inputs stay scalar', () => {
    expect(LEGAL_TOOLS.length).toBeGreaterThan(0);
    for (const tool of LEGAL_TOOLS) {
      expect(TOOL_FIELD_SCHEMAS[tool.id]).toBeDefined();
    }
    for (const value of Object.values(DEFAULT_FORM_INPUTS)) {
      expect(typeof value === 'string' || typeof value === 'number').toBe(true);
    }
  });
});
