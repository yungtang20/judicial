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

## 防護測試的有效性驗證

綠燈不等於有效。本專案的防護測試逐一植入真實缺陷，確認對應測試會失敗：

| 防護 | 植入的缺陷 | 結果 |
|---|---|---|
| 繁體中文 | 不當得利 → 不当得利 | 抓到 |
| 原生對話框 | 加入 alert() | 抓到 |
| 虛構身分資料 | 補上當事人姓名 | 抓到 |
| 表單欄位涵蓋模板 | 移除一個模板欄位 | 抓到 |
| 管線輸入可從表單取得 | 移除 evidence 欄位 | 抓到 |
| 書狀模板不得捏造事實 | 補上電話號碼 | 抓到 |
| 可點 div 的鍵盤可及性 | 移除 role/tabIndex | 抓到 |
| 圖示按鈕無障礙名稱 | 注入無標籤圖示按鈕 | 抓到 |
| 姓名擷取 | 放寬擷取條件 | 抓到 |
| 追訴時效警示 | 停用適用性判斷 | 抓到 |

驗證過程中修掉三個無效掃描器：
- 字串掃描：否定字元類會匹配換行，正則跨行配對，真實字串全被吞掉。
- 可點 div：屬性裡的箭頭「>」與巢狀大括號會讓正則失效，漏掉所有箭頭函式寫法。
- 圖示按鈕：把 className 字串誤認為可見文字，導致整顆按鈕被略過。

修正後共找出並修掉 7 處真實無障礙缺陷：4 處鍵盤無法操作的互動元素、
3 處純圖示按鈕缺少可讀名稱。

掃描器仍有已知限制：內容為動態表達式的按鈕（{entry.label}、{cond ? <A/> : <B/>}）
靜態無法判斷是否渲染文字，不列入檢查，需人工檢視。

## 安全關鍵守護測試的獨立驗證

前一輪驗證的是「掃描類防護」。這一輪把同一把尺用在本專案
對外宣稱的 fail-closed 保證上。方法相同：逐一移除每一道檢查，
確認對應測試會失敗。

### 找到的三個無測試保護的真實缺口

1. **AI 可取得 ADMIN 權限**
   AGENTS.md 硬性規則第 1 條寫「AI entity 恆禁 APPROVE / DEPLOY / ADMIN」，
   但 `authorization.test.ts` 該案例的標題雖寫了三項，實際只斷言 APPROVE 與 DEPLOY。
   把 'ADMIN' 從禁止清單移除後，**全部測試仍然綠燈**。已補上斷言。

2. **P9 匯出閘門的模板綁定檢查**
   `createPleadingDeliveryAuthorization` 與 `evaluatePleadingDelivery`
   各自有一組模板綁定檢查，但測試只驗證後者。
   前者的 6 項檢查（templateId、sourceHash、artifactFingerprint、
   mimeType、fileName、exportPolicy）全部可以移除而不被發現。已逐項補上。

3. **MCP 引用登錄表的欄位檢查**
   10 個欄位的非空檢查中，只有 sourceHash 有測試。
   其餘 9 個（id、sourceUrl、lawName、articleNumber、currentStatus、
   caseNumber、court、judgmentDate）移除後無人阻擋。已逐欄補上。

### 驗證結果

| 守護 | 檢查項數 | 修正前無保護 | 修正後無保護 |
|---|---|---|---|
| AI 禁止核准權限 | 3 | 1（ADMIN） | 0 |
| P9 匯出閘門 create | 14 | 10 | 0 |
| MCP 引用登錄表 | 10 | 8 | 0 |

### 方法

關鍵在於**一次只移除一項**。原本的案例總是同時改動多個欄位
（例如 status 與 exportPolicy 一起改），任一條件被移除時仍有其他條件
擋下，測試不會失敗——於是每個條件都看似有保護，實際上沒有。

## 驗證方法本身的修正

前一節的方法有缺陷：只跑單一測試檔來判定守護是否有效。
但守護可能由任何一個測試檔保護——例如「空文件」檢查不在
`generatedDocumentPipeline.p0.test.ts` 中，卻被 `fallbackBypass`
與 `legalGovernance` 覆蓋。只跑單檔會把「已受保護」誤判成「無保護」。

改正後對整個測試套件（198 檔 / 1223 測試）驗證，得到 4 個真實缺口：

| 守護 | 缺口內容 | 修補方式 |
|---|---|---|
| 生成管線 | 驗證器回報 ghostCount > 0 但 results 全部標為 verified 時，無測試覆蓋 | 補上輸出不一致的情境 |
| 重試邏輯 | `isTransientProviderError` 分類測得很準，但「是否真的重試」完全沒測 | 匯出 `withTransientRetry` 並以假時鐘驗證實際重試次數 |
| 個資遮蔽 | 陣列遮蔽若退化成物件處理，個資仍會被遮蔽但形狀改變，無斷言察覺 | 補上陣列形狀與元素順序的契約 |

### 兩點誠實說明

1. `assertGeneratedDocumentVerified` 中的
   `!verificationPassed` 拋錯，在幽靈引用路徑上是死碼——
   `interceptVerifiedCitationResults` 會先拋出。該檢查只在
   驗證器輸出不一致（ghostCount 與 results 矛盾）時才會生效，
   這也是它先前沒有測試覆蓋的原因。現已補上該情境的測試。

2. 這一節的表格只涵蓋本專案 fail-closed 保證的一部分。
   未列入的守護**不等於已驗證**。

## 模擬真人使用的實測發現

以 `NODE_ENV=production` 啟動實際建置產物，用瀏覽器逐項操作，
找到兩個靜態測試找不到的問題。

### 1. 租屋押金糾紛被誤判為刑事竊盜

輸入「退租時房東扣住五萬元押金不還」，系統歸類為刑事竊盜／侵占罪，
並引用刑法第320條、第324條、第335條。

原因：竊盜分支的關鍵字含「不還」，而該分支排在租屋押金分支之前。
原始碼註解只考慮了借貸分支（借錢不還），漏了租屋分支——
押金糾紛同樣常用「不還」。

修正：明確的租賃／押金語境讓位給租屋分支。
另補回歸測試，確保真正的竊盜侵占案件不會因此失守。

### 2. 民事起訴狀硬寫借貸事實與借據

模板把事實與法律依據寫死為借貸糾紛：
「緣被告於民國前向原告借得款項」「原證一：借據影本」。
填的是租屋押金糾紛，產出的書狀仍主張借貸關係並要求提出借據——
使用者從未陳述、也未必存在的事實。律師據此遞狀，
等於以捏造之事實陳述作為書證。

既有的防捏造測試只檢查 `params.X || '值'` 這種形式，
查不到模板字串裡硬寫的內容。

修正：法律依據、事實段落與證據清單依使用者實際描述的爭點決定，
押金／借貸／損害賠償各有對應依據；未提供事實時不臆測爭點。

### 同時確認正常的部分

- 幽靈法條攔截：正確辨識不存在的法條項次（民訴第279條第5項）
  與虛構案號（最高法院112年度台上字第99988號），
  4 處真實引用正確放行，並自動產生安全替換版。
- 訪客認證流程：production + ALLOW_GUEST_MODE=true 時
  前端自動取得權杖並重試，SDLC 工作台正常載入。
- 啟動安全校驗：production 缺少 JWT_SECRET 或密鑰過弱時拒絕啟動。
- 正式建置零 console 錯誤，10 個功能入口皆可載入。

### 3. 零引用的書狀被標示為「完成」

民事起訴狀產出後，全文引用檢核為 0 處，畫面卻顯示
「全篇引用檢查完成：共核對 0 處法律引用」，
並與「100% 完成／書狀已產製完成，隨時可匯出」並列。
沒有任何法律依據的書狀被呈現為可以直接遞交法院。

合規規則只檢查民訴第244條的形式要求（表明當事人、訴訟標的、聲明），
不檢查請求權基礎——法律上正確，實務上不足。

修正：引用數為 0 時明確提示文件尚未引用任何法條或裁判，
事實及理由仍須自行載明請求權基礎。
系統不代為填入法律主張（那等同替使用者捏造法律主張），
但必須說清楚這份書狀還缺什麼。
四個產出途徑（法律工具台、爭點表、防禦流程、上訴狀助理）同步修正。
