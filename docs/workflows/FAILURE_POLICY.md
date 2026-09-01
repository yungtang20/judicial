# Fail-Closed Verification & Failure Policy

## 1. 核心原則 (Fail-Closed)
法律領域高風險輸出嚴格禁止「Fail Open」或警告後放行。
任何驗證異常、資料未收錄或安全違規均不可自動視為合格。

## 2. 驗證狀態 (VerificationStatus)
- `PASS`: 所有驗證器 100% 通過，工件可被納入 Human Gate 審批。
- `FAIL`: 偵測到嚴重個資洩漏、法律地雷、幽靈捏造引用或安全注入，工件強制被拒絕放行。
- `NEEDS_REVIEW`: 缺少足夠引註或資訊不足，必須由執業律師進行人工實質審查，不得直接放行進入 Deploy。

## 3. 引註真偽防幽靈檢驗 (Anti-Ghost Citation)
- 對於不存在之判決字號或超出真實法規條項之虛構引註，一律標註 `FAIL`。
- 檢驗失敗之文稿禁止標註為 `VERIFIED`，亦禁止以 Fallback 文稿冒充驗證通過結果。
