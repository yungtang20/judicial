# SDLC Engine & Governance 重構執行計畫書 (SDLC_ENGINE_REFACTOR_PLAN.md)

本計畫書嚴格遵循 10 個階段依序執行，每完成一階段即執行型別與測試驗證。

---

## 執行階段與任務分解

### Phase 1: AI Boundary 邊界隔離
- 移除 `server/routes/sdlc.ts` 中之 `@google/genai` 引用。
- 所有 AI 交互轉移至 Application / Domain 呼叫 `AIProvider`。
- 嚴格隔離 Route 職責：僅負責 HTTP 請求解析、輸入驗證、委派 Application Orchestrator 與回傳。

### Phase 2: Deterministic State Machine
- 建立 `src/domain/workflow/stageTransitions.ts`。
- 定義明確轉移矩陣：
  - `01_plan` ➔ `02_design`
  - `02_design` ➔ `03_build`
  - `03_build` ➔ `04_test`
  - `04_test` ➔ `05_deploy`
  - `05_deploy` ➔ `06_maintain`
- 實作 `canTransition()`、`assertTransition()`，非法轉移拋出 `INVALID_STAGE_TRANSITION`。

### Phase 3: Stage Contract & Feedback Policy
- 建立 `src/domain/workflow/stageContracts.ts`：定義各 Stage 的 requiredArtifacts、requiredValidators、requiredApproval。
- 建立 `src/domain/workflow/feedbackPolicy.ts`：定義合法回流路徑（如 `04_test` ➔ `03_build`, `04_test` ➔ `02_design`, `06_maintain` ➔ `01_plan`, `06_maintain` ➔ `02_design`），產出不可篡改之 `FeedbackArtifact`。

### Phase 4: Gate Enforcement & Approval Identity
- 建立 `ApprovalContext`（actorId, actorType: HUMAN | AI | SYSTEM, role, timestamp）。
- 嚴格規則：AI 不得批准 Human Gate；Gate 評估時強制驗證前置條件（前置工件齊全、必要 Validator 全部 PASS）。未達成時強制回傳 `NEEDS_REVIEW` 或 `REJECTED`。

### Phase 5: Permission & Authorization Policy
- 建立 `src/domain/workflow/authorization.ts`。
- 定義 Permission：`READ`, `ANALYZE`, `GENERATE`, `VERIFY`, `APPROVE`, `DEPLOY`, `ADMIN`。
- 定義 Role：`ANALYST`, `GENERATOR`, `VERIFIER`, `APPROVER`, `DEPLOYER`, `ADMIN`。
- 在後端 Orchestrator 進行操作前強制鑑權。

### Phase 6: Fail-Closed Verification & Validator Chain
- 建立標準化 `VerificationResult`（status: `PASS` | `FAIL` | `NEEDS_REVIEW`）。
- 建立 Validator Pipeline：`PrivacyValidator`, `SchemaValidator`, `LegalValidator`, `CitationValidator`, `SecurityValidator`。
- 升級 Citation 檢驗為 Fail Closed：驗證失敗或未知時禁止標記為 Verified，禁止在失敗後將未驗證文稿當作正常文稿輸出。

### Phase 7: Persistence & Repository Abstraction
- 建立 `src/domain/workflow/repository.ts`：定義 `SdlcProjectRepository`。
- 實作 `MemorySdlcProjectRepository` 支援完整狀態儲存、檢索與測試隔離。

### Phase 8: Workflow Orchestrator & Stage Executors
- 建立 `src/domain/workflow/sdlcOrchestrator.ts`。
- 實作 `StageExecutor` 模式（Plan, Design, Build, Test, Deploy, Maintain）。
- 建立 `AuditEvent` 審計日誌機制。
- 標註 `ExecutionMode`（`REAL`, `DEMO`, `MOCK`, `FALLBACK`），非正式模式禁止發行 `PRODUCTION_VERIFIED`。

### Phase 9: 全面測試套件
- 單元測試：State Machine、Feedback Policy、Gate Enforcement、Citation Fail-Closed、Permission、Schema Validation、Security。
- 整合測試：完整 6 階段流程測試、Fail Closed 阻擋測試、AI 冒充批准拒絕測試。
- 架構邊界測試：確保 Domain / Frontend / Route 無違規引用。

### Phase 10: 文件更新與驗收報告
- 更新各項架構與治理文件。
- 執行完整驗證並產出 `docs/architecture/SDLC_ENGINE_FINAL_REPORT.md`。
