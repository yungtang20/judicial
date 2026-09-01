import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { UNIVERSAL_SYLLOGISM_RULES } from '../prompts/universal-syllogism';
import { assertGeneratedDocumentVerified, generateVerifiedDocument, verifyGeneratedDocument } from './generatedDocumentPipeline';
import { verifyLegalCitations } from './citationVerifier';
import { LEGAL_TOOLS } from '../components/LegalToolbox';
import { LEGAL_TOOL_TITLES } from './legalToolTitles';
import { buildIntelligentRuleBasedTriage } from './universalTriage';
import { precheckLegalInput } from './legalInputPrecheck';

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
    const registry = read('src/lib/legalToolRegistry.ts');
    expect(registry).toContain('export const LEGAL_TOOLS:');
    expect(source).not.toMatch(/全部工具 \(28\)|搜尋 25 項|25 合 1/);
    expect(source).toContain('LEGAL_TOOLS.length');
    expect(read('src/components/Sidebar.tsx')).not.toContain('25合1');
    expect(read('src/components/LitigationWorkspace.tsx')).not.toContain('25合1');
    expect(read('src/prompts/toolbox-prompts.ts')).not.toContain('25 Professional Taiwan Legal Tools');
    const ids = LEGAL_TOOLS.map(tool => tool.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(LEGAL_TOOLS.every(tool => tool.name && tool.shortDesc && tool.legalBasis)).toBe(true);
    expect(LEGAL_TOOL_TITLES.UNIVERSAL_AI_PLEADING).toBeTruthy();
    expect(read('src/components/DefenseWorkflowTool.tsx')).toContain('DefenseWorkflowTool');
  });

  it('verifies generated documents and retains an external checker', () => {
    const server = read('server.ts');
    expect(server).toContain('generatedDocumentPipeline');
    expect(server).toContain('verifyGeneratedDocument(pleadingText)');
    expect(server).toContain('assertGeneratedDocumentVerified(verifyGeneratedDocument(docText))');
    expect(server).toContain('法律文件引用檢核未通過，拒絕回傳未確認引用文件');
    expect(server).toContain('res.status(422)');
    expect(server).toContain('precheckLegalInput');
    expect(read('src/components/LegalDocAiChecker.tsx')).toContain('External Legal Document Checker');
  });

  it('runs heuristic legal input pre-checks before generation', () => {
    expect(precheckLegalInput('民法第184條', 'generation').status).toBe('pass');
    expect(precheckLegalInput('民法第999條', 'generation').status).toBe('reject');
    expect(precheckLegalInput('民法第999條', 'analysis').status).toBe('needs_review');
    expect(precheckLegalInput('   ', 'analysis').status).toBe('reject');
    expect(precheckLegalInput('請分析租賃爭議', 'analysis').status).toBe('pass');
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

  it('keeps rule-based triage independent from the HTTP server', () => {
    const result = buildIntelligentRuleBasedTriage('房東拒絕修繕漏水');
    expect(result.readyDocumentText).toBeTruthy();
    expect(result.antiGhostVerification).toBeDefined();
    expect(result.category).toBe('CIVIL_TORT_GENERAL');
  });

  it('covers every rule-based triage category', () => {
    const cases = [
      ['我的狗被鄰居的貓咬傷', 'CIVIL_PET_DISPUTE'],
      ['我被打了', 'CRIMINAL_COMPLAINT_ASSAULT'],
      ['對方在直播辱罵我', 'DEFAMATION_CEASE_AND_DESIST'],
      ['我車禍受傷需要驗傷', 'CRIMINAL_COMPLAINT_TRAFFIC'],
      ['我被詐騙且寄出提款卡', 'CRIMINAL_COMPLAINT_FRAUD'],
      ['借錢不還', 'DEMAND_LETTER_DEBT'],
      ['遭到性侵', 'CRIMINAL_COMPLAINT_SEXUAL_ASSAULT'],
      ['有人偷走我的手機', 'CRIMINAL_COMPLAINT_THEFT'],
      ['房東拒絕處理租屋漏水', 'CIVIL_TORT_GENERAL'],
      ['一般契約爭議需要法律協助', 'UNIVERSAL_AI_PLEADING']
    ] as const;
    for (const [query, category] of cases) {
      const result = buildIntelligentRuleBasedTriage(query);
      expect(result.category).toBe(category);
      expect(result.readyDocumentText).toBeTruthy();
    }
  });
});
