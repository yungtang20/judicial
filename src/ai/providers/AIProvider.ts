/**
 * AI Provider Interface
 * 隔離任何外部 LLM SDK，確保 Domain 與 Application 層完全不直接依賴特定第三方套件
 */

export interface AIProviderGenerateOptions {
  model?: string;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
  responseSchema?: any;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface AIProviderResponse<T = string> {
  text: string;
  data?: T;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  cached?: boolean;
}

export interface AIProvider {
  name: string;
  generate(prompt: string, options?: AIProviderGenerateOptions): Promise<AIProviderResponse>;
  generateStructured<T = any>(prompt: string, schema: any, options?: AIProviderGenerateOptions): Promise<T>;
  healthCheck(): Promise<{ ok: boolean; message: string; model: string }>;
}
