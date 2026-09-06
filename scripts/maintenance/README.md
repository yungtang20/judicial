# 歷史維護與一次性遷移腳本 (Maintenance Scripts)

此目錄存放專案重構過程中所使用的一次性自動化腳本，供歷史稽核參考：

- `patch_appeal.cjs`: 用於 SmartAppealAssistant.tsx 拆分為 AppealStep1~4 元件之 AST/字串切分腳本。
- `patch_suggest.cjs`: 用於修補建議提示詞之文字替換腳本。
- `patch_toolbox.cjs`: 用於 LegalToolbox 拆分之輔助腳本。

> **注意**：正常 CI 與 Production 部署流程不會執行此處的臨時腳本。
