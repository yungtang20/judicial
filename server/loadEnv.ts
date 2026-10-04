/**
 * 啟動期環境變數載入。
 *
 * 必須是 server.ts 的「第一個 import」——ESM 會依宣告順序求值所有 import，
 * 而 dotenv 若寫在 server.ts 的模組本文（statement）裡，會晚於
 * ./server/index.js 的 import 鏈執行完畢。
 *
 * 這不是理論問題而是實測結果：
 *   - server/index.js → routes/health.js → providerRegistry.js
 *     會在 module body 求值時就呼叫 createConfiguredAIProvider()，
 *     當下 process.env.AI_PROVIDER 仍是 undefined，於是走 || 'gemini'
 *     選中 GeminiProvider。症狀是靜默的：/api/health 的 model 是
 *     getter（呼叫時才讀 env）所以顯示正常，但實際 generate() 走的是
 *     Gemini，使用者拿到 60 秒後的降級內容而非 AI 分析。
 *
 * 宣告成獨立模組並放在 import 清單第一位，dotenv.config() 就一定
 * 在 providerRegistry 建構之前完成，且不需改動 providerRegistry 的求值時機。
 */
import dotenv from "dotenv";

process.env.DOTENV_CONFIG_QUIET = "true";

const 原始log = console.log;
const 原始warn = console.warn;
console.log = () => {};
console.warn = () => {};
dotenv.config({ quiet: true });
console.log = 原始log;
console.warn = 原始warn;

// 清理無效的 BASE_URL 金鑰字串
const rawBaseUrl = process.env.GOOGLE_GEMINI_BASE_URL || process.env.GEMINI_BASE_URL;
if (rawBaseUrl && !rawBaseUrl.startsWith("http://") && !rawBaseUrl.startsWith("https://")) {
  console.log(`[Gemini Env] 清理無效的 BASE_URL 字串`);
  delete process.env.GOOGLE_GEMINI_BASE_URL;
  delete process.env.GEMINI_BASE_URL;
}