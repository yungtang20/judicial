import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { buildIndex, extractFirstZipEntry, isRepealedText } from './officialStatuteIndex';

/**
 * 條文原文必須提供給模型，不能只確認「這一條存在」。
 *
 * 實測缺陷：助理只注入「民法第479條：存在（已由全國法規資料庫確認）」，
 * 模型於是自行編造內容——把第479條答成「無權代理之追認效力」，
 * 另一次答成「因侵權行為對物生損害者，得請求回復原狀」。
 * 官方文本是「借用人不能以種類、品質、數量相同之物返還者，
 * 應以其物在返還時、返還地所應有之價值償還之」。
 *
 * 確認存在卻給不出內容，等於核發一張「這條是真的」的空頭支票。
 * 使用者看到 AI 引用該條，更容易當真，危害比直接說查不到更大。
 *
 * 另外：官方資料以「（刪除）」標示已廢止的條文（全體 1,019 筆）。
 * 條號存在不代表是現行法——民訴法第630條就是如此。
 * 當成現行條文提供，等於建議使用者引用一條已不存在的規定。
 */

const 快取路徑 = 'tmp/law.json';
const 有官方資料 = existsSync(快取路徑);

function 載入索引() {
  const json = extractFirstZipEntry(readFileSync(快取路徑)).toString('utf8');
  return buildIndex(JSON.parse(json.charCodeAt(0) === 0xfeff ? json.slice(1) : json));
}

describe('已廢止條文的判斷', () => {
  it.each(['（刪除）', '(刪除)', '（已廢止）', '（已删除）'])('「%s」須判定為已廢止', (標記) => {
    expect(isRepealedText(標記)).toBe(true);
  });

  it('正常條文不得被誤判為廢止', () => {
    expect(isRepealedText('借用人不能以種類、品質、數量相同之物返還者。')).toBe(false);
    // 條文中間出現「刪除」二字不代表整條已廢止
    expect(isRepealedText('當事人得請求刪除不實之記載。')).toBe(false);
  });

  it('查不到條文時不得誤判為廢止', () => {
    expect(isRepealedText(undefined)).toBe(false);
    expect(isRepealedText('')).toBe(false);
  });
});

// 官方資料是 6MB 的外部下載；測試套件不應依賴它。
const 官方資料測試 = 有官方資料 ? describe : describe.skip;

官方資料測試('條文原文的取得（需官方資料）', () => {
  it('民法第479條的官方文本是借用人返還價值補償', () => {
    // 這是先前被模型答錯的那一條。用它鎖住正確內容。
    const idx = 載入索引();
    const 條文 = idx.articleText('民法', 479);
    expect(條文).toBeTruthy();
    expect(條文).toContain('借用人');
    expect(條文).not.toContain('無權代理');
  });

  it('已廢止的條文仍能取出，但必須被標示為廢止', () => {
    // 民事訴訟法第630條：條號存在、內容為「（刪除）」。
    const idx = 載入索引();
    expect(idx.verify('民事訴訟法', 630)).toBe('EXISTS');
    expect(isRepealedText(idx.articleText('民事訴訟法', 630))).toBe(true);
  });

  it('查不到的條文回傳 undefined，不得給出空字串冒充內容', () => {
    const idx = 載入索引();
    expect(idx.articleText('民法', 9999)).toBeUndefined();
  });
});

describe('助理必須注入條文原文', () => {
  it('不得只注入存在與否', () => {
    // 以原始碼層面鎖住：先前只寫了「存在（已由全國法規資料庫確認）」，
    // 模型因此自行編造內容。
    const 源碼 = readFileSync('server/services/agentChat.ts', 'utf8');
    expect(源碼).toContain('articleText(');
    expect(源碼).toContain('條文原文');
    // 舊的、只確認存在就交付的寫法不得保留
    expect(源碼).not.toContain("存在（已由全國法規資料庫確認）");
  });

  it('已廢止條文不得當成現行法提供', () => {
    const 源碼 = readFileSync('server/services/agentChat.ts', 'utf8');
    expect(源碼).toContain('isRepealedText');
    expect(源碼).toContain('已廢止');
  });
});
