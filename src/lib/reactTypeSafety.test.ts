import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

/**
 * React 型別定義必須存在，且 UI 層必須真的受型別檢查保護。
 *
 * 實測：`@types/react` 未安裝。React 19 不再隨包附帶型別，
 * 而 `React.FC<Props>` 在缺少型別時不約束 props，解構出的 props 一律是 any
 * ——**整個 UI 層沒有任何型別檢查**。
 *
 * 後果是實測中最嚴重的可用性缺陷得以存在：
 * 防禦分流元件存取兩個不存在的欄位，render 時拋出例外，
 * 專案又沒有錯誤邊界，於是整個應用變成空白畫面。
 * tsc 全程沒有任何反應。
 *
 * 這裡把「型別檢查確實有效」變成可驗證的對象，
 * 而不再只是相信 `tsc` 通過就算數。
 */
const 專案根 = path.resolve(__dirname, '..', '..');
const SRC = path.resolve(__dirname, '..');

describe('React 型別定義不得缺失', () => {
  it('@types/react 必須宣告為開發依賴', () => {
    const pkg = JSON.parse(readFileSync(path.join(專案根, 'package.json'), 'utf8'));
    const 宣告 = pkg.devDependencies?.['@types/react'] ?? pkg.dependencies?.['@types/react'];
    expect(宣告, 'package.json 未宣告 @types/react——UI 層將失去型別檢查').toBeTruthy();
  });

  it('@types/react-dom 必須宣告為開發依賴', () => {
    const pkg = JSON.parse(readFileSync(path.join(專案根, 'package.json'), 'utf8'));
    const 宣告 = pkg.devDependencies?.['@types/react-dom'] ?? pkg.dependencies?.['@types/react-dom'];
    expect(宣告, 'package.json 未宣告 @types/react-dom').toBeTruthy();
  });

  it('@types/react 必須實際安裝於 node_modules', () => {
    const 路徑 = path.join(專案根, 'node_modules', '@types', 'react');
    expect(existsSync(路徑), 'node_modules/@types/react 不存在——請執行 npm ci').toBe(true);
    expect(existsSync(path.join(路徑, 'package.json'))).toBe(true);
  });

  it('tsconfig 必須納入 src 與 server（不得整個排除 UI 層）', () => {
    const tsconfig = readFileSync(path.join(專案根, 'tsconfig.json'), 'utf8');
    expect(tsconfig).not.toMatch(/"exclude":[^]]*"src"/);
    expect(tsconfig).not.toMatch(/"exclude":[^]]*"server"/);
  });
});

describe('UI 層的 props 不得以 any 掩蓋欄位錯誤', () => {
  function 收集(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      if (['node_modules', 'dist', '__tests__'].includes(entry) || entry.startsWith('.')) continue;
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) 收集(full, acc);
      else if (/\.tsx$/.test(entry) && !entry.includes('.test.')) acc.push(full);
    }
    return acc;
  }

  it('元件的 props 不得宣告為 any', () => {
    const 違規: string[] = [];
    for (const 檔 of 收集(SRC)) {
      const src = readFileSync(檔, 'utf8');
      // 只針對 props 型別本身；單值的窄化轉型另有一條規則處理。
      const 樣式 = /(?:props|Props)\s*:\s*any\b/g;
      if (樣式.test(src)) 違規.push(path.relative(SRC, 檔));
    }
    expect(違規, `以下元件以 any 宣告 props，欄位錯誤將無法被型別檢查發現：\n${違規.join('\n')}`).toEqual([]);
  });

  it('設定狀態時不得以 as any 繞過列舉型別', () => {
    // 實測：法理流程引導以 `rel.id as any` 呼叫 setRelationship，
    // 使關係人選項與狀態型別脫鉤——這正是先前「預設為配偶」
    // 與欄位不一致等問題得以長期存在、卻沒有被型別檢查發現的原因。
    const 違規: string[] = [];
    for (const 檔 of 收集(SRC)) {
      const src = readFileSync(檔, 'utf8');
      const 樣式 = /set[A-Z]\w*\([^)]*\bas\s+any\b/g;
      const 命中 = [...src.matchAll(樣式)];
      if (命中.length > 0) {
        違規.push(`${path.relative(SRC, 檔)}（${命中.length} 處）`);
      }
    }
    expect(違規, `以下位置以 as any 繞過狀態型別，型別檢查形同失效：\n${違規.join('\n')}`).toEqual([]);
  });
});

describe('全域錯誤邊界必須存在', () => {
  it('應用根必須以 ErrorBoundary 包覆', () => {
    const main = readFileSync(path.join(SRC, 'main.tsx'), 'utf8');
    expect(main, 'main.tsx 未使用 ErrorBoundary——任一元件拋錯會使整頁空白')
      .toMatch(/<ErrorBoundary/);
    expect(main).toMatch(/import\s+ErrorBoundary/);
  });

  it('ErrorBoundary 必須實作 React 的錯誤邊界契約', () => {
    const src = readFileSync(path.join(SRC, 'components', 'ErrorBoundary.tsx'), 'utf8');
    expect(src).toMatch(/static\s+getDerivedStateFromError/);
    expect(src).toMatch(/componentDidCatch/);
    // 必須提供可操作的復原路徑，而非只顯示空白
    expect(src).toMatch(/重試|重新載入/);
  });

  it('不得有元件在無保護的情況下直接對可能缺漏的欄位取長度', () => {
    // 以實際案例為準：triageResult.extractedFacts 曾讓整個應用崩潰
    const 檔 = path.join(SRC, 'components', 'defense', 'Stage2Triage.tsx');
    const src = readFileSync(檔, 'utf8');
    expect(src, '不得存取 DefenseTriageResult 上不存在的 extractedFacts')
      .not.toMatch(/triageResult\.extractedFacts/);
    expect(src, '不得存取 DefenseTriageResult 上不存在的 evidenceRequirements')
      .not.toMatch(/triageResult\.evidenceRequirements/);
  });
});
