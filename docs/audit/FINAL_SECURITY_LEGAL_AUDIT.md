# Final Security & Legal Audit Report

本文件記錄「Judicial 專案最終安全與法律可信度強化任務」之全階段審計與對抗性驗證成果，遵循「先 Audit，再測試，後修改」之原則，不破壞既有核心法律治理規則。

---

## 審計與修復清單 (A → B → C)

| ID | 問題分類 | Severity | 模組位置 | 攻擊/異常證據 (Proof of Vulnerability) | 修正方式 (Fail-Closed Enforcement) | 狀態 |
|---|---|---|---|---|---|---|
| **SEC-01** | **Tenant Isolation (IDOR)** | **P0** | `server/routes/sdlc.ts`<br>`src/domain/workflow/sdlcOrchestrator.ts` | Tenant B 能透過指定 Project ID 直接讀取、更新並執行 Tenant A 的 SDLC 專案與專案交付產物。 | 1. 於 `SdlcProjectState` 結構注入並持久化 `tenantId` 與 `ownerId`。<br>2. 在 `sdlcRouter` 各路由進入點注入 `assertProjectTenantOwnership`，嚴格呼叫 `verifyTenantOwnership` 阻斷跨租戶存取 (403 Forbidden)。 | **已修正**<br>(通過對抗測試) |
| **SEC-02** | **SSRF (IPv6 Canonicalization Bypass)** | **P0** | `server/routes/fetchUrl.ts`<br>`test-ssrf.cjs` | 輸入 `http://[::ffff:127.0.0.1]:8080` 時，WHATWG URL parser 自動標準化為 `[::ffff:7f00:1]`，原 `isPrivateIPv6` 僅比對點分十進位，導致環回位址繞過防禦並回傳 200。 | 強化 `isPrivateIPv6` 演算法，完整解析十六進位之 32-bit IPv4-mapped IPv6，並將還原之 IPv4 帶入私有與保留網段檢核。 | **已修正**<br>(通過對抗測試) |
| **SEC-03** | **SSRF (FQDN Trailing Dot Bypass)** | **P1** | `server/routes/fetchUrl.ts`<br>`test-ssrf.cjs` | 輸入 `http://localhost./` (帶尾隨點號 FQDN) 繞過第一層 `cleanHost === "localhost"` 之字串比對。 | 在 `isBasicSafeUrl` 階段新增 `cleanHost.replace(/\.+$/, "")`，在第一道防線立即正規化並阻斷。 | **已修正**<br>(通過對抗測試) |
| **SEC-04** | **PII Audit Log Leakage** | **P1** | `server/services/auditLog.ts` | 當審計 metadata 含有陣列結構 (如 `{ items: ["聯絡手機 0912345678"] }`)，原清洗函式略過陣列，導致 PII 明文寫入 SQLite/記憶體。 | 實作 `sanitizeValue` 支援陣列與任意深層巢狀物件之不可逆遞迴去識別化清洗。 | **已修正**<br>(通過對抗測試) |
| **SEC-05** | **Privacy Gate Defect** | **P1** | `src/domain/workflow/verification.ts` | 原 `PrivacyValidator` 僅對身分證與手機進行 FAIL 判定；對含有通訊地址、Email、市話等中度敏感資料之內容直接放行 PASS。 | 升級 `PrivacyValidator`：遇到 Email、詳細通訊處所、市話時，嚴格觸發 `NEEDS_REVIEW`，強制要求律師或專業人員審查，不得未審放行。 | **已修正**<br>(通過對抗測試) |
| **SEC-06** | **AgentChat PII Gate Defect** | **P2** | `server/services/agentChat.ts` | 當 LLM 回覆含有當事人個資時，若法條檢驗通過即判定為 PASS，忽略個人隱私審查要求。 | 於去識別化管線偵測到替換個資時，強制將門禁狀態由 PASS 提升為 `NEEDS_REVIEW`。 | **已修正**<br>(通過對抗測試) |

---

## 驗證結果

```text
1. npm run lint (tsc --noEmit)
   ✔ 0 Errors / 0 Warnings (完全通過)

2. npm run test:eval (src/lib/legalGovernance.test.ts)
   ✔ 15 passed (15) - 核心法治治理回歸 100% 保持綠燈

3. npm run test:ssrf (node test-ssrf.cjs)
   ✔ 21 個高風險網址與 4 個合法網址檢核全部通過

4. 對抗性測試套件 (Adversarial Security Test Suites)
   ✔ server/middleware/tenantIsolation.adversarial.test.ts (4 passed)
   ✔ server/routes/fetchUrl.adversarial.test.ts (20 passed)
   ✔ server/services/piiAuditPrivacy.adversarial.test.ts (4 passed)

5. 全專案回歸測試 (npm test)
   ✔ 49 Test Files Passed (49 / 49)
   ✔ 269 Tests Passed (269 / 269, 100% 通過)

6. 生產建置 (npm run build)
   ✔ 成功產出 dist/server.cjs 與前端資源包
```

---

## 剩餘風險與 NEEDS_REVIEW 清單 (Residual Risks & Human Decision Gates)

依據專案治理規則與不猜測原則，下列項目屬於本質上無法完全以靜態正則或確定性腳本排除之邊界情境，必須維持 **Human-in-the-Loop** 決策閘門：

1. **同音異字與非標準稱謂之當事人姓名 (NEEDS_REVIEW)**：
   - 自然語言訴狀中若出現無職稱稱謂（如僅有非典型人名但無「原告/被告/先生」等上下文助詞），正則過濾器為避免破壞法律專有名詞，不會過度誤殺，此類文本在 `PrivacyValidator` 與生成管線中應由律師手動確認。
2. **公開裁判書中之合法去識別化公示條款 (NEEDS_REVIEW)**：
   - 經法院官方公報公告去識別化後之內容（如「甲○○」、「王○○」），不視為洩漏個資，但若引用之公開判決書附帶未完全遮蔽之商號統編或非自然人聯絡處所，系統自動標記為 `NEEDS_REVIEW`，由承辦律師做最終交付確認。
3. **外部即時爬蟲來源之內容變更 (NEEDS_REVIEW)**：
   - 外部合法法律網址在初次檢驗時安全，若上游來源網頁後續遭竄改，系統依賴每次抓取時之多階手動重導向檢驗與 Content-Type/Content-Length 嚴格檢核防禦。
