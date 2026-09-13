# 歷史維護與一次性遷移腳本 (Maintenance Scripts)

此目錄存放專案重構過程中所使用的一次性自動化腳本，供歷史稽核參考：

- `patch_appeal.cjs`: 用於 SmartAppealAssistant.tsx 拆分為 AppealStep1~4 元件之 AST/字串切分腳本。
- `patch_suggest.cjs`: 用於修補建議提示詞之文字替換腳本。
- `patch_toolbox.cjs`: 用於 LegalToolbox 拆分之輔助腳本。

> **安全與維護規範（目錄凍結）**：
> 1. 正常 CI 與 Production 部署流程不會執行此處的臨時腳本。
> 2. 此目錄受 `.husky/pre-commit` 嚴格凍結防護，禁止在此目錄中新增臨時腳本或意圖繞過根目錄檢查之修補檔案。
> 3. 若確有重大歷史腳本維護需求，必須經由專案負責人審查後，手動以 `git commit --no-verify` 顯式繞過提交。
