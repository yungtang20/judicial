# Smart Legal Assistant

[![CI](https://github.com/yungtang20/judicial/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/yungtang20/judicial/actions/workflows/ci.yml)

面向臺灣使用者的法律情境導診、客觀法理分析與法律文件生成系統。系統協助整理事實、證據、法律爭點與程序風險；不取代律師、法院或其他權責機關的判斷。

## 核心能力

- 白話案情輸入、文件上傳入口與語音輸入 hook。
- 客觀法理分析：三段論、請求權／權利主體分離、構成要件證據狀態與領域適配器。
- **即時法源查核**：法條與裁判均向全國法規資料庫（`law.moj.gov.tw`）與司法院裁判書系統即時查詢；未通過查驗者一律移出主要分析清單，改列於「不可引用」區塊。
- **相關性過濾**：函釋須與案情有實質爭點交集才會顯示，僅條號相同者（如民法第184條對應到物之毀損折舊函釋）不予呈現。
- **模型輸出一致性攔截（fail-closed）**：AI 產生的法律分析若與本機法律規則矛盾（公訴罪被說成準親告、項別與罪名錯置、沿用已廢止的「強姦罪」舊稱），該段分析會被擋下並改以可稽核的違規清單呈現。
- **條件式採證時效**：系統從案情抽取事發日期並與當下時間比對，據以決定輸出「72 小時急迫採證」或「採證窗口已過，改以數位事證為主軸」兩種指引；抽取不到日期時一律採保守（已過期）表述，且使用者可手動覆寫。
- **敏感案件保護面板**：性自主／家暴案件固定載入 113／110／1925 熱線、立即行動與證據保全指引，該內容由本機規則產生，不依賴模型輸出。
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
```

硬性原則：

- 未驗證、引用來源不足或安全檢查失敗時，一律 fail-closed。
- AI 生成的書狀必須通過 `status === 'VERIFIED'` 才視為完成引用查核；canonical 管線產出但尚未查核者一律擋下交付，需人工複核後才解鎖。
- `ghostCitationInterceptor` 會阻擋不在白名單、無效法條或缺少來源雜湊的引用。
- `INSUFFICIENT_EVIDENCE` 會保留可能適用的 claim，標記待補證據，不以刪除法源掩蓋不確定性。
- `standingAnalyzer` 分離通知受領人與適格權利主體，避免把非本人直接當作權利人。
- AI 不得執行 `APPROVE`、`DEPLOY` 或 `ADMIN`；最終法律與部署決策由授權人員負責。沙盒層級另有 `SANDBOX` 角色與獨立稽核紀錄，不得用於上線或系統管理授權。
- 案件切換時舊案的書狀文件、爭點、引用與人工核准紀錄一律保留；只有使用者明確執行「開立新案件」才會清除。
- 系統輸出不是勝訴保證，也不是正式法律意見；重要事實、法條與裁判仍須人工確認。

外部文件檢核器用於檢查對造書狀、外部律師文件、其他 AI 產出或使用者匯入的法律資料。系統自行生成的文件不需要使用者再次手動貼入檢核器，因為生成流程已在交付前經過相同的引用與文件驗證管線。

## 主要模組

| 區域 | 內容 |
| --- | --- |
| `src/lib/mcp/` | MCP 法源 registry、引用白名單與來源證據 |
| `src/lib/reasoning/` | 三段論、權利主體、claim、構成要件與領域適配 |
| `src/lib/generation/` | ghost citation 攔截、草稿生成與微調檢核 |
| `src/lib/forensicGuidance.ts` | 事發日期抽取與條件式採證時效指引 |
| `src/lib/legalAnalysisConsistency.ts` | 模型輸出一致性檢查（fail-closed 攔截） |
| `src/lib/citationRelevance.ts` | 函釋相關性判斷與法條即時查驗判定 |
| `src/lib/finalGate/` | P9 交付閘門與瀏覽器端閘門 |
| `src/lib/reviewer/` | P6 審查與獨立複核 |
| `src/lib/compliance/` | P4 程序合規引擎 |
| `src/lib/caseScenarioEngine.ts` | 案件情境分析與文件 Bundle 生成 |
| `src/lib/generatedDocumentPipeline.ts` | 文件驗證與 P4–P9 交付前檢查 |
| `src/components/dashboard/` | Dashboard、StorytellingInput、FilingGuideModal、DraftRefiner |
| `src/components/unified/` | 統一入口、動態追問、保護面板與分析結果 |
| `server/routes/` | toolbox 生成、Agent Chat、導診與草稿微調 API |
| `data/official-templates/` | 官方範本來源與產物驗證相關資料 |
| `server/knowledge-base/seeds/` | 本機法規與函釋快照（僅供離線檢索參考） |

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

## 正式服務

唯一正式服務網址：[https://judicial-prod.onrender.com/](https://judicial-prod.onrender.com/)

若使用 AI provider 或外部法律檢索服務，請透過環境變數設定；金鑰不得放入前端、README、Git history 或 audit log。Production 必須確認 authentication、CSP、MCP／官方來源連線與 audit persistence 設定，服務不可用時應維持 fail-closed。

## 驗證指令

Windows 執行測試前，請使用 UTF-8 編碼環境，以免繁體中文路徑或測試名稱造成誤判。

```bash
npm run lint          # TypeScript 型別檢查
npm test              # 單元與整合測試
npm run test:eval     # 法治治理回歸
npm run test:ssrf     # 直接驗證 production SSRF exports
npm run test:e2e      # Vitest 案件生命週期 E2E
npm run test:ui:e2e   # Playwright 真實瀏覽器交付 E2E
npm run build         # Vite + esbuild 建置
```

覆蓋率與完整 CI 相關設定請以 `package.json`、`.github/workflows/ci.yml` 及 `docs/architecture/AUDIT.md` 為準。不要以固定測試數字判斷版本狀態，應以當次命令輸出為準。

## Bundle 交付鏈

Dashboard 的文件卡片會復用既有 `/api/toolbox/generate` 路徑，不建立第二條 P9 管線。只有在回應明確通過 P9 且取得 `DOWNLOAD_TEXT` 授權後，前端才允許下載。

正式 Browser E2E 位於：

```text
scripts/bundleDelivery.e2e.spec.ts
playwright.config.ts
```

此測試由獨立 CI job 執行，驗證工具箱交付、P9 fingerprint 防篡改與下載按鈕；fixture response 僅用於前端交付防護測試，不宣稱代替真實法律來源查核。`scripts/bundleDelivery.playwright.py` 保留為 Windows 本機人工工具，不是正式 CI gate。

## 覆蓋率統計範圍

`npm run test:coverage` 的統計範圍包含 `src/lib/` 下的 `finalGate`、`reviewer`、`compliance` 三個 P4–P9 交付閘門目錄，並對 `pleadingExportGate.ts` 與 `pleadingFinalGate.ts` 設定 per-file 門檻（statements 90／lines 90／branches 85／functions 95）。P9 交付路徑不得以「不在統計內」的方式規避覆蓋率要求。

請以當次命令輸出為準判斷版本狀態，不要引用過往報告中的固定數字。

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
