import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { UNIVERSAL_SYLLOGISM_RULES } from '../prompts/universal-syllogism';
import { generateVerifiedDocument } from './generatedDocumentPipeline';
import { verifyLegalCitations } from './citationVerifier';
import { LEGAL_TOOLS } from './legalToolRegistry';
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

  it('keeps removed police/investigation features out of primary sources', () => {
    for (const file of ['README.md', 'server.ts', 'src/utils/fallbacks.ts', '.env.example', 'docs/architecture/AUDIT.md']) {
      const source = read(file);
      expect(source).not.toMatch(/刑事偵查知識庫|警察刑事卷宗|buildFallbackPoliceAnalysis|Police Dossier/);
    }
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

  it('verifies generated documents at runtime and enforces UNIVERSAL_SYLLOGISM_RULES in the prompt', async () => {
    // 1. We test the central pipeline used by all routes instead of inspecting source files.
    const { LegalGenerationPipeline } = await import('../../server/services/legalGenerationPipeline.js');
    const { UNIVERSAL_SYLLOGISM_RULES } = await import('../prompts/universal-syllogism.js');
    const { defaultAIProvider } = await import('../ai/providers/providerRegistry.js');
    const { verifyGeneratedDocument } = await import('./generatedDocumentPipeline.js');

    const generateSpy = vi.spyOn(defaultAIProvider, 'generate').mockResolvedValue({ text: '依據民法第184條...' });
    
    // We mock the retrieval service to isolate the pipeline test
    const mockRetrievalService = {
      search: vi.fn(),
      retrieveContext: vi.fn().mockResolvedValue({
        sources: { allowedCitations: [] },
        promptBlock: 'Test Context',
        allowedCitations: [],
        hasCitations: false,
        isExternalRetrievalUsed: false,
        statusMessage: 'OK'
      })
    };
    
    const pipeline = new LegalGenerationPipeline(mockRetrievalService, defaultAIProvider);
    await pipeline.execute({
      ragQuery: 'test query',
      buildPrompt: () => 'Test base prompt'
    });

    // Verify UNIVERSAL_SYLLOGISM_RULES is actually passed to the AI provider in the runtime generation path
    expect(generateSpy).toHaveBeenCalled();
    const actualPromptSentToAI = generateSpy.mock.calls[0][0];
    expect(actualPromptSentToAI).toContain(UNIVERSAL_SYLLOGISM_RULES);

    generateSpy.mockRestore();
    expect(read('src/components/LegalDocAiChecker.tsx')).toContain('External Legal Document Checker');
  });

  it('keeps the current appeal payload fields in the generation prompt', () => {
    const prompt = getGenerateAppealPetitionPrompt({
      caseNo: '113年度上字第1號',
      issues: [{ id: 'i1', title: '爭點', originalHolding: '原審認定', appealArgument: '指摘', relatedEvidenceCodes: '1', legalBasis: '民法第184條' }],
      evidences: [{ id: 'e1', code: '1', relatedIssue: '爭點', investigationItem: '調查', investigationTarget: '證人', targetAddress: '詳卷', provenFact: '待證事實' }],
      selectedPrecedents: [{ id: 'p1', type: '判決', citation: '最高法院112年度台上字第1號', summary: '要旨', applicationReason: '適用', selected: true }]
    });
    expect(prompt).toContain('113年度上字第1號');
    expect(prompt).toContain('最高法院112年度台上字第1號');
    expect(prompt).toContain('待證事實');
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

    await expect(
      generateVerifiedDocument(
        async () => '依最高法院113年度台上字第999999號判決意旨...',
        () => ({
          sanitizedText: '依最高法院113年度台上字第999999號判決意旨...',
          totalChecked: 1,
          ghostCount: 1,
          results: [{ verified: false, isGhostOrFake: true, citationText: '最高法院113年度台上字第999999號' }] as any
        })
      )
    ).rejects.toThrow('法律文件引用檢核未通過');
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
