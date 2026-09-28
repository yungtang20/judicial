import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { routeDisplayName, workspaceDisplayName } from '../types/navigationLabels';
import type { AppRoute } from '../types/navigation';

/**
 * 使用者可見名稱的契約。
 *
 * 名稱先前散在 Sidebar、頁面標題、最近使用、工作台頁首四個檔案，
 * 已實際發生過兩次不一致，因此集中到 navigationLabels 並由此測試把關。
 */

const COMPONENT_DIR = join(process.cwd(), 'src', 'components');

function collectComponentFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectComponentFiles(full));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** 功能模組名稱。`SDLC 交付工作台` 不列入：已從使用者介面移除。 */
const MODULE_NAMES = [
  '智慧案件分析工作台',
  '智慧判決分析工作台',
  '全方位實用法務工具箱',
  '生活法律導診',
];

describe('使用者可見名稱', () => {
  it('每個路由都有對應的名稱', () => {
    const routes: AppRoute[] = [
      { view: 'analysis' },
      { view: 'litigation', section: 'guide' },
      { view: 'litigation', section: 'toolbox' },
      { view: 'litigation', section: 'defense' },
      { view: 'litigation', section: 'issues' },
      { view: 'litigation', section: 'evidence' },
      { view: 'appeal', section: 'analysis' },
      { view: 'appeal', section: 'deadline' },
      { view: 'appeal', section: 'defense' },
      { view: 'appeal', section: 'issues' },
      { view: 'appeal', section: 'evidence' },
      { view: 'process-guide' },
      { view: 'agent-chat' },
      { view: 'checker', section: 'anti-ghost' },
    ];
    for (const route of routes) {
      const name = routeDisplayName(route);
      expect(name, `${route.view}/${'section' in route ? route.section : ''} 缺少名稱`).toBeTruthy();
      expect(name, `${route.view} 的名稱仍是模組名稱`).not.toBe(MODULE_NAMES.find((m) => name.includes(m)));
    }
  });

  it('每個工作台階段都有名稱', () => {
    expect(workspaceDisplayName('litigation', 'guide')).toBe('我遇到問題要處理');
    expect(workspaceDisplayName('litigation', 'toolbox')).toBe('我要自己做一份文件');
    expect(workspaceDisplayName('appeal', 'analysis')).toBe('我收到判決書了');
    expect(workspaceDisplayName('appeal', 'deadline')).toBe('還有多少時間可以上訴');
    // legacy 的 'appeal' 等同上訴分析階段，顯示名稱必須一致
    expect(workspaceDisplayName('appeal', 'appeal')).toBe(workspaceDisplayName('appeal', 'analysis'));
  });

  it('情境導診的名稱到處一致', () => {
    // 先前「最近使用」把導診標成「不知道該做什麼」，
    // 與側邊欄的「我遇到問題要處理」不同，使用者會以為是兩個地方。
    const 導診 = routeDisplayName({ view: 'litigation', section: 'guide' });
    expect(導診).toBe(routeDisplayName({ view: 'analysis' }));
    expect(導診).toBe(workspaceDisplayName('litigation', 'guide'));
  });

  it('元件不得自行硬編主要入口名稱', () => {
    // 名稱集中後，元件應該引用模組而不是各自寫死字串，
    // 否則下一個人新增頁面時又會散落出去。
    const 硬編 = ['我遇到問題要處理', '我收到判決書了', '我要自己做一份文件'];
    const offenders: string[] = [];
    for (const file of collectComponentFiles(COMPONENT_DIR)) {
      const source = readFileSync(file, 'utf8');
      // 移除註解後再檢查，註解說明用途是合理的
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      for (const name of 硬編) {
        if (code.includes(`'${name}'`) || code.includes(`「${name}」`)) {
          offenders.push(`${file.replace(process.cwd() + '\\', '')}: ${name}`);
        }
      }
    }
    expect(offenders, `名稱應引用 navigationLabels：\n${offenders.join('\n')}`).toEqual([]);
  });

  it('元件中不得出現功能模組名稱', () => {
    const offenders: string[] = [];
    for (const file of collectComponentFiles(COMPONENT_DIR)) {
      const source = readFileSync(file, 'utf8');
      for (const name of MODULE_NAMES) {
        if (source.includes(name)) offenders.push(`${file.replace(process.cwd() + '\\', '')}: ${name}`);
      }
    }
    expect(offenders, `仍使用模組名稱：\n${offenders.join('\n')}`).toEqual([]);
  });

  it('正式環境不得出現工程工具入口', () => {
    // 專案沒有網址路由，路由只存在於記憶體且初始值為 analysis，
    // 正式環境連路由都到不了；這裡確保介面與掛載都不會誤植回去。
    const appSource = readFileSync(join(process.cwd(), 'src', 'App.tsx'), 'utf8');
    expect(appSource).toContain('import.meta.env.DEV');

    const sidebar = readFileSync(join(COMPONENT_DIR, 'Sidebar.tsx'), 'utf8');
    const block = sidebar.slice(sidebar.indexOf('getDevOnlyEntries'));
    expect(block.slice(0, 300)).toContain('import.meta.env.DEV');
  });
});
