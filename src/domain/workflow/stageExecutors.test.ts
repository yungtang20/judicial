import { describe, expect, it } from 'vitest';
import { PlanStageExecutor, BuildStageExecutor, TestStageExecutor, DeployStageExecutor, MaintainStageExecutor } from './stageExecutors';
import { AIProvider, AIProviderResponse } from '../../ai/providers/AIProvider';
import { SdlcStageId } from '../sdlc/types';

class MockAIProvider implements AIProvider {
  public name = 'MockAIProvider';
  public responseText = 'mock response';
  async generate(): Promise<AIProviderResponse> {
    return { text: this.responseText };
  }
  async generateStructured<T = any>(): Promise<T> {
    return {} as T;
  }
  async healthCheck() {
    return { ok: true, message: 'ok', model: 'mock' };
  }
}

describe('stageExecutors branch coverage', () => {
  describe('PlanStageExecutor', () => {
    it('uses default fallback when input is empty', () => {
      const executor = new PlanStageExecutor();
      const prompt = executor.buildPrompt('', { legalDomain: 'CIVIL' });
      expect(prompt).toContain('無額外補充');
    });

    it('uses fallback legalDomain when context missing', () => {
      const executor = new PlanStageExecutor();
      const prompt = executor.buildPrompt('案件', {});
      expect(prompt).toContain('CIVIL');
    });
  });

  describe('MaintainStageExecutor', () => {
    it('uses input when provided', () => {
      const executor = new MaintainStageExecutor();
      const prompt = executor.buildPrompt('庭審反饋', {});
      expect(prompt).toContain('庭審反饋');
    });

    it('uses fallback when input is empty', () => {
      const executor = new MaintainStageExecutor();
      const prompt = executor.buildPrompt('', {});
      expect(prompt).toContain('開庭審理與裁判反饋');
    });
  });

  describe('BaseStageExecutor FALLBACK mode', () => {
    it('generates simulation output in TEST mode without calling AI', async () => {
      const executor = new TestStageExecutor();
      const result = await executor.execute('測試', {}, new MockAIProvider(), 'MOCK');
      expect(result.executionMode).toBe('MOCK');
      expect(result.artifactContent).toContain('模擬模式');
      expect(result.executionMode).toBeDefined();
    });

    it('returns FALLBACK artifactContent when AI throws in REAL mode', async () => {
      class FailingAI implements AIProvider {
        public name = 'FailingAI';
        async generate(): Promise<AIProviderResponse> { throw new Error('AI down'); }
        async generateStructured<T>() { return {} as T; }
        async healthCheck() { return { ok: false, message: 'down', model: 'fail' }; }
      }

      const executor = new PlanStageExecutor();
      const result = await executor.execute('案件', {}, new FailingAI(), 'REAL');
      expect(result.executionMode).toBe('FALLBACK');
      expect(result.artifactContent).toContain('AI 執行失敗');
    });
  });
});
