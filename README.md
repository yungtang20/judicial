# Smart Legal Assistant

面向臺灣使用者的法律情境導診、客觀法理分析與法律文件生成系統。系統協助整理事實、證據、法律爭點與程序風險；不取代律師、法院或其他權責機關的判斷。

## 核心能力

- 白話案情輸入、文件上傳入口與語音輸入 hook。
- 客觀法理分析：三段論、請求權／權利主體分離、構成要件證據狀態與領域適配器。
- 法規、裁判與函釋的受控引用；未經查核的引用不得進入交付文件。
- 案件 Dashboard：安全資源、白話摘要、證據清單、文件組合包、立案指引與進階底稿。
- Draft Refiner：在既有白名單範圍內微調草稿，微調後重新執行引用檢核。
- 官方書狀範本、格式檢查、程序合規與 P4–P9 文件交付管線。

## 安全與治理邊界

所有法律文件均須通過下列單一路徑：

```text
案情／導診
  → 法律分析與受控引用
  → ghost citation 攔截
  → executeCanonicalPleadingPipeline
  → P4 Compliance
  → P6 Reviewer
  → P8 Re-review
  → P9 Final Gate
  → 授權後下載
```

硬性原則：

- 未驗證、引用來源不足或安全檢查失敗時，一律 fail-closed。
- `ghostCitationInterceptor` 會阻擋不在白名單、無效法條或缺少來源雜湊的引用。
- `INSUFFICIENT_EVIDENCE` 會保留可能適用的 claim，標記待補證據，不以刪除法源掩蓋不確定性。
- `standingAnalyzer` 分離通知受領人與適格權利主體，避免把非本人直接當作權利人。
- AI 不得執行 `APPROVE`、`DEPLOY` 或 `ADMIN`；最終法律與部署決策由授權人員負責。
- 系統輸出不是勝訴保證，也不是正式法律意見；重要事實、法條與裁判仍須人工確認。

外部文件檢核器用於檢查對造書狀、外部律師文件、其他 AI 產出或使用者匯入的法律資料。系統自行生成的文件不需要使用者再次手動貼入檢核器，因為生成流程已在交付前經過相同的引用與文件驗證管線。

## 主要模組

| 區域 | 內容 |
| --- | --- |
| `src/lib/mcp/` | MCP 法源 registry、引用白名單與來源證據 |
| `src/lib/reasoning/` | 三段論、權利主體、claim、構成要件與領域適配 |
| `src/lib/generation/` | ghost citation 攔截、草稿生成與微調檢核 |
| `src/lib/caseScenarioEngine.ts` | 案件情境分析與文件 Bundle 生成 |
| `src/lib/generatedDocumentPipeline.ts` | 文件驗證與 P4–P9 交付前檢查 |
| `src/components/dashboard/` | Dashboard、StorytellingInput、FilingGuideModal、DraftRefiner |
| `server/routes/` | toolbox 生成、Agent Chat、導診與草稿微調 API |
| `official-template/` | 官方範本來源與產物驗證相關檔案 |

完整模組邊界與資料流請見 [`ARCHITECTURE.md`](ARCHITECTURE.md)。

## 本機啟動

需求：Node.js `>=22.23.2 <23`。

```bash
npm install
npm run dev
```

開發伺服器啟動後，依終端機顯示的網址開啟瀏覽器。Production 建置：

```bash
npm run build
npm start
```

若使用 AI provider 或外部法律檢索服務，請透過環境變數設定；金鑰不得放入前端、README、Git history 或 audit log。Production 必須確認 authentication、CSP、MCP／官方來源連線與 audit persistence 設定，服務不可用時應維持 fail-closed。

## 驗證指令

Windows 執行測試前，請使用 UTF-8 編碼環境，以免繁體中文路徑或測試名稱造成誤判。

```bash
npm run lint          # TypeScript 型別檢查
npm test              # 單元與整合測試
npm run test:eval     # 法治治理回歸
npm run test:ssrf     # SSRF 防禦
npm run test:e2e      # Playwright／生命週期 E2E 測試
npm run build         # Vite + esbuild 建置
```

覆蓋率與完整 CI 相關設定請以 `package.json`、`.github/workflows/ci.yml` 及 `docs/architecture/AUDIT.md` 為準。不要以固定測試數字判斷版本狀態，應以當次命令輸出為準。

## Bundle 交付鏈

Dashboard 的文件卡片會復用既有 `/api/toolbox/generate` 路徑，不建立第二條 P9 管線。只有在回應明確通過 P9 且取得 `DOWNLOAD_TEXT` 授權後，前端才允許下載。

Bundle 交付的瀏覽器／後端驗證工具位於：

```text
scripts/bundleDelivery.playwright.py
```

此工具可驗證真實 server 的 Bundle → canonical P4–P9 → 下載與 P9 未授權時禁止下載；導診輸入若使用 fixture，必須在報告中明確標示。

## 上線 Gate

上線前必須由授權人員在本機或 staging 執行 [`SMOKE_TEST.md`](SMOKE_TEST.md) 的五項人工情境：

1. 債務案件：Dashboard → Bundle → `/api/toolbox/generate` → P4–P9 → 下載。
2. 催收張貼：顯示 `SUBJECT_MISMATCH` 並保留適格主體分離結果。
3. 家暴／性騷／立即危險：`SafetyAndResourcePanel` 置頂。
4. 逾期上訴：顯示紅色逾期與不變期間警告。
5. Draft Refiner：新增未白名單法條時回傳 `GHOST_CITATION_BLOCKED`，不得更新或下載。

任何 `UNKNOWN`、P9 失敗、MCP 不可用或人工情境未驗證，均停止部署並交由人工決定。AI 不得代替人工 `APPROVE` 或 `DEPLOY`。

## 相關文件

- [`ARCHITECTURE.md`](ARCHITECTURE.md)：系統架構、模組與安全原則。
- [`SMOKE_TEST.md`](SMOKE_TEST.md)：staging／production 前人工驗收標準。
- [`AGENTS.md`](AGENTS.md)：開發、測試、Git 與治理規則。
- [`docs/architecture/AUDIT.md`](docs/architecture/AUDIT.md)：架構與 CI 審查資料。
- [`docs/governance/LEGAL_GOVERNANCE.md`](docs/governance/LEGAL_GOVERNANCE.md)：法律文件生成治理規範。
