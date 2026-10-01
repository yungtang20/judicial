# Permission & Role-Based Access Control (RBAC) Model

## 1. 角色定義 (Roles)
- `ANALYST`: 具有 `READ`, `ANALYZE` 權限（實習法務、分析人員）。
- `GENERATOR`: 具有 `READ`, `ANALYZE`, `GENERATE` 權限（具狀法務、生成助理）。
- `VERIFIER`: 具有 `READ`, `ANALYZE`, `VERIFY` 權限（校對專員、引註檢驗人員）。
- `APPROVER`: 具有 `READ`, `ANALYZE`, `GENERATE`, `VERIFY`, `APPROVE` 權限（執業律師、主辦合夥人）。
- `DEPLOYER`: 具有 `READ`, `ANALYZE`, `GENERATE`, `VERIFY`, `APPROVE`, `DEPLOY` 權限（所長、資深出狀律師）。
- `ADMIN`: 具備完整管理權限。

## 2. 審批身分上下文 (ApprovalContext)
所有敏感操作必須傳遞明確之 `ApprovalContext`：
- `actorId`: 使用者或系統唯一識別碼
- `actorType`: `HUMAN` | `AI` | `SYSTEM`
- `role`: 所屬 RBAC 角色
- `source`: 操作來源（HTTP_API / PORTAL / INTERNAL）
- `timestamp`: 操作時間戳

## 3. AI 實體邊界硬性禁制
- 實體型態為 `AI` 者，嚴禁被賦予 `APPROVE`、`DEPLOY` 或 `ADMIN` 權限。
- AI Agent 嘗試簽核門閥或直接發布時，Orchestrator 一律拒絕並拋出 `AI_GATE_APPROVAL_FORBIDDEN` (HTTP 403)。

## 4. 沙盒身分與 SANDBOX_APPROVE（非人工審批）
- `SANDBOX` 角色僅存在於沙盒體驗流程，權限恆為 `READ`、`ANALYZE`、`GENERATE`、`VERIFY`、`SANDBOX_APPROVE`，恆不含 `APPROVE`、`DEPLOY`、`ADMIN`（見 `src/domain/workflow/authorization.ts` 之 `ROLE_PERMISSIONS`）。
- `SANDBOX_APPROVE` 不等同 `APPROVE`：僅適用 SDLC 階段門閥，且僅限 `actorType` 為 `HUMAN`、持有有效 `sandboxGrant` 者；P9 Final Gate 等其他 Human Gate 不受影響。
- 因此第 3 節「AI 恆禁 `APPROVE`、`DEPLOY`、`ADMIN`」不受沙盒路徑影響；沙盒訪客在結構上無法取得上述三種權限。
