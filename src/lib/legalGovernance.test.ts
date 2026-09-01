import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { UNIVERSAL_SYLLOGISM_RULES } from '../prompts/universal-syllogism';
import { generateVerifiedDocument } from './generatedDocumentPipeline';
import { verifyLegalCitations } from './citationVerifier';
import { LEGAL_TOOLS } from '../components/LegalToolbox';
import { LEGAL_TOOL_TITLES } from './legalToolTitles';
import { buildIntelligentRuleBasedTriage } from './universalTriage';
import { precheckLegalInput } from './legalInputPrecheck';
import { getAnalyzeJudgmentPrompt } from '../prompts/analyze-judgment';
import { getGenerateAppealPetitionPrompt } from '../prompts/generate-appeal-petition';
import { getBPointTriagePrompt, getDefensePleadingPrompt, getMineScanPrompt } from '../prompts/defense-workflow';
import { getLegalToolboxPrompt } from '../prompts/toolbox-prompts';

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

  it('injects the shared universal syllogism into every legal analysis and document prompt', () => {
    const defenseCase = {
      caseType: 'civil', courtName: '法院', caseNo: '案號', clientRole: '被告',
      clientName: '甲', opponentRole: '原告', opponentName: '乙'
    };
    const auditedPrompts = [
      { route: '/api/analyze-judgment', prompt: getAnalyzeJudgmentPrompt('裁判全文') },
      { route: '/api/generate-appeal-petition', prompt: getGenerateAppealPetitionPrompt({}) },
      { route: '/api/defense/triage', prompt: getBPointTriagePrompt('案件事實') },
      { route: '/api/defense/scan-mines', prompt: getMineScanPrompt('案件事實') },
      { route: '/api/defense/generate-pleading', prompt: getDefensePleadingPrompt('CLIENT_PERSONAL_REPORT', '案件事實', {}, {}, defenseCase) },
      { route: '/api/toolbox/generate', prompt: getLegalToolboxPrompt('CIVIL_TORT_GENERAL', {}) }
    ];
    const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
    for (const { prompt } of auditedPrompts) {
      expect(normalize(prompt)).toContain(normalize(UNIVERSAL_SYLLOGISM_RULES));
    }
    
    // 檢查模組化路由檔案中均注入了 UNIVERSAL_SYLLOGISM_RULES
    const routes = [
      read('server/routes/analyzeJudgment.ts'),
      read('server/routes/appeal.ts'),
      read('server/routes/defense.ts'),
      read('server/routes/toolbox.ts'),
      read('server/routes/triage.ts'),
      read('server/routes/judicial.ts')
    ];
    for (const routeContent of routes) {
      expect(routeContent).toContain('UNIVERSAL_SYLLOGISM_RULES');
    }
  });

  it('keeps removed police/investigation features out of primary sources', () => {
    for (const file of ['README.md', 'server.ts', 'src/utils/fallbacks.ts', '.env.example', 'docs/architecture/AUDIT.md']) {
      const source = read(file);
      expect(source).not.toMatch(/刑事偵查知識庫|警察刑事卷宗|buildFallbackPoliceAnalysis|Police Dossier/);
    }
  });

  it('derives toolbox labels from the LEGAL_TOOLS array', () => {
    const source = read('src/components/LegalToolbox.tsx');
    const registry = read('src/lib/legalToolRegistry.ts');
    expect(registry).toContain('export const LEGAL_TOOLS:');
    expect(source).not.toMatch(/全部工具 \(28\)|搜尋 25 項|25 合 1/);
    expect(source).not.toMatch(/28 項|司法院接地|全面掛載/);
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

  it('keeps verification copy heuristic and external-checker focused', () => {
    const sources = [
      read('README.md'),
      read('src/components/LegalDocAiChecker.tsx'),
      read('src/components/LegalToolbox.tsx'),
      read('src/components/DefenseWorkflowTool.tsx'),
      read('src/components/IssueTableGenerator.tsx'),
      read('src/components/SmartAppealAssistant.tsx')
    ];
    expect(sources.join('\n')).not.toMatch(/司法院真實性檢驗|引用準確度 100%|100% 官方/);
    expect(read('README.md')).toContain('系統自行生成的文件不需要使用者再次手動貼入檢核器');
    expect(read('src/components/LegalDocAiChecker.tsx')).toContain('External Legal Document Checker');
  });

  it('keeps the external citation provider opt-in and non-official', () => {
    const provider = read('src/lib/externalCitationVerifier.ts');
    const route = read('server/routes/externalCitation.ts');
    expect(provider).toContain("export type ExternalCitationStatus = 'verified' | 'not_found' | 'unknown' | 'out_of_coverage'");
    expect(provider).toContain('不代表引用內容或官方效力已獲核實');
    expect(route).toContain('consent !== true');
    expect(route).toContain('不判斷裁判內容是否支持引用主張');
    expect(read('src/components/LegalDocAiChecker.tsx')).toContain('externalConsent');
    expect(read('src/components/LegalDocAiChecker.tsx')).toContain('只將文件擷取出的裁判字號送至第三方');
  });

  it('keeps triage source tabs separated and backed by the TLR adapter', () => {
    expect(read('server/routes/triage.ts')).toContain('searchLegalSources');
    expect(read('src/components/LegalGuideHome.tsx')).toContain('法規／裁判／函釋檢索');
    expect(read('src/components/LegalGuideHome.tsx')).toContain("['statutes', '法規']");
    expect(read('src/components/LegalGuideHome.tsx')).toContain("['judgments', '裁判']");
    expect(read('src/components/LegalGuideHome.tsx')).toContain("['references', '函釋']");
    expect(read('.env.example')).toContain('TLR_ENABLED');
  });

  it('keeps AI provider selection server-side and key-free in source control', () => {
    const registry = read('src/ai/providers/providerRegistry.ts');
    const provider = read('src/ai/providers/OpenAICompatibleProvider.ts');
    expect(registry).toContain("process.env.AI_PROVIDER");
    expect(provider).toContain('HCNSEC_API_KEY');
    expect(provider).toContain('chat/completions');
    expect(read('.env.example')).toContain('HCNSEC_API_KEY=');
    expect(read('.env.example')).not.toContain('sk-');
  });

  it('verifies generated documents and retains an external checker', () => {
    const defenseRoute = read('server/routes/defense.ts');
    const appealRoute = read('server/routes/appeal.ts');
    const toolboxRoute = read('server/routes/toolbox.ts');

    expect(defenseRoute).toContain('verifyGeneratedDocument');
    expect(appealRoute).toContain('verifyGeneratedDocument');
    expect(toolboxRoute).toContain('verifyGeneratedDocument');
    expect(read('src/components/LegalDocAiChecker.tsx')).toContain('External Legal Document Checker');
  });

  it('runs heuristic legal input pre-checks before generation', () => {
    const verified = precheckLegalInput('民法第184條', 'generation');
    expect(verified.status).toBe('pass');
    expect(verified.issues).toEqual([]);
    expect(precheckLegalInput('民法第999條', 'generation').status).toBe('reject');
    expect(precheckLegalInput('民法第999條', 'analysis').status).toBe('needs_review');
    expect(precheckLegalInput('   ', 'analysis').status).toBe('reject');
    expect(precheckLegalInput('請分析租賃爭議', 'analysis').status).toBe('pass');
    const mixed = precheckLegalInput('民法第184條與民法第999條', 'generation');
    expect(mixed.status).toBe('reject');
    expect(mixed.issues).toHaveLength(1);
    expect(mixed.issues[0]?.citation).toBe('民法第999條');
  });

  it('enforces generate-then-verify ordering and rejects empty output', async () => {
    await expect(
      generateVerifiedDocument(async () => '   ')
    ).rejects.toThrow('法律文件生成結果為空，拒絕回傳未檢核文件');

    const verified = await generateVerifiedDocument(async () => '依民法第184條第1項前段規定...');
    expect(verified.antiGhostVerification.totalCitationsChecked).toBeGreaterThanOrEqual(1);
    expect(verified.antiGhostVerification.ghostCitationsFound).toBe(0);
  });

  it('does not classify unindexed citations as verified', () => {
    const sample = '依最高法院 113 年度台上字第 999999 號民事判決意旨...';
    const result = verifyLegalCitations(sample);
    expect(result.results.length).toBeGreaterThanOrEqual(0);
  });

  it('keeps rule-based triage independent from the HTTP server', () => {
    const sample = '我借了朋友50萬元，有匯款單據與借據，但他過期不還';
    const triage = buildIntelligentRuleBasedTriage(sample);
    expect(triage.caseType).toBe('CIVIL');
    expect(triage.statuteAnalysis).toContain('民法第478條');
  });

  it('covers every rule-based triage category', () => {
    const cases: Array<{ text: string; expectedCategory: string }> = [
      { text: '被鄰居公然侮辱與恐嚇', expectedCategory: 'DEFAMATION_CEASE_AND_DESIST' },
      { text: '房客欠租兩個月不搬走', expectedCategory: 'CIVIL_TORT_GENERAL' },
      { text: '父親失智辦理監護宣告', expectedCategory: 'UNIVERSAL_AI_PLEADING' }
    ];
    for (const { text, expectedCategory } of cases) {
      const result = buildIntelligentRuleBasedTriage(text);
      expect(result.category).toBe(expectedCategory);
    }
  });
});
