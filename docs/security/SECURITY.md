# 系統安全與存取控制架構 (Security & Access Control)

## 一、AI Provider 邊界隔離
- 後端路由與前端頁面嚴禁直接載入 `@google/genai` 或第三方 LLM SDK。
- 所有 AI 互動統一由 `AIProvider` 介面承接，支援抽換與單元測試 Mock。

## 二、RBAC 權限與審批身分
- 後端強制校驗 `ApprovalContext` (actorId, actorType, role, timestamp)。
- 限制 `ANALYST` 與 `GENERATOR` 無權進行審批（`APPROVE`）或發布（`DEPLOY`）。
- 嚴格禁止實體型態 `AI` 執行任何審批放行操作。

## 三、輸入/輸出安全與 SSRF 防禦
- 外部 URL 僅允許 HTTP/HTTPS；每次 redirect 重新驗證 DNS，拒絕私有/保留位址，並將連線 pin 至已驗證 IP，保留 Host/SNI；正文以串流 2 MiB 上限與 deadline 讀取。
- 請求層級的 `sanitizeRequest` 僅檢查負載大小（1 MiB），不做內容掃描。Prompt Injection 的防護位於提示詞組裝與產出閘門，不在請求中介軟體。
- **個資防護的實際狀態（2026-09-29 實測更正）**：`PrivacyValidator`（`src/domain/workflow/verification.ts`）已實作且測試完整，可偵測身分證字號與手機號碼（FAIL），以及電子信箱、詳細地址、市內電話（NEEDS_REVIEW）。但該類別**未被任何正式程式碼呼叫**，僅存在於測試中。
  實測：使用者在案情描述中輸入真實身分證字號與手機號碼後，請求未被攔截，內容照原樣送至外部 AI 服務並於回應中重現。
  產製的法院書狀本身含當事人身分資訊，屬法院要求登載事項，與「外傳給第三方」是兩個不同問題。
  因此**目前並不存在輸入端的個資遮蔽機制**。需要該保障時，必須實作「送外部 AI 前遮蔽、組裝書狀時還原」，屬尚未完成的工作。

## 四、Production 預設安全模式

- Production CSP 固定 enforce，不接受 Report-Only 降級。
- Production API 固定要求有效 Bearer Token 或 API key；`REQUIRE_AUTH=false` 只影響 development sandbox。
- Production Guest token 預設停用，只有明確設定 `ALLOW_GUEST_MODE=true` 的 demo 環境才開放；公開 Render demo 會簽發 4 小時短效 token，並以每次 Guest session 的獨立 `tenantId` 隔離資料。
- Production 缺少安全 JWT secret 時拒絕啟動。
- Express query strings 與 URL-encoded bodies 使用 simple scalar parser，停用不必要的 `qs` nested expansion。

## 五、JWT 適用範圍

目前 JWT 僅用於單一 service issuer 的 HS256 token，演算法、期限、claims 與 tenant/role 均採 fail-closed 驗證。key rotation、revocation、JWKS 與第三方 issuer 不在目前能力範圍；遷移條件與限制記錄於 `docs/architecture/ADR-001-jwt-strategy.md`。

## 六、供應鏈與持久化

- CI 必須執行 production dependency audit；已知 advisory 必須記錄狀態，不得由高門檻設定隱藏。
- SQLite audit 在未掛 persistent disk 時只屬短期診斷資料；需要合規保存時，必須設定 durable `AUDIT_DB_PATH` 與 `AUDIT_PERSISTENCE_REQUIRED=true`。

## 七、速率限制的實際邊界（實測）

`server/middleware/security.ts` 的 `apiLimiter` 為 300 次 / 15 分鐘 / 每 IP，套用於 `/api` 全部路由（含 guest token 簽發），回應帶標準 `RateLimit-*` 標頭。

**限制：計數器在行程記憶體中，不跨實例共享。**

正式站實測（2026-09-29，320 次併發請求）：

```
RateLimit-Limit: 300; w=900
RateLimit-Remaining: 194      ← 320 次請求後僅計入 106 次
```

連續 12 次請求的 `remaining` 並非嚴格遞減，並出現兩個不同的 `reset` 值（802 與 870），表示請求被分配到不同實例、計數互不干擾。

影響：多實例部署時，實際上限為 300 × 實例數，且請求可因路由到其他實例而略過計數。限流仍提供**每實例**的保護，但不是全站一致的配額。

需要全站一致配額時，必須改用跨實例共享的儲存（Redis 等），並相應設定環境變數。目前部署未使用此類基礎設施，故本節記錄實測結果而非聲稱已達成全站限流。

## 八、冷啟動的實測延遲（2026-09-29）

部署於 Render 免費方案，實測：

| 情境 | /api/health 回應時間 |
|---|---|
| 閒置一段時間後的第一次請求（實例已休眠） | **23.1 秒** |
| 實例已喚醒後的請求 | 0.2 秒 |

Render 免費方案會在閒置後讓實例休眠，因此**第一位使用者可能需等待約 20 秒以上**才能取得首頁。
AI 功能的請求本身另需 20–30 秒（實測 defense-triage 29.6 秒），兩者疊加時首次使用體感較慢。

這是平台限制而非程式缺陷，無法在應用程式內消除。降低影響的方式：

- 升級為付費方案（實例不休眠）
- 設定定期喚醒（例如外部 cron 定期打 `/api/health`）
- 在前端於等待期間顯示明確的處理中說明，避免使用者以為當掉

本專案已為 AI 請求設置逾時（`AGNES_TIMEOUT_MS=60000`、`AGENT_CHAT_TIMEOUT_MS=45000`），
讓逾時時退回本機規則而非無限等待。
