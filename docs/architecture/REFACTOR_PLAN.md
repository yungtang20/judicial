# Judicial 一次性深度架構重構執行計畫 (Refactor Plan)
**專案名稱**：Judicial (smart-legal-assistant)  
**目標**：解耦 God Object、抽象 AI Provider、建立 Formal Workflow State Machine、獨立法律治理層、落實 Fail-Closed 引用檢核與清理過時檔案。

---

## 一、重構架構分層藍圖

```
                    ┌─────────────────────────┐
                    │      Presentation       │
                    │   React 19 / Tailwind   │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │    Application Layer    │
                    │ Workflows / Stage Gate  │
                    │ State Machine / Artifact│
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
  │   Domain    │         │  AI Layer   │         │ Security &  │
  │ Legal Rules │         │ Provider &  │         │ Validation  │
  │ Governance  │         │ Generation  │         │ Citations   │
  └─────────────┘         └─────────────┘         └─────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │  Infrastructure Layer   │
                    │ Express Routes / Cheerio│
                    │ Gemini SDK / OpenData   │
                    └─────────────────────────┘
```

---

## 二、階段性執行步驟（Migration Phases）

### Phase 1: 基礎核心與法律治理層整合 (Domain & Governance)
1. **建立 `src/domain/legal/` 目錄結構**：
   - `rules/`：三段論法公理與法條知識庫（`universal-syllogism.ts`）。
   - `governance/`：集中管理 `citationVerifier.ts`、`legalInputPrecheck.ts`、`generatedDocumentPipeline.ts`、`universalTriage.ts`。
   - `registry/`：集中管理 `legalToolRegistry.ts`（單一真實來源）。
2. **建立 Stage Contract & State Machine 型別**：
   - 建立 `src/domain/workflow/types.ts`（定義 `RECEIVED` -> `PRECHECKED` -> `CLASSIFIED` -> `RETRIEVED` -> `ANALYZED` -> `GENERATED` -> `VERIFIED` -> `APPROVED` -> `COMPLETED`）。

### Phase 2: AI Provider 與 Prompt 抽象化 (AI Layer)
1. **建立 `src/ai/providers/`**：
   - `AIProvider.ts`：抽象介面（`generate`, `generateStructured`, `stream`, `healthCheck`）。
   - `GeminiProvider.ts`：專門實作 `@google/genai` 調用與金鑰管理，徹底隔離外部 SDK。
2. **建立 `src/ai/prompts/` 集中治理**：
   - 遷移並版本化管理 `analyze-judgment.ts`、`defense-workflow.ts`、`generate-appeal-petition.ts`、`toolbox-prompts.ts`。
3. **建立 `src/ai/schemas/` 結構化驗證**：
   - 定義法律分析、爭點整理、證據清單與書狀產製的 TypeScript Schemas 與驗證器。

### Phase 3: 後端解耦與解除 `server.ts` God Object (Server & Routes)
1. **拆分 Express 路由至 `server/routes/`**：
   - `analyzeJudgment.ts`：裁判書解析端點。
   - `appeal.ts`：上訴狀產製與案件分析端點。
   - `defense.ts`：答辯分流、自認地雷掃描、雙軌書狀產製端點。
   - `toolbox.ts`：28 項法律工具箱產製與引證檢核端點。
   - `judicial.ts`：司法院裁判書安全爬取與檢索端點。
   - `triage.ts`：全能智慧導診端點。
   - `health.ts`：系統健康檢核與 Provider 狀態端點。
2. **建立 `server/middleware/`**：
   - 安全過濾（Helmet、RateLimiter、SSRF Guard、Error Handler）。
3. **重構 `server.ts`**：
   - 僅保留 Express 實例化、中間件掛載、路由註冊與 Vite 開發伺服器啟動（行數降至 100 行以內）。

### Phase 4: 前端 API 客戶端與工作流整合 (Application & Presentation)
1. **升級 `src/lib/apiClient.ts`**：
   - 嚴格綁定 API Contract 與 TypeScript 型別，統一錯誤結構（`code`, `message`, `requestId`）。
2. **組件連線對接與驗證**：
   - 確保 `SmartAppealAssistant`、`DefenseWorkflowTool`、`LegalToolbox`、`LegalGuideHome` 與 `JudicialOpenDataTool` 均平滑調用新架構。

### Phase 5: 測試套件強化與過時代碼清除 (Tests & Cleanup)
1. **清理根目錄殘餘過時腳本**（`patch_*.sh`, `state_vars.txt`）。
2. **執行回歸測試與單元測試**（`npm run lint`, `npm test`, `npm run build`）。
3. **產出最終架構驗收報告 `docs/architecture/FINAL_REFACTOR_REPORT.md`**。

---

## 三、驗收與通過標準（Definition of Done）

- [x] 完成架構深度審查報告 `docs/architecture/AUDIT.md`
- [x] 完成重構執行計畫書 `docs/architecture/REFACTOR_PLAN.md`
- [ ] `server.ts` 徹底解除 God Object，各 API 路由獨立模組化
- [ ] `AIProvider` 與 `GeminiProvider` 介面完成抽象化，領域層與前端完全不直接碰 SDK
- [ ] 法律治理層（三段論法、Pre-check、Post-check、Citation Verifier）統一收攏
- [ ] 28 項法律工具註冊表成為單一真實來源
- [ ] 全套單元測試與回歸測試 100% 通過（`npm test`）
- [ ] TypeScript 型別檢查零錯誤（`tsc --noEmit`）
- [ ] 正式生產環境編譯打包成功（`npm run build`）
