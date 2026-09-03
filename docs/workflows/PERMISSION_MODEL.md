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
