# SDLC Engine & Governance 深度審查報告 (SDLC_ENGINE_AUDIT.md)

審查日期：2026-09-01
審查範圍：`src/domain/sdlc/`, `src/domain/workflow/`, `src/ai/`, `server/routes/sdlc.ts`, `src/lib/`

---

## 一、審查現況總結 (Executive Summary)

目前系統已具備 6 階段外觀與初階狀態機，但在執行嚴謹度、治理邊界與安全隔離上仍有以下核心問題：
1. **AI 邊界穿透**：`server/routes/sdlc.ts` 直接 `import { GoogleGenAI } from '@google/genai'`，繞過了 `AIProvider` 抽象層。
2. **State Machine 缺乏 Deterministic 防護**：`advanceSdlcStage` 僅根據 index 遞增，缺乏轉移矩陣校驗，無法有效拒絕非法跳關。
3. **Feedback Loop 未受嚴格治理**：`triggerSdlcFeedbackLoop` 允許任意 `fromStage` 到任意 `targetStage`，且未生成不可篡改的 `FeedbackArtifact`。
4. **Gate 缺乏 Prerequisite 實質驗證**：Gate 審核直接透過 API 傳入 `decidedBy: string` 即放行，缺乏身分鑑別（`actorType: HUMAN | AI | SYSTEM`）與必要驗證器（Validator PASS）之硬性阻擋。
5. **Citation Verification 未落實 Fail-Closed**：遇到異常或無法辨識時透過 `console.warn` 放行，未標準化為 `PASS | FAIL | NEEDS_REVIEW`。
6. **未隔離 Execution Mode**：未區分 `REAL | DEMO | MOCK | FALLBACK`，可能導致展示資料被誤標為正式放行。
7. **缺乏真正的 Workflow Orchestrator 與 Repository 抽象**：狀態與業務邏輯混雜在 Express Route 與單一 Map 中。

---

## 二、詳細盤點矩陣 (Audit Matrix)

| 模組 / 項目 | 目前狀態 | 存在之架構 / 安全 / 治理問題 | 改善措施 |
|---|---|---|---|
| **AI Boundary** | 部分完成 | `server/routes/sdlc.ts` 直呼 Gemini SDK | 移除 Route 中的 SDK 直連，由 `AIProvider` 統一調度 |
| **State Machine** | 部分完成 | 缺乏 `stageTransitions.ts` 轉移表，無法阻擋非法躍遷 | 建立 `canTransition()` 與 `assertTransition()`，非合法轉移拋出 `INVALID_STAGE_TRANSITION` |
| **Feedback Loop** | 部分完成 | 任意階段可跳躍回流，無受限政策與工件留存 | 建立 `FeedbackPolicy`，僅允許合法回流路徑（如 Test->Build, Maintain->Plan） |
| **Stage Contract** | 未完成 | 無正式 `StageContract` 介面，缺少 requiredArtifacts 與 requiredValidators | 定義 6 階段完整 Contract 並由 Orchestrator 強制執行 |
| **Gate Enforcement** | 部分完成 | 前端傳入字串即可放行，AI 可冒充 Human，缺少前置檢核 | 建立 `ApprovalContext`，嚴禁 AI 簽核 Human Gate，前置未過強制 `NEEDS_REVIEW` |
| **Permission** | 未完成 | 無後端權限驗證（ANALYST, GENERATOR, APPROVER, DEPLOYER, ADMIN） | 建立 `AuthorizationPolicy`，後端強制執行權限校驗 |
| **Verification** | 部分完成 | 引註檢驗警告後仍放行文稿（Fail Open 漏洞） | 改為 Fail Closed，回傳 `VerificationResult`（PASS/FAIL/NEEDS_REVIEW） |
| **Validator Chain** | 未完成 | 各檢驗分散，無鏈式管道 | 建立 Pipeline：Privacy -> Schema -> Legal -> Citation -> Security |
| **Execution Mode** | 未完成 | 無區分 DEMO 與正式環境 | 新增 `ExecutionMode`，DEMO/MOCK 禁止產生 VERIFIED 或 APPROVED 工件 |
| **Persistence** | 部分完成 | 使用裸 `Map`，缺乏 Repository 介面 | 抽象化 `SdlcProjectRepository` 與 `MemorySdlcProjectRepository` |
| **Orchestrator** | 未完成 | 業務邏輯散落於 Route 中 | 建立 `SdlcOrchestrator` 與 `StageExecutor` 體系 |
| **Audit Event** | 未完成 | 僅有簡單狀態紀錄，無結構化審計日誌 | 建立不可篡改之 `AuditEvent` 追蹤生命週期各項操作 |

---

## 三、治理與安全修復優先級

1. **P0 (Critical)**: AI Boundary 封閉、Gate 放行防護、Citation Fail-Closed。
2. **P0 (Critical)**: State Machine Deterministic 限制與非法轉移阻擋。
3. **P1 (High)**: Authorization Policy、Approval Identity 鑑別。
4. **P1 (High)**: Validator Pipeline、Structured Output Runtime Schema 驗證。
5. **P2 (Medium)**: SdlcOrchestrator、StageExecutors、Repository 抽象化與 AuditEvent。
