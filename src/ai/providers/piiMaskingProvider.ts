import type {
  AIProvider,
  AIProviderGenerateOptions,
  AIProviderResponse
} from './AIProvider.js';
import { maskPii, restorePii } from './piiMasking.js';

/**
 * 個資遮蔽包裝層。
 *
 * 使用者會在案情描述中輸入真實的身分證字號、手機號碼、
 * 電子信箱與市話。這些文字若原樣送到外部 AI 服務，
 * 構成個資法上的資料外傳。
 *
 * 但法院書狀依法必須登載當事人的姓名、身分證字號與地址，
 * 直接在入口阻擋會讓產品無法使用。因此採：
 *   送外部前遮蔽成佔位符 → 外部處理 → 回應後還原
 * 外部服務只看到代號，本地組裝的書狀仍完整。
 *
 * 套用在 Provider 層的好處是所有呼叫路徑一次涵蓋：
 * 辯護分流、判決分析、追問、律師助理、書狀產製全部經過同一收口。
 *
 * 遮蔽是「盡力而為」：模型可能改寫佔位符，還原時對不上的會保持原樣。
 * 這代表遮蔽降低了外傳風險，但不是加密級別的保證。
 * 需要保證時，必須改為自架模型或可簽署的處理協議。
 */
export function withPiiMasking(provider: AIProvider): AIProvider {
  return {
    name: `${provider.name}+piiMasking`,

    async generate(
      prompt: string,
      options?: AIProviderGenerateOptions
    ): Promise<AIProviderResponse> {
      const { text: masked, mapping } = maskPii(prompt);
      const response = await provider.generate(masked, options);
      return {
        ...response,
        text: restorePii(response.text ?? '', mapping),
        data: restoreStructured(response.data, mapping)
      };
    },

    async generateStructured<T = any>(
      prompt: string,
      schema: any,
      options?: AIProviderGenerateOptions
    ): Promise<T> {
      const { text: masked, mapping } = maskPii(prompt);
      const data = await provider.generateStructured<T>(masked, schema, options);
      return restoreStructured(data, mapping) as T;
    },

    healthCheck: () => provider.healthCheck()
  };
}

/** 還原結構化資料中的所有字串欄位。 */
function restoreStructured<T>(value: T, mapping: Parameters<typeof restorePii>[1]): T {
  if (!mapping.entries.length) return value;
  if (typeof value === 'string') return restorePii(value, mapping) as unknown as T;
  if (Array.isArray(value)) {
    return value.map(item => restoreStructured(item, mapping)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = restoreStructured(v, mapping);
    }
    return out as unknown as T;
  }
  return value;
}
