# 系統安全與存取控制架構 (Security & Access Control)

## 一、AI Provider 邊界隔離
- 後端路由與前端頁面嚴禁直接載入 `@google/genai` 或第三方 LLM SDK。
- 所有 AI 互動統一由 `AIProvider` 介面承接，支援抽換與單元測試 Mock。

## 二、RBAC 權限與審批身分
- 後端強制校驗 `ApprovalContext` (actorId, actorType, role, timestamp)。
- 限制 `ANALYST` 與 `GENERATOR` 無權進行審批（`APPROVE`）或發布（`DEPLOY`）。
- 嚴格禁止實體型態 `AI` 執行任何審批放行操作。

## 三、輸入/輸出安全與 SSRF 防禦
- 司法爬蟲與外部連結請求一律經由安全白名單檢驗，禁止存取內網 (127.0.0.1, 10.0.0.0/8 等)。
- 驗證管線內嵌 `PrivacyValidator` 與 `SecurityValidator`，即時偵測個資洩漏與 Prompt Injection。

## 四、Production 預設安全模式

- Production CSP 固定 enforce，不接受 Report-Only 降級。
- Production API 固定要求有效 Bearer Token 或 API key；`REQUIRE_AUTH=false` 只影響 development sandbox。
- Production Guest token 預設停用，只有明確設定 `ALLOW_GUEST_MODE=true` 的 demo 環境才開放。
- Production 缺少安全 JWT secret 時拒絕啟動。
- Express query strings 與 URL-encoded bodies 使用 simple scalar parser，停用不必要的 `qs` nested expansion。

## 五、JWT 適用範圍

目前 JWT 僅用於單一 service issuer 的 HS256 token，演算法、期限、claims 與 tenant/role 均採 fail-closed 驗證。key rotation、revocation、JWKS 與第三方 issuer 不在目前能力範圍；遷移條件與限制記錄於 `docs/architecture/ADR-001-jwt-strategy.md`。

## 六、供應鏈與持久化

- CI 必須執行 production dependency audit；已知 advisory 必須記錄狀態，不得由高門檻設定隱藏。
- SQLite audit 在未掛 persistent disk 時只屬短期診斷資料；需要合規保存時，必須設定 durable `AUDIT_DB_PATH` 與 `AUDIT_PERSISTENCE_REQUIRED=true`。
