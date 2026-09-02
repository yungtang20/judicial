import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  LegalGenerationPipeline,
  LegalRetrievalService,
  ILegalRetrievalService,
  RetrievalResult
} from './legalGenerationPipeline.js';

describe('LegalGenerationPipeline Unit Tests', () => {
  let mockRetrievalService: ILegalRetrievalService;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('executes full pipeline: retrieve -> inject -> generate -> verify (success)', async () => {
    mockRetrievalService = {
      search: vi.fn(),
      retrieveContext: vi.fn().mockResolvedValue({
        sources: {
          enabled: true,
          provider: 'tw-legal-rag',
          disclaimer: '免責聲明',
          statutes: [],
          judgments: [{
            kind: 'judgments',
            citation: '最高法院112年度台上字第9號',
            title: '最高法院112年度台上字第9號',
            allowedCitation: true
          }],
          references: [],
          literature: [],
          allowedCitations: ['最高法院112年度台上字第9號']
        },
        promptBlock: '【相關實務見解】最高法院112年度台上字第9號',
        allowedCitations: ['最高法院112年度台上字第9號'],
        disclaimer: '免責聲明',
        hasCitations: true,
        isExternalRetrievalUsed: true,
        statusMessage: '已連線外部 TW-Legal-RAG 檢索實務裁判'
      } as RetrievalResult)
    };

    const mockAiProvider = {
      generate: vi.fn().mockResolvedValue({
        text: '按民法第184條第1項前段規定，因故意或過失不法侵害他人之權利者負損害賠償責任。參照最高法院112年度台上字第9號判決要旨，侵權行為責任明確。'
      })
    };

    const pipeline = new LegalGenerationPipeline(mockRetrievalService, mockAiProvider as any);

    const result = await pipeline.execute({
      ragQuery: '侵權行為損害賠償',
      buildPrompt: (retrieval) => `請撰寫答辯理由。檢索情況: ${retrieval.allowedCitations.join(',')}`
    });

    // 1. 強制先檢索
    expect(mockRetrievalService.retrieveContext).toHaveBeenCalledWith('侵權行為損害賠償');
    // 2. 注入 Prompt 與三段論規範
    expect(mockAiProvider.generate).toHaveBeenCalledWith(
      expect.stringContaining('【相關實務見解】最高法院112年度台上字第9號')
    );
    // 3. 通過 verifyGeneratedDocument
    expect(result.antiGhostVerification.verificationPassed).toBe(true);
    expect(result.antiGhostVerification.ghostCitationsFound).toBe(0);
    expect(result.documentText).toContain('最高法院112年度台上字第9號判決');
    // 4. 外部檢索標記與狀態
    expect(result.isExternalRetrievalUsed).toBe(true);
    expect(result.retrievalStatusMessage).toContain('TW-Legal-RAG');
    expect(result.allowedCitations).toContain('最高法院112年度台上字第9號');
  });

  it('marks isExternalRetrievalUsed as false when TLR is disabled, maintaining safe generation', async () => {
    mockRetrievalService = {
      search: vi.fn(),
      retrieveContext: vi.fn().mockResolvedValue({
        sources: {
          enabled: false,
          provider: 'unavailable',
          disclaimer: '免責聲明',
          statutes: [],
          judgments: [],
          references: [],
          literature: [],
          allowedCitations: []
        },
        promptBlock: '【相關實務見解】TLR 未啟用',
        allowedCitations: [],
        disclaimer: '免責聲明',
        hasCitations: false,
        isExternalRetrievalUsed: false,
        statusMessage: '未使用外部檢索（TLR 服務未啟用或離線），安全降級為現行實體法與穩定實務原則論述'
      } as RetrievalResult)
    };

    const mockAiProvider = {
      generate: vi.fn().mockResolvedValue({
        text: '按民事訴訟法第277條前段規定，當事人主張有利於己之事實者，就其事實有舉證之責任。'
      })
    };

    const pipeline = new LegalGenerationPipeline(mockRetrievalService, mockAiProvider as any);

    const result = await pipeline.execute({
      ragQuery: '租賃返還房屋',
      buildPrompt: () => '請論述舉證責任分配'
    });

    expect(result.isExternalRetrievalUsed).toBe(false);
    expect(result.retrievalStatusMessage).toContain('未使用外部檢索');
    expect(result.antiGhostVerification.verificationPassed).toBe(true);
  });

  it('strictly rejects and throws on ghost citations (Fail-Closed)', async () => {
    mockRetrievalService = {
      search: vi.fn(),
      retrieveContext: vi.fn().mockResolvedValue({
        sources: {
          enabled: true,
          provider: 'tw-legal-rag',
          disclaimer: '免責聲明',
          statutes: [],
          judgments: [],
          references: [],
          literature: [],
          allowedCitations: ['最高法院112年度台上字第9號']
        },
        promptBlock: '見解',
        allowedCitations: ['最高法院112年度台上字第9號'],
        disclaimer: '免責聲明',
        hasCitations: true,
        isExternalRetrievalUsed: true,
        statusMessage: '檢索完畢'
      } as RetrievalResult)
    };

    // AI 虛構了未被授權之裁判字號
    const mockAiProvider = {
      generate: vi.fn().mockResolvedValue({
        text: '參照最高法院999年度台上字第88888號判決之見解，本件不成立侵權責任。'
      })
    };

    const pipeline = new LegalGenerationPipeline(mockRetrievalService, mockAiProvider as any);

    await expect(pipeline.execute({
      ragQuery: '侵權責任',
      buildPrompt: () => '生成答辯'
    })).rejects.toThrow('法律文件引用檢核未通過，拒絕回傳未確認引用文件');
  });

  it('safely uses fallback when AI generation fails, and verifies fallback document', async () => {
    mockRetrievalService = {
      search: vi.fn(),
      retrieveContext: vi.fn().mockResolvedValue({
        sources: {
          enabled: false,
          provider: 'unavailable',
          disclaimer: '免責聲明',
          statutes: [],
          judgments: [],
          references: [],
          literature: [],
          allowedCitations: []
        },
        promptBlock: '無',
        allowedCitations: [],
        disclaimer: '免責聲明',
        hasCitations: false,
        isExternalRetrievalUsed: false,
        statusMessage: '未連線外部檢索'
      } as RetrievalResult)
    };

    const mockAiProvider = {
      generate: vi.fn().mockRejectedValue(new Error('AI 上游服務暫時無法連線'))
    };

    const pipeline = new LegalGenerationPipeline(mockRetrievalService, mockAiProvider as any);

    const result = await pipeline.execute({
      ragQuery: '車禍損害賠償',
      buildPrompt: () => '答辯狀',
      fallback: () => ({
        documentText: '民事答辯狀。被告依民法第184條論述，原告之請求無理由。',
        payload: { isFallback: true }
      })
    });

    expect(result.documentText).toContain('民事答辯狀');
    expect(result.payload).toEqual({ isFallback: true });
    expect(result.antiGhostVerification.verificationPassed).toBe(true);
  });
});
