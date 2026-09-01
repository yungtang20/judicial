import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { UNIVERSAL_SYLLOGISM_RULES } from '../prompts/universal-syllogism';
import { assertGeneratedDocumentVerified, generateVerifiedDocument, verifyGeneratedDocument } from './generatedDocumentPipeline';
import { verifyLegalCitations } from './citationVerifier';
import { LEGAL_TOOLS } from '../components/LegalToolbox';

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
    const ids = LEGAL_TOOLS.map(tool => tool.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(LEGAL_TOOLS.every(tool => tool.name && tool.shortDesc && tool.legalBasis)).toBe(true);
    expect(read('src/components/DefenseWorkflowTool.tsx')).toContain('DefenseWorkflowTool');
  });

  it('verifies generated documents and retains an external checker', () => {
    const server = read('server.ts');
    expect(server).toContain('generatedDocumentPipeline');
    expect(server).toContain('verifyGeneratedDocument(pleadingText)');
    expect(server).toContain('法律文件引用檢核未通過，拒絕回傳未確認引用文件');
    expect(server).toContain('res.status(422)');
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
    expect(() => assertGeneratedDocumentVerified(verifyGeneratedDocument('民法第999條'))).toThrow('引用檢核未通過');
  });

  it('does not classify unindexed citations as verified', () => {
    const result = verifyLegalCitations('民法第999條');
    expect(result.results[0]?.verified).toBe(false);
    expect(result.results[0]?.hallucinationRisk).toBe('UNVERIFIED');
  });
});
