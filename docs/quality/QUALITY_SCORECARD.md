# Judicial Quality Scorecard

評分日期：2026-09-10。評分必須由當次可重現證據支持，不得把計畫、舊報告或未取得的遠端結果算成完成。

## 評分規準

- `9`：沒有已知重大缺口，且至少有兩種直接、可重現證據；任何影響結論的 `UNKNOWN` 都會限制分數。
- `8`：核心能力可靠，但仍有一項實質缺口、證據漂移或未驗證外部狀態。
- `7`：能運作且有測試，但存在多項集中風險或部署重現性不足。
- 技術債反向計分；`0–2` 代表沒有已知可立即修補的安全 advisory、重大文件漂移或無界線 hotspot。
- `10` 保留給包含高可用、復原演練與第三方獨立稽核的交付，不在本輪範圍。

## Evidence ledger

| 指標 | 基線 | 第一輪 | 9 分／2 分 Gate | 當次證據與缺口 |
|---|---:|---:|---|---|
| 1. 專案成熟度 | 8 | 9 | CI 等價檢查全確版本、依賴稽核無已知可修補項目、文件與部署契約一致 | 本機 lint/test/coverage/eval/E2E/SSRF/build 通過；Node 22.23.2 clean install 通過，`npm audit --omit=dev --audit-level=moderate` 為 0 vulnerabilities，Node／Render 設定一致。 |
| 2. 架構成熟度 | 8 | 9 | UI/API/provider/domain/trust boundaries 有 source of truth、fail-closed 契約與直接測試 | `docs/architecture/AUDIT.md` 已依現況重寫；routes/provider/state machine/gates 均有程式與測試錨點。 |
| 3. 程式品質 | 8 | 9 | typecheck/build 全綠；已發現 bug 有 regression test；關鍵錯誤路徑有 assertions | demand-letter exact-key bug 有 registry/schema 契約測試；本機瀏覽器逐一點選 4 個存證信函工具，均顯示寄件人／收件人／催告金額／催告事由經過且 console 無 error；SDLC 與 external citation failure paths 已補測。 |
| 4. 文件品質 | 5 | 9 | README、architecture、security、deployment 與 code 一致；限制與 UNKNOWN 明示 | 移除已過時的 1290-line server/direct Gemini 敘述；補 JWT ADR、production auth/CSP 與 Render runtime 說明。 |
| 5. 安全性 | 8 | 9 | production moderate-or-higher audit PASS；auth/tenant/PII/SSRF/citation fail-closed tests PASS | 對抗與治理測試通過；production HTTP 測試確認 CSP enforce、Guest 預設關閉、明確啟用時簽發短效且獨立 tenant token，以及 `REQUIRE_AUTH=false` 仍拒絕裸請求；simple parser 關閉 `qs` nested expansion，clean audit 為 0 vulnerabilities。 |
| 6. 可維護性 | 6 | 9 | 高風險執行路徑已拆 coherent boundaries；資料型大檔有完整性測試；剩餘 hotspot 有明確 owner/gate | 四個主要 UI 已拆分；`LegalGuideHome` 情境資料、詳情 Modal 與搜尋／安全判斷已有獨立邊界。`useSmartAppealAssistant` 的 URL 匯入、檔案解析、去識別化及期限計算已抽成具型別、可直接測試的 `appealDocumentActions`（主 hook 1091→969 行）；`toolboxFallbacks` 經盤點為範本文字 registry，新增全工具非空、分類、特定模板與 checklist 完整性 Gate。 |
| 7. 整合度 | 7 | 9 | CI/Render/README clean-install 與 Node 契約一致，且目標 runtime 驗證通過 | Node 22.23.2 Windows clean `npm ci --include=dev --ignore-scripts` 安裝 340 packages 成功；GitHub CI 全步驟通過，Render auto-deploy 對應 `origin/main` 且正式 health/UI 驗證通過。 |
| 8. 覆蓋率 | 8 | 9 | 全域 statements/lines ≥85、branches ≥75、functions ≥90；SDLC orchestrator 與 external verifier 有專屬風險門檻 | 57 files／347 tests；88.79% statements、78.08% branches、94.21% functions、89.60% lines；orchestrator 98.57/81.63、external verifier 97.05/94.73。 |
| 9. 技術債（越高越嚴重） | 4 | 2 | ≤2：沒有可立即修補 advisory；跨平台 lock/runtime 契約有結論；最高風險 hotspot 已降低或被直接 gate | dependency advisory 已清除、Windows clean-install 已驗證、文件與 coverage debt 已下降；邏輯型 hook 已抽出可測試 action boundary，資料型 fallback registry 已由全工具契約測試直接 gate。 |

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

- `REMOTE_CI`：GitHub Actions 的 audit、lint、unit、coverage artifact、legal eval、E2E、SSRF 與 build 全部通過。
- `RENDER_DEPLOY`：`judicial-prod` auto-deploy 已對應 `origin/main`，部署狀態 `live`；正式 health 與四個存證信函表單已驗證。

## 重現指令

```bash
npm run lint
npm test
npm run test:coverage
npm run test:eval
npm run test:e2e
npm run test:ssrf
npm run build
npm audit --omit=dev --audit-level=moderate
```

本機程式品質與外部交付 Gate 均須由當次命令、CI、deploy SHA、health 及正式 UI 證據共同支持，不以設定名稱或單一 HTTP 200 代替。
