export interface GenerateResult {
  text: string;
  modelUsed: string;
}

export interface GenerateOptions {
  models?: string[];
  sleep?: (milliseconds: number) => Promise<void>;
}

const DEFAULT_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash'
];

export async function generateContentWithFallback(
  ai: any,
  contents: any,
  useSearch = true,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const models = options.models || DEFAULT_MODELS;
  const sleep = options.sleep || ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  let lastError: any = null;

  if (useSearch) {
    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: { tools: [{ googleSearch: {} }] }
        });
        if (response?.text) return { text: response.text, modelUsed: `${model} (Search Grounded)` };
      } catch (error) {
        lastError = error;
        if (/Quota exceeded|RESOURCE_EXHAUSTED|429/i.test(error?.message || String(error))) break;
      }
    }
  }

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({ model, contents, config: {} });
        if (response?.text) return { text: response.text, modelUsed: model };
      } catch (error) {
        lastError = error;
        const errorMessage = error?.message || String(error);
        if (/Quota exceeded|RESOURCE_EXHAUSTED|429/i.test(errorMessage)) break;
        if (/503|UNAVAILABLE|high demand|overloaded/i.test(errorMessage) && attempt === 1) {
          await sleep(600);
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error('Gemini API generateContent 呼叫失敗且無可用模型');
}
