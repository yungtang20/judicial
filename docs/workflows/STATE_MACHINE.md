# Deterministic State Machine Specification

## 1. 核心設計精神
「模型只是執行層，流程才是系統骨架。」
工作流狀態與階段轉移必須由 Deterministic State Machine 強制控制，AI 無權決定狀態轉移。

## 2. 合法轉移表 (Allowed Transitions)
- `01_plan` (計劃與立項) ➔ `02_design` (方案與設計)
- `02_design` (方案與設計) ➔ `03_build` (實現與構建)
- `03_build` (實現與構建) ➔ `04_test` (測試與驗證)
- `04_test` (測試與驗證) ➔ `05_deploy` (發布與交付)
- `05_deploy` (發布與交付) ➔ `06_maintain` (運維與改進)

## 3. 非法轉移防護
所有非線性躍遷（如 `01_plan` ➔ `03_build` 或 `01_plan` ➔ `05_deploy`）一律強制拒絕，並拋出 `INVALID_STAGE_TRANSITION` (HTTP 409)。
回流轉移必須經由受治理的 `FeedbackPolicy` 啟動。
