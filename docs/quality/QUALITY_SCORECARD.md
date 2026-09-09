# Judicial Quality Scorecard

評分日期：2026-09-09。量尺：`9` 代表具備可重複、自動化且 fail-closed 的交付證據；`10` 保留給多區域、高可用與第三方獨立稽核。技術債反向計分，`2` 代表剩餘項目已隔離、可觀測且不阻斷目前交付。

| 指標 | 分數 | 可回查錨點 |
|---|---:|---|
| 專案成熟度 | 9 | `.github/workflows/ci.yml` 於 push/PR 執行 audit、lint、test、coverage、治理、E2E、SSRF 與 build。 |
| 架構成熟度 | 9 | `src/domain/workflow/` 維持 deterministic state machine、authorization、verification 與 stage contracts；server/provider 邊界有靜態測試。 |
| 程式品質 | 9 | `tsc --noEmit` 通過；51 個測試檔、310 項測試通過；結構化 AI 輸出使用 runtime schema 與引用 allowlist。 |
| 文件品質 | 9 | `README.md`、`docs/governance/`、`docs/workflows/`、`docs/security/` 與本評分卡記錄行為、權限及風險邊界。 |
| 安全性 | 9 | Production CSP/auth fail-closed、HS256/claims 驗證、tenant isolation、PII 清洗、SSRF 與 adversarial tests。 |
| 可維護性 | 9 | provider registry、共享 prompts、typed workflow state、集中 verification pipeline；coverage artifact 可回溯。 |
| 整合度 | 9 | UI/API/AI provider/RAG/官方查證/Render/GitHub Actions 串接，健康端點揭露 provider 與 audit persistence 狀態。 |
| 覆蓋率 | 9 | Coverage gate 通過：Statements 82.69%、Branches 75.09%、Functions 87.56%、Lines 84.50%；門檻由 CI 強制且保留 HTML/JSON/LCOV。 |
| 技術債 | 2 | SQLite 僅定位為單機診斷；測試使用 `:memory:`；production 可用 `AUDIT_PERSISTENCE_REQUIRED=true` fail-closed，health 回報 durable 狀態。 |

## 剩餘但已隔離事項

- Render 若未掛 persistent disk，`auditPersistence.durable` 會為 `false`；此狀態不會被描述為永久合規存證。
- 兩個大型前端 chunk 超過 500 kB，屬效能優化 backlog，不影響正確性、安全閘門或目前部署。
- 官方外部資料源不可用時維持 `NEEDS_REVIEW`，不會自動通過法律查證。

## 重現指令

```bash
npm run lint
npm test -- --run
npm run test:coverage -- --reporter=dot
npm run test:eval
npm run test:e2e
npm run test:ssrf
npm run build
```
