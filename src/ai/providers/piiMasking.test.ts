import { describe, expect, it, vi } from 'vitest';
import { maskPii, restorePii, detectPiiKinds } from './piiMasking';
import { withPiiMasking } from './piiMaskingProvider';
import type { AIProvider } from './AIProvider';

/**
 * 送外部 AI 前的個資遮蔽。
 *
 * 實測缺失：使用者在案情描述中輸入真實身分證字號與手機號碼後，
 * 內容原樣送至外部 AI 服務並於回應中重現，沒有任何遮蔽。
 *
 * 但法院書狀依法必須登載當事人身分資料，直接阻擋會讓產品不可用。
 * 因此採「遮蔽 → 送外 → 還原」：外部只看見代號，
 * 本地組裝的書狀仍完整。
 */

describe('個資遮蔽', () => {
  it('身分證字號被遮蔽', () => {
    const { text } = maskPii('我的身分證字號是A123456789。');
    expect(text).not.toContain('A123456789');
    expect(text).toContain('【ID1】');
  });

  it('手機與市話分別編號，不共用佔位符', () => {
    const { text, mapping } = maskPii('手機0912345678，市話02-2375-8888。');
    expect(text).not.toContain('0912345678');
    expect(text).not.toContain('02-2375-8888');
    expect(mapping.entries.map(e => e.kind)).toEqual(expect.arrayContaining(['手機', '市話']));
  });

  it('電子信箱被遮蔽', () => {
    const { text } = maskPii('聯絡信箱 john.doe@example.com。');
    expect(text).not.toContain('john.doe@example.com');
  });

  it('同一值重複出現共用同一佔位符', () => {
    const { text, mapping } = maskPii('A123456789 與 A123456789 相同。');
    expect(mapping.entries).toHaveLength(1);
    expect((text.match(/【ID1】/g) || []).length).toBe(2);
  });

  it('不同值使用不同佔位符', () => {
    const { mapping } = maskPii('A123456789 與 B234567890。');
    expect(mapping.entries).toHaveLength(2);
  });

  it('不含個資的文字原樣通過', () => {
    const 原文 = '被告於民國113年5月1日向原告借款新臺幣三萬元。';
    const { text, mapping } = maskPii(原文);
    expect(text).toBe(原文);
    expect(mapping.entries).toHaveLength(0);
  });

  it('可回報偵測到的個資種類', () => {
    expect(detectPiiKinds('身分證A123456789')).toEqual(['身分證']);
    expect(detectPiiKinds('無個資')).toEqual([]);
  });
});

describe('個資還原', () => {
  it('遮蔽後還原回原文', () => {
    const 原文 = '我的身分證字號是A123456789，手機0912345678。';
    const { text, mapping } = maskPii(原文);
    expect(restorePii(text, mapping)).toBe(原文);
  });

  it('模型改寫佔位符格式後仍能還原', () => {
    // 模型可能把【ID1】寫成 [ID1] 或 (ID1)；還原不得因此失效。
    const { mapping } = maskPii('身分證A123456789');
    for (const 變體 of ['[ID1]', '（ID1）', 'ID1', '【ID1】']) {
      expect(restorePii(`聲稱為 ${變體} 的身分證`, mapping)).toBe('聲稱為 A123456789 的身分證');
    }
  });

  it('無法對應的佔位符保持原樣，不得錯置成其他資料', () => {
    // 寧可讓使用者看到【ID9】，也不要把它還原成別人的身分證字號。
    const { mapping } = maskPii('身分證A123456789');
    expect(restorePii('出現【ID9】這個未知代號', mapping)).toBe('出現【ID9】這個未知代號');
  });

  it('無對照表時原樣回傳', () => {
    expect(restorePii('任意文字', { entries: [] })).toBe('任意文字');
  });
});

describe('供應器包裝層', () => {
  function 假供應器(回應: string, 記錄: string[]): AIProvider {
    return {
      name: 'fake',
      async generate(prompt: string) {
        記錄.push(prompt);
        return { text: 回應 };
      },
      async generateStructured<T>(prompt: string) {
        記錄.push(prompt);
        return { 送出: prompt, 內容: 回應 } as unknown as T;
      },
      async healthCheck() {
        return { ok: true, message: 'ok', model: 'fake' };
      }
    };
  }

  it('送出的提示詞不得含真實個資', async () => {
    const 送出: string[] = [];
    const p = withPiiMasking(假供應器('收到。', 送出));
    await p.generate('原告身分證A123456789，行動電話0912345678。');
    expect(送出[0]).not.toContain('A123456789');
    expect(送出[0]).not.toContain('0912345678');
    expect(送出[0]).toContain('【ID1】');
  });

  it('回應中的佔位符須還原', async () => {
    const 送出: string[] = [];
    const p = withPiiMasking(假供應器('已記錄【ID1】與【手機1】。', 送出));
    const r = await p.generate('身分證A123456789，電話0912345678。');
    expect(r.text).toBe('已記錄A123456789與0912345678。');
  });

  it('結構化輸出中的字串欄位也須還原', async () => {
    const 送出: string[] = [];
    const p = withPiiMasking(假供應器('【ID1】', 送出));

    const r = await p.generateStructured('身分證A123456789', {});
    // 假供應器會回傳遮蔽後的提示詞；還原套用於所有字串欄位，
    // 因此該欄位也會回到原值——這是預期行為：
    // 還原的目的就是讓本地端看到真實資料。
    expect((r as { 送出: string }).送出).toBe('身分證A123456789');
    expect((r as { 內容: string }).內容).toBe('A123456789');
    // 真正送出去的才是遮蔽後內容。
    expect(送出[0]).not.toContain('A123456789');
    expect(送出[0]).toContain('【ID1】');
  });

  it('不含個資時不影響原有輸出', async () => {
    const 送出: string[] = [];
    const p = withPiiMasking(假供應器('正常回應內容', 送出));
    const r = await p.generate('本案爭點為借款返還。');
    expect(送出[0]).toBe('本案爭點為借款返還。');
    expect(r.text).toBe('正常回應內容');
  });

  it('不得影響健康檢查', async () => {
    const p = withPiiMasking(假供應器('', []));
    await expect(p.healthCheck()).resolves.toMatchObject({ ok: true });
  });
});
