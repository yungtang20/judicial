import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 用詞一致性約束。
 *
 * 側邊欄已改用「一般民眾答得出來的問句」，但頁面標題與最近使用
 * 仍殘留功能模組名稱（智慧判決分析工作台、全方位實用法務工具箱…）。
 * 使用者從白話選單點進去卻看到陌生名詞，資訊架構的統一就到此中斷。
 *
 * 這是跨檔案的用詞契約，以掃描原始碼鎖住，避免日後新增頁面又用回模組名稱。
 */

/** 只掃描會被使用者看到的元件；測試檔與型別定義不列入。 */
const COMPONENT_DIR = join(process.cwd(), 'src', 'components');

function collectUserFacingFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectUserFacingFiles(full));
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * 模組名稱清單。
 *
 * `SDLC 交付工作台` 不列入：該元件是軟體工程工具，已從使用者介面移除，
 * 僅在開發情境與舊路由標籤中保留，介面上不會出現。
 */
const MODULE_NAMES = [
  '智慧案件分析工作台',
  '智慧判決分析工作台',
  '全方位實用法務工具箱',
  '生活法律導診',
];

describe('使用者可見的用詞', () => {
  it('元件中不得再出現功能模組名稱', () => {
    const offenders: string[] = [];
    for (const file of collectUserFacingFiles(COMPONENT_DIR)) {
      const source = readFileSync(file, 'utf8');
      for (const name of MODULE_NAMES) {
        if (source.includes(name)) {
          offenders.push(`${file.replace(process.cwd() + '\\', '')}: ${name}`);
        }
      }
    }
    expect(offenders, `仍使用模組名稱：\n${offenders.join('\n')}`).toEqual([]);
  });

  it('同一個功能的用詞在各頁一致', () => {
    // 側邊欄是使用者點進去的第一個畫面，
    // 頁面標題必須用同一組說法，否則使用者以為走錯頁。
    const 說法 = '我要自己做一份文件';
    const 相關檔案 = [
      join(COMPONENT_DIR, 'Sidebar.tsx'),
      join(COMPONENT_DIR, 'LitigationWorkspace.tsx'),
      join(COMPONENT_DIR, 'RecentUsage.tsx'),
      join(COMPONENT_DIR, 'toolbox', 'ToolboxHeader.tsx'),
    ];
    for (const file of 相關檔案) {
      const source = readFileSync(file, 'utf8');
      expect(source, `${file} 應使用「${說法}」`).toContain(說法);
    }

    // 不得出現同義但不同的寫法
    for (const file of 相關檔案) {
      const source = readFileSync(file, 'utf8');
      expect(source, `${file} 出現不一致的寫法`).not.toContain('我要做自己的一份文件');
    }
  });

  it('主要入口的三個問句在元件中一致使用', () => {
    const sidebar = readFileSync(join(COMPONENT_DIR, 'Sidebar.tsx'), 'utf8');
    for (const label of ['我遇到問題要處理', '我收到判決書了', '我要自己做一份文件']) {
      expect(sidebar, `側邊欄缺少「${label}」`).toContain(label);
    }

    // 頁面標題必須用同一組說法，否則點進去就換一套說法
    expect(readFileSync(join(COMPONENT_DIR, 'LitigationWorkspace.tsx'), 'utf8'))
      .toContain('我收到判決書了');
    expect(readFileSync(join(COMPONENT_DIR, 'unified', 'UnifiedHeader.tsx'), 'utf8'))
      .toContain('我遇到問題要處理');
  });
});
