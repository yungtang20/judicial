# Judicial 現行架構稽核

稽核日期：2026-09-09

適用版本：以本文件所在 commit 為準

## 系統圖

本專案是 React 19／Vite 前端與 Express 後端組成的臺灣法律輔助系統。核心原則是：AI 只負責產生候選內容，授權、引用、隱私、租戶與交付門禁由確定性程式碼控制。

```text
React UI
  -> src/lib/apiClient.ts
  -> server/index.ts + server/routes/*
  -> server/services/legalGenerationPipeline.ts
  -> src/ai/providers/AIProvider.ts
  -> GeminiProvider | OpenAICompatibleProvider

Legal generation result
  -> input precheck
  -> generated-document verification
  -> citation / privacy / security gates
  -> PASS | NEEDS_REVIEW | FAIL
```

## 現行模組邊界

| 邊界 | Source of truth | 責任 |
|---|---|---|
| HTTP composition | `server/index.ts` | 組裝 middleware 與 routes，不包含各端點業務邏輯 |
| Routes | `server/routes/` | 驗證 HTTP 輸入、呼叫 service、映射回應與錯誤 |
| AI providers | `src/ai/providers/` | 統一 `AIProvider` 契約；provider URL 與 key 只由 server environment 提供 |
| Legal generation | `server/services/legalGenerationPipeline.ts` | 前置檢查、生成、fallback 與產後驗證的共同管線 |
| Workflow domain | `src/domain/workflow/`、`src/domain/sdlc/` | deterministic state machine、stage contract、RBAC、Human Gate、audit event |
| Citation trust | `src/lib/citationVerifier.ts`、`server/services/officialCitationVerification.ts` | 本機 heuristic 與官方來源證據分離；失敗時 fail-closed |
| Tenant/auth | `server/middleware/auth.ts`、`tenantIsolation.ts` | Bearer/API key 驗證、tenant context 與跨租戶阻擋 |
| UI tool registry | `src/lib/legalToolRegistry.ts`、`toolFieldSchemas.ts` | 工具 metadata 與資料驅動表單 schema |

## 已落實的架構控制

- `server.ts` 只負責啟動；Express 組裝位於 `server/index.ts`，端點位於 `server/routes/`。
- AI 呼叫透過 typed `AIProvider`，server routes 與 UI 不直接持有 provider secret。
- 法律文件必須經共同驗證管線；未驗證引用、AI 失敗或官方查證失敗不得冒充通過。
- AI actor 無權執行 `APPROVE`、`DEPLOY` 或 `ADMIN`；Human Gate 與狀態轉移由 domain policy 驗證。
- Production authentication 與 CSP 為 enforce-by-default；tenant isolation、PII 清洗及 SSRF 有對抗測試。
- 測試中的 audit persistence 使用 `:memory:`，避免測試污染 repository SQLite。

## 已知熱點與邊界

以下是維護性熱點，不等同已證明的功能錯誤。拆分前必須先建立 characterization test，且一次只處理一個 coherent responsibility：

- `src/utils/toolboxFallbacks.ts`：大量工具 fallback 文案與規則，適合依工具群組抽出純資料／builder。
- `src/hooks/useSmartAppealAssistant.ts`：上訴流程 orchestration、遠端請求與 UI state 集中。
- `src/components/LegalProcessGuide.tsx`、`LegalGuideHome.tsx`：多個視圖區塊與 modal 串接。
- `src/lib/toolFieldSchemas.ts`：資料量大但邏輯低；優先以 registry/schema 完整性測試管理，而非為縮短行數任意拆檔。
- `src/lib/citationVerifier.ts`、`universalTriage.ts`：法律規則密集；任何拆分不得改變 fail-closed 結果。

## 不可跨越的信任邊界

1. 外部 AI/RAG 回應不是官方法律證據。
2. 本機引用索引命中不等同官方核實。
3. 官方服務查無資料、逾時或格式異常必須是 `NEEDS_REVIEW`／`UNKNOWN`，不得轉成 verified。
4. 未經使用者明確操作，不持久化法律文件全文或憑證。
5. Render 未配置 durable storage 時，SQLite audit 只屬短期診斷資料。

## 可重現驗證

```bash
npm run lint
npm test
npm run test:coverage
npm run test:eval
npm run test:e2e
npm run test:ssrf
npm run build
```

本文件描述架構，不替代當次測試結果、部署狀態或 `docs/quality/QUALITY_SCORECARD.md` 的 evidence ledger。
