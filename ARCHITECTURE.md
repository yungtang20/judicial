# Judicial AI - 主動型法律代理人架構藍圖

## 專案願景

將 `judicial` 從被動法律表單工具箱逐步升級為主動型法律代理人。系統必須具備防幽靈法源、客觀法理分析、三段論推理、多領域案件分析、權利主體分離、程序與格式合規，以及面向非法律專業人士的任務導向介面。

## 核心底層

任何新功能均不得繞過既有的：

1. `documentCatalog.ts`（SSOT）與既有文件 registry。
2. P4-P9 canonical pipeline（P5 Compliance、P6 Reviewer、P8 Re-review、P9 Final Gate）。
3. Official Template Artifact Verifier 的來源與產物指紋驗證。
4. Ghost Citation Interceptor 與既有 `verifyGeneratedDocument` fail-closed 管線。

## 五層架構

1. **防幽靈檢索與白名單層**：MCP Router、citation registry、引用白名單。
2. **客觀法理分析與領域適配層**：Domain Router、Standing、LegalClaim、ElementFit、Syllogism。
3. **創傷知情與資源保護層**：高風險偵測、防詐、社政資源、PII 遮蔽。
4. **案件生命週期與組合包層**：情境路由與 Document Bundle。
5. **虛擬法務助理儀表板**：安全資源、白話摘要、證據清單、文件組合包、立案指引、進階底稿。

## 已實作模組

- `src/lib/mcp/mcpCitationRegistry.ts`：保存 MCP 回傳的結構化法源，要求法條狀態與判決來源雜湊。
- `src/lib/reasoning/syllogismEngine.ts`：產生大前提、小前提、結論及其 MCP citation IDs 的結構化結果。
- `src/lib/generation/ghostCitationInterceptor.ts`：阻擋未註冊 citation、失效法條及缺少來源雜湊的判決。
- `src/lib/reasoning/standingAnalyzer.ts`、`legalClaimRegistry.ts`、`elementFitFilter.ts`：分離權利主體並保留證據不足狀態。
- `src/lib/reasoning/domainAdapters/`、`src/lib/caseScenarioEngine.ts`：提供民事、刑事、勞動、行政、性別、智財與催收領域分流。
- `src/lib/rules/proceduralLawEngine.ts`、`proceduralStrategyEngine.ts`：程序必備事項、期間與證據缺口提示。
- `src/lib/resources/protectionResourceEngine.ts`、`src/lib/filingGuide.ts`：安全資源、防詐、PII 遮蔽與立案提示。
- `src/lib/ui/dashboardGenerator.ts`、`src/components/dashboard/DashboardView.tsx`：導診結果的安全、摘要、證據、Bundle、立案與進階底稿區塊。
- `src/prompts/objective-legal-analysis.ts` 與 `server/services/agentChat.ts`：客觀法理分析提示詞注入既有 Agent Chat。

## 分階段狀態

- **Phase 1：完成** — citation registry、三段論結構與 ghost interceptor。
- **Phase 2：完成** — 客觀法理分析、權利主體、構成要件狀態、領域適配器與案件 Bundle。
- **Phase 3：完成** — 程序與證據提示、保護資源、防詐、格式／立案基礎。
- **Phase 4：完成** — Agent Chat 提示詞、triage `analysisBundle` 串接與導診 Dashboard。

本藍圖不宣稱已完成官方資料庫連線或法律判斷自動化；registry 是 MCP 回應的受控邊界。所有法律文件仍須經既有 P4-P9 與 `verifyGeneratedDocument` 驗證後才能交付。

## 不可違反的安全原則

- 未通過驗證一律 fail-closed。
- 不能以模型記憶取代 MCP 或官方來源證據。
- 不因證據不足刪除可能適用的法源，應標示待補證據。
- 不承諾勝訴、不執行 `APPROVE`、`DEPLOY` 或 `ADMIN`。
- 不把本機索引命中誤稱為官方核實。
