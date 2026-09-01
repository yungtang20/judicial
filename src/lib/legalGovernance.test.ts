import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { UNIVERSAL_SYLLOGISM_RULES } from '../prompts/universal-syllogism';
import { generateVerifiedDocument } from './generatedDocumentPipeline';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('legal governance regressions', () => {
  it('uses the universal syllogism for every legal domain', () => {
    expect(UNIVERSAL_SYLLOGISM_RULES).toContain('民事、刑事、行政、家事、勞動');
    expect(UNIVERSAL_SYLLOGISM_RULES).toContain('大前提');
    expect(UNIVERSAL_SYLLOGISM_RULES).toContain('小前提');
    expect(UNIVERSAL_SYLLOGISM_RULES).toContain('涵攝');
    expect(UNIVERSAL_SYLLOGISM_RULES).toContain('結論');
  });

  it('keeps removed police/investigation features out of primary sources', () => {
    for (const file of ['README.md', 'server.ts', 'src/utils/fallbacks.ts', '.env.example']) {
      const source = read(file);
      expect(source).not.toMatch(/刑事偵查知識庫|警察刑事卷宗|buildFallbackPoliceAnalysis|Police Dossier/);
    }
  });

  it('derives toolbox labels from the LEGAL_TOOLS array', () => {
    const source = read('src/components/LegalToolbox.tsx');
    expect(source).toContain('export const LEGAL_TOOLS:');
    expect(source).not.toMatch(/全部工具 \(28\)|搜尋 25 項|25 合 1/);
    expect(source).toContain('LEGAL_TOOLS.length');
  });

  it('verifies generated documents and retains an external checker', () => {
    const server = read('server.ts');
    expect(server).toContain('function verifyGeneratedDocument');
    expect(server).toContain('verifyGeneratedDocument(pleadingText)');
    expect(read('src/components/LegalDocAiChecker.tsx')).toContain('External Legal Document Checker');
  });

  it('enforces generate-then-verify ordering and rejects empty output', async () => {
    const calls: string[] = [];
    const result = await generateVerifiedDocument(
      () => { calls.push('generate'); return '民法第184條'; },
      (text) => { calls.push(`verify:${text}`); return { totalChecked: 0, ghostCount: 0, results: [], sanitizedText: text }; }
    );
    expect(calls).toEqual(['generate', 'verify:民法第184條']);
    expect(result.documentText).toBe('民法第184條');
    await expect(generateVerifiedDocument(() => '  ')).rejects.toThrow('拒絕回傳');
  });
});
