# Judicial Quality Scorecard

評分日期：2026-09-25。評分必須由當次可重現證據支持，不得把計畫、舊報告或未取得的遠端結果算成完成。

## 2026-09-25 現況證據

- `npm run lint`：通過。
- `npm test`：155 個測試檔、995 項測試全部通過。
- `npm run test:coverage`：Statements 90.68%、Branches 83.78%、Functions 94.63%、Lines 92.04%。
- `npm run test:eval`：13 項治理測試通過。
- `npm run test:e2e`：3 項 canonical case cutover、route handoff 與 citation rejection E2E 通過。
- `npm run test:ui:e2e`：1 項 Browser E2E 通過。
- `npm run test:ssrf`：21 個高風險網址與 4 個合法網址通過，直接使用 production exports。
- `npm run build`：Production 前後端建置通過。
- `npm audit --omit=dev --audit-level=high`：0 vulnerabilities。
- 覆蓋率範圍已納入 navigation、appeal adapter、retrieval math、共用附表標頭 component，以及 P9 交付閘門鏈的 `src/lib/finalGate/`、`src/lib/reviewer/`、`src/lib/compliance/` 三個目錄；完整 UI 與 server runtime 尚未全部納入 denominator。
- 覆蓋率門檻除全域數值外，另對信任邊界檔案設定 per-file 門檻：SDLC orchestrator、external citation verifier，以及 P9 交付閘門核心的 `pleadingExportGate.ts` 與 `pleadingFinalGate.ts`（statements 90／branches 85／functions 95／lines 90）。
- 測試收集範圍已涵蓋 `src/`、`server/` 與 `scripts/**/*.test.ts`；`scripts/sync-official-templates.test.mjs` 為 `node:test` 架構的獨立腳本測試，不由 vitest 收集執行。
- 遠端 GitHub Actions、Render deploy 與正式環境 UI 尚未於本輪重新驗證；不得視為本機證據。

## 評分規準

- `9`：沒有已知重大缺口，且至少有兩種直接、可重現證據；任何影響結論的 `UNKNOWN` 都會限制分數。
- `8`：核心能力可靠，但仍有一項實質缺口、證據漂移或未驗證外部狀態。
- `7`：能運作且有測試，但存在多項集中風險或部署重現性不足。
- 技術債反向計分；`0–2` 代表沒有已知可立即修補的安全 advisory、重大文件漂移或無界線 hotspot。
- `10` 保留給包含高可用、復原演練與第三方獨立稽核的交付，不在本輪範圍。

## Evidence ledger

| 指標 | 本輪分數 | 9 分／2 分 Gate | 當次證據與缺口 |
|---|---:|---:|---|
| 1. 專案成熟度 | 8 | CI 等價檢查全確版本、依賴稽核無已知可修補項目、文件與部署契約一致 | 本機 lint/test/coverage/eval/E2E/SSRF/build/audit 通過；遠端 CI 與 deploy 尚未重跑。 |
| 2. 架構成熟度 | 8 | UI/API/provider/domain/trust boundaries 有 source of truth、fail-closed 契約與直接測試 | 已重新審核並修復 tenant、SSRF、canonical case cutover、handoff 與 P9 artifact 綁定；仍待修復後 final review。 |
| 3. 程式品質 | 8 | typecheck/build 全綠；已發現 bug 有 regression test；關鍵錯誤路徑有 assertions | 995 項完整測試通過；本輪新增 tenant、SSRF、case cutover、appeal scope、evidence handoff、citation fail-closed 與 P9 artifact 回歸測試。 |
| 4. 文件品質 | 8 | README、architecture、security、deployment 與 code 一致；限制與 UNKNOWN 明示 | 本檔已同步當次證據；遠端狀態明確標為 UNVERIFIED。 |
| 5. 安全性 | 8 | production audit PASS；auth/tenant/PII/SSRF/citation fail-closed tests PASS | audit 0 vulnerabilities；tenant 與 SSRF 對抗測試通過；遠端正式環境尚未重驗。 |
| 6. 可維護性 | 8 | 高風險執行路徑已拆 coherent boundaries；資料型大檔有完整性測試；剩餘 hotspot 有明確 owner/gate | 本輪修復集中於責任層，未新增 production依賴；coverage 弱區仍需後續補足。 |
| 7. 整合度 | 7 | CI/Render/README clean-install 與 Node 契約一致，且目標 runtime 驗證通過 | 本機整合與 Browser E2E 通過；遠端 CI、Render 與正式 health/UI 尚未重驗。 |
| 8. 覆蓋率 | 8 | 全域 statements/lines ≥85、branches ≥75、functions ≥90；SDLC orchestrator、external verifier 與 P9 交付閘門核心（`pleadingExportGate`、`pleadingFinalGate`）有專屬風險門檻 | 90.68% statements、83.78% branches、94.63% functions、92.04% lines；finalGate／reviewer／compliance 已納入 denominator 並加上 per-file 門檻且已重跑通過；完整 UI runtime 尚未納入 denominator。 |
| 9. 技術債（越高越嚴重） | 3 | ≤2：沒有可立即修補 advisory；跨平台 lock/runtime 契約有結論；最高風險 hotspot 已降低或被直接 gate | 本輪已修復審核發現的 P1/P2；仍待最後獨立複核。coverage 弱區、遠端驗證與完整 UI/server gate 仍待補足。 |

## 第一輪變更

1. 修復 4 個 demand-letter schema key，並以 registry/schema parity test 防止再度出現空白表單。
2. 補 SDLC feedback、project/artifact lifecycle、gate-not-ready、missing-category 與 missing-verification 測試。
3. 補 external precedent parse、HTTP error、malformed JSON、coverage-range 與 batch-boundary 測試。
4. 提高 CI coverage gate，並對兩個信任邊界設定個別門檻。
5. 更新 architecture/security/README/Render/Node 契約與 JWT ADR。
6. 將情境詳情 Modal 拆為 `ScenarioDetailModal`，並補 production CSP／auth／Guest HTTP 邊界測試。
7. 將情境搜尋、分類與安全關鍵字判斷抽成純函式，補直接／反向標籤／斷詞測試。
8. 將 Express query/body parser 限制為 scalar simple mode，並補 nested-key 邊界測試。
9. 套用 `qs@6.16.0` override，於 Node 22.23.2 重新產生 lockfile，並完成 clean install 與 zero-vulnerability audit。
10. 將上訴裁判 URL／檔案匯入、去識別化與期限計算抽成 `appealDocumentActions`，補成功與 fail-closed 單元測試。
11. 對所有已登錄法務工具新增 fallback 完整性契約測試，避免缺漏模板、空文件或錯誤分類。
12. 以本機瀏覽器逐一驗證 4 個存證信函入口與全部 4 個欄位，並確認頁面 console 無錯誤。

## 外部交付 Gate

- `REMOTE_CI`：本輪未執行，狀態為 `UNVERIFIED`；本機等價檢查已通過。
- `RENDER_DEPLOY`：本輪未部署，狀態為 `UNVERIFIED`；不得以本機 build 代替正式部署證據。

## 重現指令

```bash
npm run lint
npm test
npm run test:coverage
npm run test:eval
npm run test:e2e
npm run test:ui:e2e
npm run test:ssrf
npm run build
npm audit --omit=dev --audit-level=high
```

本機程式品質與外部交付 Gate 均須由當次命令、CI、deploy SHA、health 及正式 UI 證據共同支持，不以設定名稱或單一 HTTP 200 代替。
