# Smart Legal Assistant — 專案治理規則

本 `AGENTS.md` 專屬專案 `D:/工作用/judicial`；全域規則見 `C:\Users\yungtang\.pi\agent\AGENTS.md`。

## 硬性規則 (Fail-Closed，不可覆寫)

1. AI entity 恆禁 `APPROVE` / `DEPLOY` / `ADMIN` (見 `src/domain/workflow/authorization.ts`)
2. 所有法律文件生成後必須經 `verifyGeneratedDocument` 管線驗證 (見 `src/lib/generatedDocumentPipeline.ts`)
3. 凡未驗證或 ghost citation, AI 執行失敗均為 **Fail-Closed**，阻止交付
4. 三段論法 (UNIVERSAL_SYLLOGISM_RULES) 強制注入於所有法律生成任務

## 治理文件 (按需載入)

僅在任務涉及對應主題時才讀取，平時不必載入：

| 任務涉及 | 讀取 |
|---|---|
| 法律文件生成、引用驗證 | `docs/governance/LEGAL_GOVERNANCE.md` |
| Gate 簽核 / 階段放行 | `docs/workflows/GATE_POLICY.md` |
| 角色權限 / ApprovalContext | `docs/workflows/PERMISSION_MODEL.md` |
| 狀態轉移 / SDLC 階段 | `docs/workflows/STATE_MACHINE.md` |
| 驗證失敗處理 | `docs/workflows/FAILURE_POLICY.md` |
| 安全 / 部署 / SSRF / JWT | `docs/security/SECURITY.md` |
| 架構修改 / 模組邊界 | `docs/architecture/AUDIT.md` |
| 工作流整體流程 | `docs/workflows/WORKFLOW.md` |

## 安全範圍內自主執行

以下操作無須人工確認，直接完成：本機檔案修改、`npm run lint`、`npm test`、`npm run build`、Debug、修復測試失敗、重新執行驗證。

僅以下情況停下來要求人工確認：部署（`DEPLOY`/push 到 main）、Production 變更、資料刪除、外部服務操作、`git commit`/`git push`（除非使用者明確要求）。

## 驗證指令

```bash
npm run lint        # tsc --noEmit
npm test            # vitest unit
npm run test:eval   # 法治治理回歸 (legalGovernance.test.ts)
npm run test:ssrf   # SSRF 防禦
npm run build
```

完整 CI 等價清單（含 `test:coverage`、`test:e2e`）見 `.github/workflows/ci.yml` 與 `docs/architecture/AUDIT.md`。

## 執行環境編碼（Windows 必讀）

本機路徑與測試名稱含繁體中文，Windows 命令提示字元預設非 UTF-8 會造成輸出亂碼。
每次執行測試前，先將執行環境切換為 UTF-8（程式碼頁 65001、輸出編碼 UTF-8、
`PYTHONUTF8=1`、`LANG`／`LC_ALL` 設為 UTF-8），確認輸出中文正常後再判讀結果。

## 完成標準

預設流程：理解任務 → 實作 → 執行 → 檢查結果 → 修復問題 → 重新驗證。僅完成「修改程式碼」不算完成；必要修改完成、必要驗證通過且發現的錯誤已修復後，任務才算完成。

## 提交範圍

僅修改本次任務必要檔案；治理測試 (`legalGovernance.test.ts`) 驟變視為破壞性異動，禁止修改。

## MODE 宣告

於訊息開頭指定工作模式：`ANALYZE | PLAN | IMPLEMENT | REVIEW | DEBUG | VERIFY`。
