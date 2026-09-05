# Smart Legal Assistant — 專案治理規則

本 `AGENTS.md` 專屬專案 `D:/工作用/judicial`；全域規則見 `C:\Users\yungtang\.pi\agent\AGENTS.md`。

## 治理文件 (Evidence / Source of Truth)

- `docs/governance/LEGAL_GOVERNANCE.md` — 三段論法合規 + 六大敗訴地雷
- `docs/workflows/GATE_POLICY.md` — 6 Human Decision Gates
- `docs/workflows/PERMISSION_MODEL.md` — RBAC 角色矩陣
- `docs/workflows/STATE_MACHINE.md` — 確定性 SDLC 狀態轉移
- `docs/workflows/WORKFLOW.md` — 工作流執行細節
- `docs/security/SECURITY.md` — 安全邊界 (AI Provider 隔離 + SSRF 防禦)
- `docs/architecture/AUDIT.md` — 架構稽核

## 硬性規則 (Fail-Closed)

1. AI entity 恆禁 `APPROVE` / `DEPLOY` / `ADMIN` (見 `src/domain/workflow/authorization.ts`)
2. 所有法律文件生成後必須經 `verifyGeneratedDocument` 管線驗證 (見 `src/lib/generatedDocumentPipeline.ts`)
3. 凡未驗證或 ghost citation, AI 執行失敗均為 **Fail-Closed**，阻止交付
4. 三段論法 (UNIVERSAL_SYLLOGISM_RULES) 強制注入於所有法律生成任務

## 驗證指令

```bash
npm run lint        # tsc --noEmit
npm test            # vitest unit
npm run test:eval   # 法治治理回歸 (legalGovernance.test.ts)
npm run test:ssrf   # SSRF 防禦
npm run build
```

## 提交範圍

僅修改本次任務必要檔案；治理測試 (`legalGovernance.test.ts`) 驟變視為破壞性異動，禁止修改。

## MODE 宣告

於訊息開頭指定工作模式：`ANALYZE | PLAN | IMPLEMENT | REVIEW | DEBUG | VERIFY`。
