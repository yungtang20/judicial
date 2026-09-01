# Human Decision Gate Policy

## 1. 關鍵風險由人把關
系統所有階段交接處均設有獨立之 Human Decision Gate：
- `01_plan`: 立項意圖審查 (Intent Approval Gate)
- `02_design`: 三段論架構審查 (Spec & Architecture Gate)
- `03_build`: 文稿事證吻合審查 (Draft Integrity Gate)
- `04_test`: 引註真偽與地雷掃描 (Anti-Ghost & Quality Gate)
- `05_deploy`: 律師定版用印發布 (Human Review & Release Gate)
- `06_maintain`: 判決反饋與閉環改進 (Feedback Loop Gate)

## 2. 硬性前置條件檢驗 (Prerequisite Enforcement)
在 Gate 放行前，Orchestrator 強制執行以下檢核：
1. **工件存在性 (Artifact Presence)**: 該階段必須已產出符合 StageContract 規範之工件。
2. **驗證器通過 (Validator PASS - Fail Closed)**: 所有必備驗證器（Privacy, Schema, Legal, Citation, Security）無 FAIL。
3. **實體型態檢查 (Actor Identity)**: 簽核者 `actorType` 必須為 `HUMAN`，嚴禁 AI Agent 簽核或假冒審批。
4. **權限檢核 (Permission)**: 簽核者必須具備 `APPROVE` 或 `DEPLOY` 角色權限。
