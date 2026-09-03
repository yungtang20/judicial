# AI 原生 SDLC 工作流規範 (AI-Native SDLC Workflow)

## 一、生命週期 6 大交付階段 (Lifecycle Stages)

```
01 Plan (計劃與立項)
   │ [Human Decision Gate: Intent Approval]
   ▼
02 Design (方案與設計)
   │ [Human Decision Gate: Spec & Architecture]
   ▼
03 Build (實現與構建)
   │ [Human Decision Gate: Draft Integrity]
   ▼
04 Test (測試與驗證)
   │ [Human Decision Gate: Anti-Ghost & Quality]
   ▼
05 Deploy (發布與交付)
   │ [Human Decision Gate: Lawyer Release & Filing]
   ▼
06 Maintain (運維與改進)
   │ [Feedback Policy Loop ➔ Plan / Design]
   └── Continuous Improvement Loop
```

## 二、階段契約 (Stage Contracts)
每個階段定義：
1. **輸入與輸出規範 (Inputs / Outputs)**
2. **必備工件 (Required Artifacts)**
3. **必備驗證器 (Required Validators)**
4. **審批角色 (Required Approver Role)**
5. **失敗與重試政策 (Failure / Retry Policy)**

## 三、AI 與 Workflow 職責邊界
1. AI 模型僅作為執行層（代碼/文稿草案生成與分析）。
2. Workflow Engine 擁有狀態轉移之絕對控制權。
3. 驗證器管線（Validator Pipeline）負責輸出真偽與合規性檢定。
4. 人工審批門閥（Human Gate）負責終端放行，AI 嚴禁自我審批。
