#!/usr/bin/env node
/**
 * 部署前驗證：從版控匯出乾淨副本，模擬部署平台的建置與啟動。
 *
 * 為什麼需要這個
 *
 * 先前二十幾輪的「可上線」結論都建立在**開發工作目錄**上：
 * 本機跑得動、render.yaml 設定看似正確、CI 通過。
 * 但開發目錄裡可能有未進版控的檔案、可能有殘留的建置產物、
 * 也可能 .gitignore 排掉了部署時必須存在的資料。
 *
 * 這個腳本改從 `git archive HEAD` 取得**與版控完全相同**的內容，
 * 依 render.yaml 的 buildCommand 與 startCommand 實際建置並啟動，
 * 再以正式環境變數驗證關鍵端點。
 *
 * 它驗證的是「版控中的內容是否自足」，
 * 這與「本機是否跑得動」是兩件事。
 *
 * 用法：node scripts/verify-deployable.mjs
 * 會在 ./tmp 下建立暫存副本，不影響工作目錄。
 */
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const 專案根 = path.resolve(__dirname, '..');
const 副本 = path.join(專案根, 'tmp', 'deployable-check');
const 埠 = Number(process.env.VERIFY_PORT || 3223);

const 執行 = (命令, 選項 = {}) =>
  execSync(命令, { cwd: 選項.cwd || 專案根, encoding: 'utf8', stdio: 'pipe', ...選項 });

const 步驟 = [];
const 記錄 = (名稱, 通過, 細節 = '') => {
  步驟.push({ 名稱, 通過, 細節 });
  console.log(`${通過 ? 'OK  ' : 'FAIL'} ${名稱}${細節 ? '  — ' + 細節 : ''}`);
};

async function 等待健康(基址, 逾時毫秒 = 60000) {
  const 終止 = Date.now() + 逾時毫秒;
  while (Date.now() < 終止) {
    try {
      const r = await fetch(`${基址}/api/health`);
      if (r.ok) return await r.json();
    } catch { /* 尚未就緒 */ }
    await new Promise(r => setTimeout(r, 1000));
  }
  return null;
}

async function 主流程() {
  console.log('=== 部署前驗證：從版控匯出乾淨副本 ===\n');

  // 0. 提示版控的乾淨度。
  // 這是提示而非門檻：新增本腳本或修正後尚未提交時，本來就會有未提交變更。
  // 真正被驗證的是「HEAD 的內容是否自足」，而非工作區。
  try {
    const 狀態 = 執行('git status --porcelain').trim();
    if (狀態.length) {
      console.log(`NOTE 版控有 ${狀態.split('\n').length} 項未提交變更；` +
        '本驗證以 HEAD 為準，未提交內容不影響結果。');
    }
  } catch {
    console.log('NOTE 無法執行 git status，仍將以 HEAD 為準繼續。');
  }

  // 1. 匯出與版控相同的內容
  rmSync(副本, { recursive: true, force: true });
  mkdirSync(副本, { recursive: true });
  const 歸檔 = path.join(專案根, 'tmp', 'head.tar');
  try {
    執行(`git archive HEAD -o "${歸檔}"`);
    執行(`tar -xf "${歸檔}" -C "${副本}"`);
    rmSync(歸檔, { force: true });
    記錄('從版控匯出內容', existsSync(path.join(副本, 'package.json')));
  } catch (e) {
    記錄('從版控匯出內容', false, e.message);
    return;
  }

  // 2. 依 render.yaml 的 buildCommand 安裝依賴
  try {
    執行('npm ci --include=dev', { cwd: 副本, timeout: 900000 });
    記錄('npm ci --include=dev', true);
  } catch (e) {
    記錄('npm ci --include=dev', false, String(e.stdout || e.message).slice(-200));
    return;
  }

  // 3. 依 render.yaml 的 buildCommand 建置
  try {
    執行('npm run build', { cwd: 副本, timeout: 900000 });
    const 產物 = path.join(副本, 'dist', 'server.cjs');
    記錄('npm run build 產出 dist/server.cjs', existsSync(產物),
      existsSync(產物) ? `${Math.round(readFileSync(產物).length / 1024)} KB` : '');
  } catch (e) {
    記錄('npm run build', false, String(e.stdout || e.message).slice(-200));
    return;
  }

  // 4. 以正式環境變數啟動
  const 基址 = `http://127.0.0.1:${埠}`;
  const 環境 = {
    ...process.env,
    NODE_ENV: 'production',
    AI_PROVIDER: process.env.AI_PROVIDER || 'agnes',
    ALLOW_GUEST_MODE: 'true',
    // 僅供本機驗證使用的臨時密鑰；正式環境必須另行設定
    JWT_SECRET: process.env.VERIFY_JWT_SECRET
      || 'DeployCheckOnly_9kR2mN7xL4pQ8vW3tB6yH1cD5fJ0a',
    AGNES_BASE_URL: process.env.AGNES_BASE_URL || 'https://apihub.agnes-ai.com/v1',
    AGNES_MODEL: process.env.AGNES_MODEL || 'agnes-3.0-flash',
    APP_URL: 'https://judicial.onrender.com',
    PORT: String(埠)
  };
  const 子程序 = spawn(process.execPath, ['dist/server.cjs'], {
    cwd: 副本, env: 環境, stdio: 'pipe'
  });
  let 啟動輸出 = '';
  子程序.stdout.on('data', d => { 啟動輸出 += d.toString(); });
  子程序.stderr.on('data', d => { 啟動輸出 += d.toString(); });

  try {
    const 健康 = await 等待健康(基址);
    記錄('正式環境啟動且健康檢查通過', !!健康,
      健康 ? `status=${健康.status} 工具數=${健康.legalToolsCount}` : 啟動輸出.slice(-200));
    if (!健康) return;

    // 5. 訪客認證
    const g = await fetch(`${基址}/api/auth/guest`, { method: 'POST' });
    const gd = await g.json();
    記錄('訪客權杖簽發', g.ok && !!gd.token);

    // 6. 官方法律範本（部署內容是否自足）
    const t = await fetch(`${基址}/api/official-templates`, {
      headers: { Authorization: `Bearer ${gd.token}` }
    });
    const tj = await t.json();
    記錄('範本清單載入', t.ok && tj.totalTemplates > 0, `${tj.totalTemplates} 筆範本`);

    // 7. 範本來源檔是否隨版控部署
    const 範本id = (await (await fetch(`${基址}/api/official-templates?category=${encodeURIComponent((tj.categories || [])[0]?.name || '民事')}`, {
      headers: { Authorization: `Bearer ${gd.token}` }
    })).json()).templates?.[0]?.id;
    if (範本id) {
      const s = await fetch(`${基址}/api/official-templates/${encodeURIComponent(範本id)}/source`, {
        headers: { Authorization: `Bearer ${gd.token}` }
      });
      const buf = Buffer.from(await s.arrayBuffer());
      記錄('範本來源檔可下載', s.ok && buf.length > 0, `${buf.length} bytes`);
    } else {
      記錄('範本來源檔可下載', false, '無法取得範本 id');
    }

    // 8. 首頁
    const 首頁 = await fetch(`${基址}/`);
    const 首頁文字 = await 首頁.text();
    記錄('首頁可載出', 首頁.ok && 首頁文字.includes('<div id="root">'));
  } finally {
    子程序.kill();
    // Windows 上子程序結束前仍佔用檔案，立即清理會 EPERM
    await new Promise(r => {
      子程序.once('exit', r);
      setTimeout(r, 3000);
    });
  }
}

主流程()
  .catch(e => {
    記錄('驗證程序異常', false, e.message);
  })
  .finally(() => {
    console.log('\n=== 結果 ===');
    const 失敗 = 步驟.filter(s => !s.通過);
    console.log(`共 ${步驟.length} 項，失敗 ${失敗.length} 項`);
    if (失敗.length) {
      console.log('\n失敗項目：');
      失敗.forEach(f => console.log(`  - ${f.名稱}${f.細節 ? '：' + f.細節 : ''}`));
    }
    if (!process.env.VERIFY_KEEP) {
      try {
        rmSync(副本, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
      } catch {
        // 清理失敗不影響驗證結論；下次執行會覆寫
        console.log(`NOTE 暫存副本清理失敗，可手動刪除：${副本}`);
      }
    }
    process.exit(失敗.length ? 1 : 0);
  });
