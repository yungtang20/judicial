import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { containsSimplifiedChinese, describeSimplifiedChinese } from '../lib/traditionalChineseGuard';
import { refineVerifiedDraft, getRefinePrompt } from '../lib/generation/draftRefiner';

/**
 * 每個把模型回覆指派給變數的地方，都必須有對應的繁體中文檢查。
 *
 * 背景：先前防線是逐條路徑手動補的，連續兩輪都在補漏網
 * （漏了共用管線、漏了同一檔案內的其他輸出、漏了路由的 chapter 與 cause）。
 * 原因有二：① 位置選錯（放在單一路徑而非共用樞紐）；
 * ② 清單靠人工列舉，漏一項測試就漏一處。
 *
 * 本測試不使用人工清單，而是從原始碼推導：
 * 找出所有 `<變數> = (response|res|aiRes|generated).text` 的指派，
 * 逐一要求同一個檔案內存在 `containsSimplifiedChinese(<該變數>)`
 * 或該變數流入已把關的共用管線。
 */

const SERVER = path.resolve(__dirname, '../../server');
// 只列「把驗證委派出去」的底層模組。
// 不可列入 traditionalChineseGuard 本身：每個受保護的檔案都會匯入它，
// 那會讓這項檢查對所有檔案都失效（實測踩過這個坑）。
const GUARDED_LIB = ['lib/generation/draftRefiner'];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (entry.endsWith('.ts') && !entry.includes('.test.')) acc.push(full);
  }
  return acc;
}

/**
 * 模型回應物件的讀取（不論是否指派給變數）。
 * 只認 response / res / aiRes / generated / resp 這類物件，
 * 避免把 knowledge-base 的本地資料 .content 一併算進來。
 */
const MODEL_RESPONSE_OBJECTS = '(?:response|res|aiRes|generated|aiResponse|resp)';
// 後接左括號者是 fetch Response 的 res.text()，不是 AI 輸出，排除以免誤判
const MODEL_READ = new RegExp(`${MODEL_RESPONSE_OBJECTS}\\.(?:text|content)\\b(?!\\()`, 'g');
/** 把模型回覆指派給變數的敘述，含直接指派與包在函式引數中的形式 */
// 允許泛型呼叫，例如 RuntimeSchemaValidator.parseAndValidate<any>(aiRes.text, {...})
const MODEL_ASSIGNMENT = new RegExp(
  `(\\w+)\\s*=\\s*(?:${MODEL_RESPONSE_OBJECTS}\\.(?:text|content)\\b|[A-Za-z_][\\w.]*(?:<[^>]*>)?\\([^)]*${MODEL_RESPONSE_OBJECTS}\\.(?:text|content)\\b)`,
  'g'
);
// 直接回傳模型回覆的形式，由呼叫端把關（例：draftRefiner、agentChat 皆走此路徑）
const MODEL_RETURN = new RegExp(`return\\s+${MODEL_RESPONSE_OBJECTS}\\.(?:text|content)\\b`, 'g');
/**
 * 已受保護、但檢查作用在衍生值而非原始變數的情形。
 *
 * 名稱層級的靜態檢查無法追蹤資料流，因此這些必須顯式列出。
 * 列出而非放行：這份清單本身就是需要人檢視的範圍，新增項目時會被看見。
 */
const DERIVED_VALUE_CHECKS: ReadonlyArray<{ file: string; variable: string; checkedAs: string; note: string }> = [
  {
    file: path.join('routes', 'unifiedWorkflow.ts'),
    variable: 'text',
    checkedAs: 'options',
    note: 'text 經 JSON.parse 成 options 陣列後逐項檢查，檢查作用在衍生值上'
  }
];

// 只列「把驗證委派出去」的底層模組。

const serverFiles = walk(SERVER).filter(f => {
  const src = readFileSync(f, 'utf8');
  return /defaultAIProvider\.|generateStructured\(|\.generate\(/.test(src);
});

describe('AI 生成的繁體中文防護覆蓋率', () => {
  it('掃描規則沒有過時：偵測到的指派點應接近模型回覆的讀取總數', () => {
    // 這個掃描器只認得「X = response.text」這種直接指派。
    // 實際上還有 JSON.parse 之類的間接取用，掃描器看不到。
    // 與其讓那些盲點靜默通過，不如讓「規則跟不上實際寫法」明確失敗，
    // 迫使人重新檢視。門檻是讀取總數的九成：低於此代表出現新寫法。
    const readTotal = serverFiles.reduce((sum, f) => {
      const src = readFileSync(f, 'utf8');
      return sum + [...src.matchAll(MODEL_READ)].length;
    }, 0);
    const assignmentTotal = serverFiles.reduce((sum, f) => {
      const src = readFileSync(f, 'utf8');
      return sum
        + [...src.matchAll(MODEL_ASSIGNMENT)].length
        + [...src.matchAll(MODEL_RETURN)].length;
    }, 0);
    expect(
      assignmentTotal,
      `掃描規則可能已過時：偵測到 ${assignmentTotal} 個指派點，` +
      `但模型回覆讀取共 ${readTotal} 處。請檢視是否有新的取用寫法需要納入掃描規則。`
    ).toBeGreaterThanOrEqual(Math.floor(readTotal * 0.9));
  });

  it('每個模型回覆變數都必須有對應的繁體檢查或經由已把關的管線', () => {
    const offenders: string[] = [];
    for (const file of serverFiles) {
      const src = readFileSync(file, 'utf8');
      const usesGuardedPipeline = src.includes('defaultLegalGenerationPipeline');
      const delegatesToGuardedLib = GUARDED_LIB.some(lib => src.includes(lib));
      for (const m of src.matchAll(MODEL_ASSIGNMENT)) {
        const variable = m[1];
        // 檢查該變數是否出現在任何 containsSimplifiedChinese 呼叫的後續內容中。
        // 不限定直接傳入：實務上常見陣列取用與巢狀呼叫，例如
        // containsSimplifiedChinese([result.chapter, result.cause].filter(Boolean).join(''))
        // 因此取呼叫點之後的固定視窗，不用括號配對擷取引數（巢狀括號會截斷）。
        const callSites = [...src.matchAll(/containsSimplifiedChinese\(/g)].map(m => m.index || 0);
        const hasOwnCheck = callSites.some(idx =>
          new RegExp(`\\b${variable}\\b`).test(src.slice(idx, idx + 240))
        );
        if (hasOwnCheck) continue;
        // 已由衍生值檢查涵蓋、但名稱層級連結不到的情形。
        // 明確列出而非一律放行：豁免清單本身就是需要人檢視的範圍。
        if (DERIVED_VALUE_CHECKS.some(d => d.file === path.relative(SERVER, file) && d.variable === variable)) {
          continue;
        }
        if (usesGuardedPipeline || delegatesToGuardedLib) continue;
        offenders.push(`${path.relative(SERVER, file)}: ${variable}`);
      }
    }
    expect(
      offenders,
      `以下模型輸出變數沒有繁體中文檢查：\n${offenders.join('\n')}`
    ).toEqual([]);
  });

  it('每個 AI 端點檔案都必須有繁體中文防護（含經共用管線間接覆蓋）', () => {
    const unprotected = serverFiles.filter(f => {
      const src = readFileSync(f, 'utf8');
      if (src.includes('containsSimplifiedChinese')) return false;
      if (src.includes('defaultLegalGenerationPipeline')) return false;
      return !GUARDED_LIB.some(lib => src.includes(lib));
    });
    expect(
      unprotected.map(f => path.relative(SERVER, f)),
      '這些檔案會呼叫 AI 但沒有繁體中文防護'
    ).toEqual([]);
  });
});

describe('繁體中文閘門的行為', () => {
  it('草稿精修遇到簡體輸出必須拒絕交付', async () => {
    await expect(
      refineVerifiedDraft('原始草稿', '請改得更正式', [], async () => '此时需考量不当得利。')
    ).rejects.toThrow(/簡體中文/);
  });

  it('繁體輸出的草稿精修不受影響', async () => {
    const result = await refineVerifiedDraft(
      '請求返還押金。', '請改得更正式', [], async () => '請求返還押金新臺幣五萬元，並按週年利率百分之三點五計算利息。'
    );
    expect(result.documentText).toContain('新臺幣五萬元');
  });

  it('精修提示詞要求繁體中文且自身不含簡體', () => {
    const prompt = getRefinePrompt('原稿', '請調整', []);
    expect(prompt).toContain('繁體中文');
    expect(containsSimplifiedChinese(prompt)).toBe(false);
  });

  it('本測試自身的繁體檢查仍能辨識簡體', () => {
    // 確認防護函式本身沒壞掉，否則上面的檢查會全部失效
    expect(containsSimplifiedChinese('此时需考量不当得利')).toBe(true);
    // 用真正的簡體字確認防護有效（當是繁體，不應被判為簡體）
    expect(containsSimplifiedChinese('此処经過检查当')).toBe(true);
    expect(containsSimplifiedChinese('此處經過檢查當')).toBe(false);
  });
});

/**
 * 前端與工具模組的文案也會顯示給使用者，必須同樣使用繁體中文。
 *
 * 實測：我在修押金分類時於 universalTriage.ts 寫入「不當得利」
 * 使用了簡體的「当」，而該字會顯示在使用者的時效說明中。
 * 先前的防護只掃 server 目錄，抓不到這類。
 */
const SRC = path.resolve(__dirname, '..');

describe('前端與工具模組的文案用字', () => {
  it('顯示給使用者的中文常值不得含簡體中文', () => {
    const offenders: string[] = [];
    const walkSrc = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        if (['node_modules', 'dist', '__tests__'].includes(entry) || entry.startsWith('.')) continue;
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) { walkSrc(full); continue; }
        if (!/\.(ts|tsx)$/.test(entry) || entry.includes('.test.')) continue;
        const src = readFileSync(full, 'utf8');
        // 排除註解：說明文字可能引用實際觀察到的簡體字
        // CRLF 檔案中 `.` 在 JavaScript 不匹配 `\r`，
        // 因此不以 $ 錨定行尾會剝除不掉行尾註解，先把換行正規化。
        const code = src
          .replace(/\r\n/g, '\n')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .split('\n')
          .map(line => line.replace(/\/\/.*$/, ''))
          .join('\n');
        const literals = [...code.matchAll(/[「"']([^"'「」\r\n]{3,})[」"']/g)].map(m => m[1]);
        const bad = [...new Set(literals)].filter(v => /[\u4e00-\u9fff]/.test(v) && containsSimplifiedChinese(v));
        for (const v of bad) offenders.push(`${path.relative(SRC, full)}: ${v.slice(0, 40)}`);
      }
    };
    walkSrc(SRC);
    expect(offenders, `以下文案含簡體中文，會顯示給使用者：\n${offenders.join('\n')}`).toEqual([]);
  });
});
