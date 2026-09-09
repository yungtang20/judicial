# ADR-001：JWT 驗證策略

- 狀態：Accepted with migration triggers
- 日期：2026-09-09

## 決策

目前保留 `server/middleware/auth.ts` 的同步 HS256 實作，僅接受 `alg=HS256`、`typ=JWT`，並驗證 signature、`exp`、`iat`、`nbf`、必要的 subject／tenant／role，以及環境有設定時的 `iss`／`aud`。

這不是把自製密碼協定視為長期通用 JWT 平台，而是維持現有單一 issuer、單一共享 secret、同步呼叫契約。現有 adversarial tests 是相容性與 fail-closed gate；後續修改不得降低其 assertions。

## 理由

- 目前沒有 JWKS、第三方 issuer、非對稱簽章或多 key rotation 的已確認需求。
- 直接改用非同步 JWT library 會同時改變 middleware、guest token 與測試呼叫契約，應與其他品質修正分開交付。
- Production startup 已拒絕缺失、過短、低熵或已知 fallback secret。

## 明確限制

- 不支援 RS256／ES256、JWKS 或第三方 identity provider。
- 不提供 token revocation list 或 replay store。
- 不支援 `kid` 與不中斷 key rotation。
- 同一 `JWT_SECRET` 的隔離範圍是整個 service，不是 per-tenant key。

## 強制遷移條件

出現任一條件時，必須另立 migration iteration，優先評估維護中的成熟套件，並以現有 adversarial tests 做 differential verification：

1. 接入第三方 issuer、OIDC 或 JWKS。
2. 需要非對稱簽章、多把 active key 或 `kid` rotation。
3. 需要 server-side revocation／replay prevention。
4. 現行 verifier 出現無法以局部修補解決的標準相容或安全缺陷。

## 驗證

```bash
npx vitest run server/middleware/security.test.ts server/middleware/auth.adversarial.test.ts server/middleware/tenantIsolation.adversarial.test.ts
```
