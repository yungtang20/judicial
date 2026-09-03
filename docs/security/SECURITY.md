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
