# Judicial Quality Scorecard

評分日期：2026-09-25。評分必須由當次可重現證據支持，不得把計畫、舊報告或未取得的遠端結果算成完成。

## 2026-09-25 現況證據

- `npm run lint`：通過。
- `npm test`：160 個測試檔、1019 項測試全部通過。
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
| 3. 程式品質 | 8 | typecheck/build 全綠；已發現 bug 有 regression test；關鍵錯誤路徑有 assertions | 1019 項完整測試通過；本輪新增 tenant、SSRF、case cutover、appeal scope、evidence handoff、citation fail-closed 與 P9 artifact 回歸測試。 |
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

## 已知限制

### 書狀模板內文的殘留捏造（2026-09 記錄，尚未修）

已修：toolboxFallbacks.ts 中 277 處 `params.X || '具體值'` 形式的捏造
（電話、身分證、銀行帳號、地址、金額、日期、機構名）已全部改為「（待填寫）」。

**尚未修**：模板字串本身夾帶的敘述性捏造，例如刑事告訴狀中
「駕駛自用小客車行經…」
「被告於駕駛過程中疏未注意車前狀況，違反道路交通安全規則，
　致生告訴人身體受傷，其過失行為與傷害結果間顯具相當因果關係」
以及證據清單預先列出的「道路交通事故當事人登記聯單…影本各乙份」。

這些不是 `||` 預設值而是模板散文，逐份書狀要判斷哪些是法律框架
（可保留）、哪些是事實斷言（必須移除），屬於需要逐份法律判讀的工作，
本次未做，記錄待處理。

**已加通用防線**：任何仍含「（待填寫）」的文件，
匯出／複製／列印一律被阻擋，畫面也會標示「尚有欄位未填寫」。
這與專案既有的 P9 fail-closed 原則一致：未完成的東西不得交付。
因此即使模板散文仍有殘留斷言，只要該欄位有對應的待填標記，
使用者就無法把缺欄位的草稿當成完整書狀匯出。

### 跨功能資料帶入（2026-09 已端到端驗證）

**已端到端驗證通過**
- 統一入口完成分析後，案情寫入 `cross_feature_context`（正式站實測）。
- 點「法庭爭點整理表」跳轉後，爭點與證據清單正確帶入 1 爭點，
  內含使用者的完整案情（押金、租期、金額、存證信函催告等）。
- `LitigationWorkspace` 逐欄位回退：handoff 未帶的欄位由跨功能脈絡補上（單元測試）。

**先前的錯誤判斷（已更正）**
- 曾誤判「分析卡在 QUESTIONING 無法前進」為缺陷，實際上是流程仍在進行中，
  稍後即完成（`currentStep: COMPLETED`、syllogism 已產生）。
- 曾記載「issuesSummary 不由跨功能脈絡帶入」，實際上它會被帶入並作為爭點標題，
  內容是案件分類標籤（例如「租賃契約修繕爭議 / 房屋漏水侵權損害賠償；案件類型：CIVIL」），
  屬分類而非法律主張，因此可以預填。

**刻意的設計（非缺陷）**
- `ToolContext.navigate` 在不帶 handoff 時清除跨功能脈絡，
  因此側欄瀏覽不會帶入資料，只有明確的跳轉動作才會。
- 使用者自行輸入的用字（含誤植、混用簡繁）原樣保留，系統不改寫使用者文字。

**已修正**
- 押金返還爭議先前被分類為「租賃契約修繕爭議 / 房屋漏水侵權損害賠償」，
  法律依據指向出租人修繕義務，建議行動要求拍攝漏水照片，
  證據清單要求漏水現場照片——全部與押金案情無關。已分開分類。

### 工具箱功能現況（2026-09 正式站實測）

- 28 項工具中 **25 項可產製**並可匯出（TXT／Word）。
- **3 項因 P9 治理保護但無核准的確定性管線而無法產製**：
  DIVORCE_AGREEMENT（兩願離婚協議書）、TRAFFIC_SETTLEMENT_GENERATOR（交通事故和解書）、
  CRIMINAL_COMPLAINT_TRAFFIC（車禍刑事告訴狀）。
  畫面會誠實告知「此類書狀尚未開放產製」。

瀏覽器逐項驗證（填滿表單 → 產製 → 匯出）
- 民事起訴狀：17 欄位、0 待填、匯出成功
- 刑事附帶民事訴訟起訴狀：13 欄位、0 待填、匯出成功
- 住宅租賃契約契約書：9 欄位、0 待填、匯出成功
- 法定自書遺囑：7 欄位、0 待填、匯出成功
- 配偶權侵害求償：17 欄位、0 待填、匯出成功

方法學記錄
- 以 API 加共用樣本普查會對確定性管線類別產生假失敗
  （共用樣本未滿足管線的必要輸入，例如訴之聲明的格式要求）。
  準確的驗證方式是依該工具自己的表單 schema 填滿後測試，
  這正是下列兩條常駐測試做的事。
- toolFormCoversTemplate.test.ts：填滿表單後不得仍有待填標記、欄位不得重複
- canonicalPipelineFormInputs.test.ts：管線類別填滿表單後必須能產製
