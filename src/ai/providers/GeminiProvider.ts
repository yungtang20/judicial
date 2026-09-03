import { GoogleGenAI } from "@google/genai";
import { AIProvider, AIProviderGenerateOptions, AIProviderResponse } from "./AIProvider.js";

export class GeminiProvider implements AIProvider {
  public name = "GeminiProvider";
  private defaultModel = "gemini-2.5-flash";

  private getApiKey(): string | undefined {
    const hasCustomBaseUrl = !!(process.env.GOOGLE_GEMINI_BASE_URL || process.env.GEMINI_BASE_URL);
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.API_KEY;
    if (this.isKeyPlaceholder(key)) {
      if (hasCustomBaseUrl) return "dummy-proxy-key";
      return undefined;
    }
    return key;
  }

  private isKeyPlaceholder(key?: string): boolean {
    if (!key) return true;
    const trimmed = key.trim();
    return (
      trimmed === "" ||
      trimmed === "MY_GEMINI_API_KEY" ||
      trimmed === "YOUR_API_KEY" ||
      trimmed === "placeholder" ||
      trimmed.startsWith("MY_")
    );
  }

  private getClient(): GoogleGenAI | null {
    const key = this.getApiKey();
    if (!key) return null;
    return new GoogleGenAI({ apiKey: key });
  }

  public async generate(prompt: string, options?: AIProviderGenerateOptions): Promise<AIProviderResponse> {
    const client = this.getClient();
    if (!client) {
      throw new Error("GEMINI_API_KEY_UNAVAILABLE");
    }

    const modelName = options?.model || this.defaultModel;
    const contents: any[] = [];

    if (options?.inlineData) {
      contents.push({
        inlineData: {
          mimeType: options.inlineData.mimeType,
          data: options.inlineData.data
        }
      });
    }
    contents.push(prompt);

    const config: any = {};
    if (options?.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }
    if (typeof options?.temperature === "number") {
      config.temperature = options.temperature;
    }
    if (options?.responseMimeType) {
      config.responseMimeType = options.responseMimeType;
    }
    if (options?.responseSchema) {
      config.responseSchema = options.responseSchema;
    }

    const response = await client.models.generateContent({
      model: modelName,
      contents,
      config: Object.keys(config).length > 0 ? config : undefined
    });

    const text = response.text || "";
    return {
      text,
      usage: {
        totalTokens: 0
      }
    };
  }

  public async generateStructured<T = any>(prompt: string, schema: any, options?: AIProviderGenerateOptions): Promise<T> {
    const res = await this.generate(prompt, {
      ...options,
      responseMimeType: "application/json",
      responseSchema: schema
    });

    try {
      const parsed = JSON.parse(res.text);
      return parsed as T;
    } catch (e: any) {
      throw new Error(`STRUCTURED_OUTPUT_PARSE_ERROR: ${e.message}`);
    }
  }

  public async healthCheck(): Promise<{ ok: boolean; message: string; model: string }> {
    const key = this.getApiKey();
    if (!key) {
      return { ok: false, message: "No Gemini API Key provided (Local fallback available)", model: this.defaultModel };
    }
    return { ok: true, message: "Gemini Provider configured", model: this.defaultModel };
  }
}

export const defaultGeminiProvider = new GeminiProvider();
