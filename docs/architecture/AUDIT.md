# Judicial 系統架構深度審查報告 (Architecture Audit)
**審查日期**：2026-09-01  
**專案名稱**：Judicial (smart-legal-assistant)  
**執行標準**：一次性深度架構重構規範  

---

## 摘要與核心診斷

本專案經過歷次法律功能擴充，已建立核心資產（包含三段論法規則 UNIVERSAL_SYLLOGISM_RULES、本機法規防虛構檢核 citationVerifier、輸入事前防呆 legalInputPrecheck、產製管線 post-check 驗證 generatedDocumentPipeline 及集中式法律工具註冊表 legalToolRegistry）。

然而，目前程式架構仍存在以下結構性瓶頸：
1. **`server.ts` 承擔單一巨大 God Object 責任**：1290 行的單一檔案混合了 Express 中間件、安全頭、直接調用 `@google/genai`、裁判書 Cheerio 解析爬蟲、後端 Fallback 組裝、全能導診分流、三段論法約束與路由分發。
2. **AI Provider 未抽象化**：直接於路由處理程序中緊密耦合 `@google/genai` 實例與參數，無法替換或進行 Mock / 多模型容錯切換。
3. **缺少正式的 AI Workflow 與 State Machine**：目前依賴各元件的逐步 state（如 stage 1, 2, 3 或 step 1..4），缺乏明確定義的 Stage Contract、Gate 驗證機制與可追溯的 Artifact 狀態機。
4. **前端 Store 職責發散**：`useAppealStore` 同時混合了上訴狀態、爭點列表、證據清單、裁判書文本與暫存資料。
5. **殘留過時腳本與臨時檔案**：根目錄殘存多個 `patch_*.sh` 與過時的維護腳本，易造成維護混亂。

---

## 問題深度剖析（A ~ K 題完整診斷）

### A. 現在架構是什麼？
- **前端 (Presentation)**：React 19 + Tailwind CSS + Lucide Icons + Zustand。包含 `LegalGuideHome` (導診儀表板), `SmartAppealAssistant` (上訴助理), `DefenseWorkflowTool` (答辯攻防), `LegalToolbox` (集中式訴訟工具箱), `JudicialOpenDataTool` (裁判書檢索) 等。
- **後端 (Server API)**：Express 4 (由 `server.ts` 集中處理) + Vite dev server middleware。
- **AI 調用層**：`server.ts` 內部直接初始化 `@google/genai` SDK。
- **領域規則層 (Domain & Governance)**：分散於 `src/lib/` 與 `src/prompts/`。

### B. 每個模組負責什麼？
- `src/lib/citationVerifier.ts`：以本機 Deterministic 正則與法規名稱清單核對法條、釋字、判例字號是否存在與有效。
- `src/lib/legalInputPrecheck.ts`：前端與後端進入 AI 前的事前輸入防呆（檢查是否存在荒謬法條或顯然虛構案號）。
- `src/lib/generatedDocumentPipeline.ts`：產製後的全篇法律引用掃描管線（Fail-closed 檢驗）。
- `src/lib/universalTriage.ts`：全能智慧導診的規則分流與結構化推導。
- `src/lib/legalToolRegistry.ts`：法律工具的集中註冊表，實際數量由 `LEGAL_TOOLS.length` 決定。
- `src/prompts/*`：各訴訟模組之 Prompt 範本與三段論法規則注入。
- `src/components/*`：各訴訟模組的前端視圖與互動邏輯。

### C. 哪些責任混在一起？
- **路由與業務邏輯混合**：`server.ts` 既是 HTTP Router，又直接執行 Cheerio 爬取司法院 HTML、直接組裝 Prompt、直接呼叫 Gemini SDK、直接呼叫 Fallback 產生器。
- **AI 呼叫與驗證混合**：API 端點內部一邊呼叫 AI，一邊自行處理 JSON.parse 異常與文字清洗，缺乏統一的 Structured Output 驗證器。
- **視圖與工作流混合**：前端元件（如 `SmartAppealAssistant.tsx`）多達 2500+ 行，同時負責檔案上傳、PDF 提取、步驟控制、圖表渲染、列印排版與 AI 驗證調用。

### D. 哪些東西應該拆？
1. `server.ts` 必須徹底拆解為 `server/routes/`、`server/middleware/` 與 `server/index.ts`。
2. `@google/genai` 直接調用必須拆出為獨立的 `ai/providers/GeminiProvider.ts` 與 `ai/providers/AIProvider.ts` 介面。
3. 法律治理模組統一收攏至 `domain/legal/governance/`。
4. 訴訟工作流拆分為 `app/workflows/` 並定義明確的 Stage Contract 與 State Machine。
5. 前端巨型 Store 拆分為領域專屬 Store（`appealStore`, `defenseStore`, `documentStore`, `uiStore`）。

### E. 哪些東西應該保留？
- **保留所有核心法律規則與知識庫**：中華民國六法全書、司法院裁判字號正則、三段論法四部結構（UNIVERSAL_SYLLOGISM_RULES）及集中式訴訟工具定義。
- **保留 Pre-check 與 Post-check 檢核管線**：此為防止 AI 幽靈引用的關鍵核心。
- **保留 Fallback 降級系統**：在無 API Key 或網路異常時提供的高品質本機三段論法分析。

### F. 哪些東西應該刪除？
- 根目錄殘留的臨時 Shell 腳本（`patch_*.sh`）。
- 根目錄殘留的臨時狀態文字檔（`state_vars.txt`）。
- 已棄用或過時的功能殘留檔案。

### G. 哪些地方有安全風險？
- **SSRF 風險**：雖然 `server.ts` 目前有白名單限制（`judgment.judicial.gov.tw`），但 URL 爬取邏輯應獨立為專屬的 Safe Crawler 服務，並嚴格限制協定、主機與重新導向。
- **Prompt Injection 風險**：使用者上傳的裁判書或答辯書內容直接拼接進入 Prompt，需確保以明確的隔離標記與 System Policy 分隔，不可覆蓋核心治理指令。
- **個資洩漏 (PII)**：裁判書與書狀在發送至外部 AI 前，應確保通過 `deidentifier.ts` 去識別化處理。

### H. 哪些地方有法律可信度風險？
- 若使用者輸入不存在的法條（例如《民法》第9999條），若未經 Pre-check 攔截，AI 可能順著該條號自行腦補法律效果。
- 必須落實 **Fail-Closed**：凡重要引用無法驗證時，一律標記 `NEEDS_REVIEW`，不得假裝驗證通過。

### I. 哪些地方有 AI 幻覺風險？
- LLM 直接生成全文時可能發明不存在的判決字號。
- 必須透過 `citationVerifier` 與 `generatedDocumentPipeline` 強制執行逐條驗證，並在前端常態展示檢核報告。

### J. 哪些地方會阻礙未來擴充？
- 每新增一項訴訟工具或 API 端點，皆須手動修改 `server.ts`、`apiClient.ts` 與特定元件，容易漏改或產生衝突。
- 透過 Legal Tool Registry 與自動路由註冊，未來新增工具只需宣告定義與 Handler 即可自動載入。

### K. 哪些地方會讓 AI Agent 修改時容易誤傷其他功能？
- 1290 行的 `server.ts` 與 2500 行的 `SmartAppealAssistant.tsx` 檔案過大，編輯時極易引發字串定位失敗或破壞其他路由。拆分為模組化檔案後可徹底根絕此問題。
