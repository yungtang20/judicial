
### 15. 訪客驗證不可用時只顯示無法定義的 401

覆蓋率報告顯示 `apiClient` 分支覆蓋僅 55%，逐一檢視後發現：
正式環境未設定 `ALLOW_GUEST_MODE` 時，`/api/auth/guest` 會回 403，
而客戶端靜默吞掉這個結果，使用者只看到「HTTP Error 401」。

三種情況在畫面上長得一模一樣，但需要完全不同的處理：
- 登入狀態過期 → 使用者重新登入即可
- 權杖失效 → 重新取得權杖即可
- 系統根本沒開訪客模式 → 使用者做什麼都沒用，必須由管理者處理

修正：訪客驗證失敗時回報明確的 `GUEST_AUTH_UNAVAILABLE` 代碼與可行動訊息，
並在 console 留下管理者需要的設定指引。

正式環境（未設定 ALLOW_GUEST_MODE）實測對照：

| | 修正前 | 修正後 |
|---|---|---|
| 畫面 | 載入 SDLC 專案失敗：HTTP Error 401 | 載入 SDLC 專案失敗：尚未完成身分驗證，無法存取此功能。請確認系統已啟用訪客模式，或改以正式帳號登入後再試。 |
| console | 無 | [apiClient] 訪客驗證不可對… 需設定 ALLOW_GUEST_MODE=true，或由使用者正式登入。 |

同時確認兩件事沒有問題：
- 沒有 FormData 經過 `fetchWithAuth`，因此 401 重送不會遇到串流已消耗的問題
- 既有權杖不會被重複索取，訪客驗證端點本身也不會遞迴

### 18. 我的「全綠」漏了 CI 實際會跑的一條指令

比對 `.github/workflows/ci.yml` 與我本機的驗證指令，發現
**`npm run test:coverage` 從未執行過**——而它帶有覆蓋率門檻，
門檻未達標 CI 就會失敗。

我前二十幾輪每次都寫「build、ui:e2e、eval、e2e、SSRF 全通過」，
那句話本身為真，但涵蓋範圍小於 CI 實際會跑的東西。
**量測範圍小於結論範圍。**

這與前幾輪的教訓是同一個，只是方向反過來：
前面是「測試涵蓋範圍太窄卻宣稱完整」，
這次是「我的驗證清單太窄卻宣稱完整」。

補跑後確認通過，並以此後都把 `test:coverage` 列入驗證清單。

### 19. 模組層級提示機制本身沒有測試

`test:coverage` 的報告顯示我上一輪建立的 `src/lib/userNotice.ts`
只有 40% 敘述、0% 分支覆蓋——完全沒有測試。

這個模組取代了 13 處原生 `alert()`。原生 alert 至少一定會跳出視窗；
**若這個機制失效（例如 Provider 尚未訂閱），訊息會完全消失**，
使用者按下按鈕後什麼都看不到——比原本的 alert 更糟。

已補上測試，並且用整合測試確認訊息真的出現在畫面上：
停用 Provider 的訂閱後，測試立即以
`Unable to find an element with the text: 來自模組的訊息` 失敗。

這也示範了覆蓋率報告的正確用法：它直接指出我上一輪新增的程式碼
哪裡沒有被測到，而不是只給一個總體百分比。

## 最終端到端回歸

以 `render.yaml` 的部署環境變數啟動正式建置產物，
在修正全部落地後重新走一次完整流程。

### 與 CI 等價的指令序列

| 指令 | 結果 |
|---|---|
| `npm audit --omit=dev --audit-level=high` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS |
| `npm run test:coverage` | PASS |
| `npm run test:eval` | PASS |
| `npm run test:e2e` | PASS |
| `npm run test:ssrf` | PASS |
| `npm run build` | PASS |

### 正式環境功能回歸

- 13 個功能入口全部可載入，**零 console 錯誤、零警告**
- 押金糾紛分類：無刑事誤判、無刑法引用（修正持續有效）
- 幽靈法條攔截：共檢核 6 處、發現 2 處異常、產生安全替換版
- 法定期間試算：正確顯示「假日表僅建檔至 115/10/10」的涵蓋範圍警告
- 裁判費試算：正確顯示「一審裁判費是否曾依民訴§77-9 酌減」的條件輸入

### 檢視過但確認無需改動的程式碼

- `judicialCrawler` 的空 catch：URL 解析失敗時改走其他解析策略，屬合理的防禦性處理
- `legalGenerationPipeline` 的外部檢索降級：外部失敗時降級本機知識庫，
  且 `isExternalRetrievalUsed` 保持 false、狀態訊息如實反映，不會宣稱使用了外部來源
- `LegalWorkflowState` 狀態機：每次轉移都檢查前序狀態，任何例外皆轉為 FAILED；
  無 REJECTED 狀態是設計如此，退回機制由獨立的 feedback loop 處理
