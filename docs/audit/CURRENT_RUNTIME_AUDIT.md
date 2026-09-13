# Judicial 專案當前 Runtime 全面工程審查與安全性／法治合規稽核報告
**文檔路徑**: `docs/audit/CURRENT_RUNTIME_AUDIT.md`  
**審查基準日期**: 2026-09-13  
**審查依據**: 實體程式碼檢驗、動態執行日誌、回歸測試套件與真實 HTTP / Pipeline 邊界行為（拒絕美化、拒絕以 Prompt 或靜態字串比對代替 Runtime 強制性）

---

## 執行摘要 (Executive Summary)

本報告係針對 `https://github.com/yungtang20/judicial` 進行全面且嚴格之唯讀審查（Phase 1 Read-only Audit）。  
雖然目前自動化測試套件（`npm test` 80 個測試檔案、585 項測試全部綠燈通過），但經深入動態與源碼檢視，發現多處**「表面測試通過，但實體邊界存在嚴重漏洞或偽造通過」**的關鍵隱患：
1. **Fallback 降級路徑偽造合規**：在 `/api/generate-appeal-petition` 與 `/api/defense/generate-pleading` 中，當 AI 失敗觸發 fallback 時，直接回傳 `documentText: ""` 藉此繞過 citation 驗證，並偽造 `verifiedCitations` 狀態。
2. **死碼與靜態字串比對矇混測試**：治理測試 `legalGovernance.test.ts` 以字串包含 `toContain('verifyGeneratedDocument')` 判定路由合規，導致路由以 `void [UNIVERSAL_SYLLOGISM_RULES, verifyGeneratedDocument];` 這種死碼形式矇混通過。
3. **P4–P9 實體邊界繞過**：上訴狀與答辯狀身為正式法院訴訟文書，未納入 P4-P9 確定性審查守門管線（`canonicalPleadingPipeline`），而是由舊版 `defaultLegalGenerationPipeline` 直接生成交付，無 P9 Final Gate Token 即對外回傳。
4. **Client-Controlled ApprovalContext**：工作流執行與審批端點從未信任的 HTTP Request Body 接收 `actorType` 與 `role`，外部請求可任意偽造 `HUMAN` / `APPROVER` 繞過防護。
5. **法律來源缺乏 Provenance 與時間維度**：法規與判例資料庫僅以簡單記憶體字典記錄條號與摘要，無公報來源雜湊、有效期間（effectiveFrom/To）、修正履歷，亦無法判斷案發當時適用之法規版本。

---

## 審查發現清單 (Findings Inventory)

---

### AUDIT-P0-001: 上訴狀與答辯狀 Fallback 實體繞過引註查核機制
- **Severity**: P0 (Critical)
- **所在檔案與概略行號**: 
  - `server/routes/appeal.ts`: 行 96–103
  - `server/routes/defense.ts`: 行 122–129
- **目前觀察到的行為 (Observed Behavior)**:
  當上訴狀或答辯狀生成時，若 AI Provider 調用失敗或逾時，管線觸發 `fallback` 回退處理。然而，其回傳結構刻意將 `documentText` 設為空字串 `""`，並附帶註解：
  `// Bypass citation check for predefined rule engine`。
  同時偽造 `verifiedCitations: []` 與 `antiGhostVerification: { status: 'PASS', totalChecked: 0, ghostCount: 0 }`。
- **預期行為 (Expected Behavior)**:
  當 AI 生成失敗時，不得透過清空 `documentText` 偽造查核通過；法治治理要求所有對外產製之法律文書（包含預設規則引擎生成之草稿）皆必須具備實質法律內文，且一律經由 `verifyGeneratedDocument` 驗證。若無法通過驗證或生成異常，必須 Fail-Closed 拒絕交付（HTTP 422/503），嚴禁以空字串欺騙查核器。
- **證據 (Evidence)**:
  `server/routes/appeal.ts`:
  ```typescript
  fallback: () => {
    return {
      documentText: "", // Bypass citation check for predefined rule engine
      appealDoc: generatedText,
      verifiedCitations: [],
      antiGhostVerification: { status: 'PASS', totalChecked: 0, ghostCount: 0 }
    };
  }
  ```
  `server/routes/defense.ts`:
  ```typescript
  fallback: () => {
    return {
      documentText: "", // Bypass citation check for predefined rule engine
      pleading: generatedText,
      verifiedCitations: [],
      antiGhostVerification: { status: 'PASS', totalChecked: 0, ghostCount: 0 }
    };
  }
  ```
- **對安全性／法律正確性的影響 (Impact)**:
  當外部網路中斷或 AI 服務異常時，系統回退至本地模板，但此時生成的上訴狀與答辯狀完全喪失 Anti-Ghost Citation 與法律三段論查核防護，可能將包含廢止條文或未授權內容的法律訴狀直接交付當事人，導致嚴重敗訴地雷。
- **建議修復方式 (Recommended Fix)**:
  1. 移除 `documentText: ""` 繞過伎倆；Fallback 產生的 `generatedText` 必須直接賦值給 `documentText`。
  2. 廢除偽造的 `antiGhostVerification: { status: 'PASS' }`，必須對真實 `documentText` 呼叫 `verifyGeneratedDocument(documentText)`。
  3. 若 Fallback 文本未經檢核或含未查證引用，依 Fail-Closed 原則拋出 `AppError('DOCUMENT_VERIFICATION_FAILED', 422)`。
- **需要補上的回歸測試 (Required Regression Test)**:
  - 建立整合測試 `appealFallbackVerification.test.ts` 與 `defenseFallbackVerification.test.ts`，模擬 AI 失敗觸發 Fallback 時，確認其回傳之 `documentText` 不得為空，且必須執行真實引註檢驗，未通過時必須回傳 HTTP 422。

---

### AUDIT-P0-002: 治理測試遭「死碼引入 (Dead Code Void Expression)」矇混過關
- **Severity**: P0 (Critical)
- **所在檔案與概略行號**: 
  - `src/lib/legalGovernance.test.ts`: 行 132–136
  - `server/routes/appeal.ts`: 行 10–11
  - `server/routes/defense.ts`: 行 10–11
  - `server/routes/toolbox.ts`: 行 20–21
- **目前觀察到的行為 (Observed Behavior)**:
  `src/lib/legalGovernance.test.ts` 的測試項目 `Hard Enforcement: AI Routes must enforce universal syllogism and anti-ghost verification` 僅使用 `fs.readFileSync` 讀取路由檔案文字，並檢查 `expect(appealRoute).toContain('verifyGeneratedDocument')`。
  為了讓此測試通過，`server/routes/appeal.ts`、`defense.ts`、`toolbox.ts` 直接在頂部寫入：
  `void [UNIVERSAL_SYLLOGISM_RULES, verifyGeneratedDocument];`
  這是一段不執行任何操作的死碼（Dead Code），在 Runtime 完全無防禦作用，但成功欺騙了靜態字串檢查測試。
- **預期行為 (Expected Behavior)**:
  測試不得依賴原始碼字串 `toContain`。系統必須具備行為式整合測試（Behavioral Tests），向 API 發出真實 HTTP 請求，並驗證未經引註查核的請求確實被阻絕（HTTP 422/403），且回傳結果的驗證管線實體運作，而非依靠死碼欺騙靜態檢查。
- **證據 (Evidence)**:
  `server/routes/appeal.ts`:
  ```typescript
  // Note: verifyGeneratedDocument and UNIVERSAL_SYLLOGISM_RULES are enforced centrally within defaultLegalGenerationPipeline
  void [UNIVERSAL_SYLLOGISM_RULES, verifyGeneratedDocument];
  ```
  `src/lib/legalGovernance.test.ts`:
  ```typescript
  const defenseRoute = fs.readFileSync(path.join(__dirname, '../../server/routes/defense.ts'), 'utf-8');
  expect(defenseRoute).toContain('verifyGeneratedDocument');
  expect(defenseRoute).toContain('UNIVERSAL_SYLLOGISM_RULES');
  ```
- **對安全性／法律正確性的影響 (Impact)**:
  靜態測試給予開發者與稽核員虛假的安全感，誤以為三段論與引註查核在這些核心端點已獲嚴格執行，掩蓋了實際可能存在的繞過路徑。
- **建議修復方式 (Recommended Fix)**:
  1. 移除各檔案中所有的 `void [...]` 欺騙性死碼。
  2. 重構 `legalGovernance.test.ts`：以 `supertest` 或實體函式調用發送包含幽靈引用與瑕疵三段論的 Payload，斷言 API 回傳 422 拒絕交付。
- **需要補上的回歸測試 (Required Regression Test)**:
  - 增加端點行為驗證：`POST /api/generate-appeal-petition` 傳入幽靈法條（如「民法第9999條」），斷言 API 拒絕產製並回傳 `LEGAL_INPUT_REJECTED` 或 `DOCUMENT_VERIFICATION_FAILED`。

---

### AUDIT-P0-003: 法院訴狀生成路徑繞過 P4–P9 確定性管線與 Final Gate 交付授權
- **Severity**: P0 (Critical)
- **所在檔案與概略行號**: 
  - `server/routes/appeal.ts`: 行 1–130
  - `server/routes/defense.ts`: 行 1–145
  - `server/routes/toolbox.ts`: 行 66–91
  - `src/lib/finalGate/pleadingExportGate.ts`: 行 48–80
- **目前觀察到的行為 (Observed Behavior)**:
  系統已建立了嚴格的 P4-P9 確定性合規管線（`canonicalPleadingPipeline.ts`）與最終守門員授權機制（`pleadingFinalGate.ts` / `pleadingExportGate.ts`）。
  然而：
  1. `/api/generate-appeal-petition`（上訴狀）與 `/api/defense/generate-pleading`（答辯狀）完全獨立於此管線，直接以非結構化 LLM 產製後回傳。
  2. 在 `server/routes/toolbox.ts` 中，非法院訴狀類別雖然被 `evaluatePleadingDelivery` 判定為 `NOT_A_COURT_PLEADING`，但上訴狀與答辯狀身為訴訟文書，卻未被列入 `COURT_PLEADING_TOOL_CATEGORIES` 的同等防護範圍，導致此二類最高法律責任之法院訴狀完全無 P9 Final Gate Token 即可被交付匯出。
- **預期行為 (Expected Behavior)**:
  凡屬於呈遞法院或檢察署之訴狀（含民刑事上訴狀、答辯狀、民刑事起訴狀、聲請狀），其產製與匯出必須統一經由 P4-P9 確定性合規管線處理，且回傳負載中必須攜帶由 P9 Final Gate 所簽發且經防偽雜湊綁定之 `PleadingDeliveryAuthorization`。
- **證據 (Evidence)**:
  `server/routes/appeal.ts`:
  ```typescript
  const pipelineResult = await defaultLegalGenerationPipeline.execute({
    ragQuery,
    buildPrompt: () => getAppealPetitionPrompt(...),
    ...
  });
  // 直接回傳 pipelineResult，無 P9 evaluation，無 pleadingDeliveryAuthorization
  res.json({ success: true, petition: pipelineResult.payload });
  ```
- **對安全性／法律正確性的影響 (Impact)**:
  上訴狀與答辯狀具備嚴格的法定程式要件（民事訴訟法第441條、第442條、第265條等），非結構化 LLM 容易遺漏上訴聲明、未具體指摘原裁判違法之處或自認不利事實，繞過 P4-P9 審查可能直接導致當事人遭法院裁定駁回或承擔敗訴後果。
- **建議修復方式 (Recommended Fix)**:
  1. 將民事上訴狀、刑事上訴狀、民事答辯狀、刑事答辯狀納入 `courtPleadingRuleProfiles.ts` 與 `COURT_PLEADING_TOOL_CATEGORIES`。
  2. 讓 `/api/generate-appeal-petition` 與 `/api/defense/generate-pleading` 統一透過 `canonicalPleadingPipeline` 執行 P4-P9 審查，確保必須持有 `PleadingDeliveryAuthorization` 始得回傳。
- **需要補上的回歸測試 (Required Regression Test)**:
  - 增加測試驗證：調用 `/api/generate-appeal-petition` 與 `/api/defense/generate-pleading` 時，回傳物件必須包含合法的 `pleadingDeliveryAuthorization`，且 `finalGateStatus` 必須為 `READY`。

---

### AUDIT-P0-004: HTTP Request Body 可偽造 ApprovalContext 繞過 Human Gate 與 RBAC 角色限制
- **Severity**: P0 (Critical)
- **所在檔案與概略行號**: 
  - `server/routes/sdlc.ts`: 行 15–40, 行 90–125
  - `src/domain/workflow/authorization.ts`: 行 10–55
- **目前觀察到的行為 (Observed Behavior)**:
  雖然 `src/domain/workflow/authorization.ts` 宣告了 `assertHumanGatekeeper` 與 RBAC 角色矩陣（禁止 AI 實體擁有 `APPROVE` / `DEPLOY` 權限），但在 API 端點層（如 `/api/sdlc/approve-gate` 或 `/api/sdlc/execute-stage`），系統直接從 `req.body.context` 接收 `ApprovalContext`！
  客戶端只要發送：
  `{ "context": { "actorType": "HUMAN", "role": "APPROVER", "actorId": "hacker" } }`
  後端未將其與登入之 JWT Token（`req.user`）綁定校驗，即直接採信該 `context`。
- **預期行為 (Expected Behavior)**:
  `ApprovalContext` 必須為**伺服器端唯一持有與建構之特權物件**。端點必須強制要求 `authenticate()` 中間件，並自已驗證之 JWT Payload（`req.user`）中提取 `userId`、`tenantId` 及資料庫中查得之真實角色，嚴禁任何客戶端透過 HTTP Request Body 聲明自己的 `actorType` 或 `role`。
- **證據 (Evidence)**:
  `server/routes/sdlc.ts`:
  ```typescript
  router.post("/execute-stage", async (req: Request, res: Response) => {
    const { projectId, stageId, humanInput, context } = req.body;
    // context 直接被傳入 orchestrator，若客戶端偽造 actorType: 'HUMAN', role: 'APPROVER' 即可放行
    const result = await defaultSdlcOrchestrator.executeStage(
      projectId,
      stageId,
      humanInput,
      context // 外部不受信任之輸入
    );
  ```
- **對安全性／法律正確性的影響 (Impact)**:
  攻擊者或前端惡意腳本可偽裝成「合夥律師 (APPROVER)」或「所長 (DEPLOYER)」，在未經真實律師審核文稿的情況下，直接批准 Release Gate 並匯出訴訟文件，徹底摧毀 Human Decision Gate 治理核心。
- **建議修復方式 (Recommended Fix)**:
  1. 在 `server/routes/sdlc.ts` 全面掛載 `authenticate()` 中間件。
  2. 改寫 `createApprovalContextFromRequest(req: AuthenticatedRequest)`：強制從 `req.user` 提取真實憑證，若 Request Body 嘗試覆寫 `actorType` 或 `role`，視為權限篡改攻擊（拋出 HTTP 403 並記錄安全性稽核日誌）。
- **需要補上的回歸測試 (Required Regression Test)**:
  - 增加惡意滲透測試：匿名或低權限（ANALYST）使用者發送帶有 `{ actorType: "HUMAN", role: "DEPLOYER" }` 的請求，伺服器必須回應 HTTP 403 `FORBIDDEN`，且狀態不得發生變更。

---

### AUDIT-P0-005: 專案與工作流資源缺乏 Tenant 隔離所有權校驗 (IDOR 漏洞)
- **Severity**: P0 (Critical)
- **所在檔案與概略行號**: 
  - `src/domain/workflow/sdlcOrchestrator.ts`: 行 34–66
  - `server/routes/sdlc.ts`: 行 30–80
  - `server/middleware/tenantScope.ts`: 行 50–75
- **目前觀察到的行為 (Observed Behavior)**:
  在 `SdlcOrchestrator.getProject(projectId)` 與 `executeStage(projectId, ...)` 中，僅傳入 `projectId` 查詢儲存庫。
  當租戶 A 呼叫 `/api/sdlc/project/:projectId` 時，若提供租戶 B 的 `projectId`，系統直接回傳專案完整狀態與產物，未校驗該專案的 `tenantId` 是否與請求發起者的 `req.tenantContext.tenantId` 一致。
- **預期行為 (Expected Behavior)**:
  所有專案、案件及書狀資源之存取與變更，必須強制調用 `verifyTenantOwnership(resourceTenantId, req.tenantContext)`；跨租戶存取必須一律回應 HTTP 404/403，並記錄 `CROSS_TENANT_ACCESS_ATTEMPT` 稽核日誌。
- **證據 (Evidence)**:
  `src/domain/workflow/sdlcOrchestrator.ts`:
  ```typescript
  public async getProject(projectId: string): Promise<SdlcProjectState | null> {
    return this.repository.get(projectId); // 無 tenantId 校驗
  }
  ```
- **對安全性／法律正確性的影響 (Impact)**:
  多租戶律師事務所架構下，甲事務所可隨意讀取、甚至篡改乙事務所的訴訟策略、當事人不公開機密事證與審批紀錄，違反律師法保密義務與個資法。
- **建議修復方式 (Recommended Fix)**:
  1. `SdlcOrchestrator` 各方法強制要求傳入 `tenantId`。
  2. 在 `repository.get(projectId)` 後，強制執行 `if (project.tenantId !== expectedTenantId) throw new AppError('FORBIDDEN', ...)`。
- **需要補上的回歸測試 (Required Regression Test)**:
  - 增加多租戶對抗測試：以 `tenant_alpha` 建立專案後，以 `tenant_beta` 憑證嘗試讀取或執行 stage，斷言回傳 HTTP 403/404。

---

### AUDIT-P1-001: 法律資料來源缺乏完整 Provenance 與權威性分級 (P1-1)
- **Severity**: P1 (High)
- **所在檔案與概略行號**: 
  - `src/types.ts`: 行 188–205
  - `src/lib/citationVerifier.ts`: 行 6–100
- **目前觀察到的行為 (Observed Behavior)**:
  現有法規資料庫型別 `RealStatuteDatabaseItem` 僅定義：
  `{ lawName, article, maxParagraphs, keywords, officialSummary }`。
  資料完全缺乏來源權威（`sourceAuthority`）、官方來源網址（`sourceUrl`）、公報內容雜湊（`sourceHash`）、檢索時間（`retrievedAt`）、生效日期（`effectiveFrom`）、廢止/修訂日（`effectiveTo`、`amendmentDate`）及官方全文（`officialText`）。
  且系統將 `officialSummary`（官方摘要）與系統自行摘要混同，未明確標注 `OFFICIAL_TEXT`、`OFFICIAL_SUMMARY`、`SYSTEM_SUMMARY`、`AI_SUMMARY` 之層級。
- **預期行為 (Expected Behavior)**:
  法律資訊具備嚴格證據能力要求。每一筆法條或判例來源必須包含不可篡改的來源 Provenance，明確標注權威層級；`AI_SUMMARY` 嚴格禁止被列為法律權威來源。
- **證據 (Evidence)**:
  `src/types.ts`:
  ```typescript
  export interface RealStatuteDatabaseItem {
    lawName: string;
    article: string;
    maxParagraphs: number;
    keywords: string[];
    officialSummary: string; // 僅有 summary，無 officialText，無法核對精確款項
  }
  ```
- **對安全性／法律正確性的影響 (Impact)**:
  無法溯源該法條是否為立法院最新公布條文、是否曾被憲法法庭裁判宣告違憲立即失效，可能導致訴狀引用失效法條。
- **建議修復方式 (Recommended Fix)**:
  1. 擴充 `RealStatuteDatabaseItem` 支援 `sourceType`、`sourceAuthority`、`sourceUrl`、`sourceHash`、`retrievedAt`、`effectiveFrom`、`effectiveTo`、`amendmentDate`、`officialText`。
  2. 嚴格區分來源類型，禁止 `AI_SUMMARY` 作為法律基礎。
- **需要補上的回歸測試 (Required Regression Test)**:
  - 建立法規來源 Provenance 結構檢驗測試，確認資料庫中每項法規皆具備官方公報與版本追溯欄位。

---

### AUDIT-P1-002: 引註查核停留在粗糙 Heuristic，未落實多維度真偽判定 (P1-2)
- **Severity**: P1 (High)
- **所在檔案與概略行號**: 
  - `src/lib/citationVerifier.ts`: 行 200–350
- **目前觀察到的行為 (Observed Behavior)**:
  `verifyLegalCitations` 僅以正則表示式檢查條文或判決字號格式，只要在記憶體字典中有該條號，即回傳 `isGhostOrFake = false`。
  並未拆解判定：
  1. `existence`（存在性）
  2. `officialSource`（官方裁判書全文是否存在）
  3. `textRetrieved`（全文是否已擷取）
  4. `temporalValidity`（時間有效性）
  5. `claimSupport`（引註意旨是否確實支持當事人主張）
- **預期行為 (Expected Behavior)**:
  必須同時滿足 `citationExists AND officialSourceConfirmed AND temporalValidityConfirmed AND claimSupportConfirmed` 始得判定為 `VERIFIED`；任一條件不滿足時，必須判定為 `UNVERIFIED` 或 `NEEDS_REVIEW`，嚴禁自行假定為合格。
- **證據 (Evidence)**:
  `src/lib/citationVerifier.ts`:
  ```typescript
  if (VERIFIED_REAL_STATUTES[item]) {
    // 只要字典有 key，直接認定非幽靈，不核對案件事實與請求權關聯
    return { citationText: item, isGhostOrFake: false, reason: '法條存在' };
  }
  ```
- **對安全性／法律正確性的影響 (Impact)**:
  條文雖然存在，但若被惡意斷章取義或誤用於不相干案型（例如將侵權行為時效套用於物上請求權），Heuristic 無法識別此種法理錯誤。
- **建議修復方式 (Recommended Fix)**:
  升級 Citation Verification Engine，建立結構化多階查核機制，將存在性、來源確認、時效性與要件關聯性分離評估。
- **需要補上的回歸測試 (Required Regression Test)**:
  - 增加真偽查核多階測試：針對真實字號但非有效版本、或斷章取義之引用，斷言其狀態為 `NEEDS_REVIEW`。

---

### AUDIT-P1-003: 缺少法律版本與時間有效性 (Temporal Validity) 核驗 (P1-3)
- **Severity**: P1 (High)
- **所在檔案與概略行號**: 
  - `src/lib/citationVerifier.ts`: 全檔
  - `server/services/officialCitationVerification.ts`: 全檔
- **目前觀察到的行為 (Observed Behavior)**:
  系統查核法規引用時，僅確認「目前字典中是否有此法條」，無法回答以下法律推論必備問題：
  「案件發生日期（例如 2017 年） -> 當時有效法規版本 -> 當時條文內容（例如民法成年年齡或時效起算） -> 引用是否有效？」
- **預期行為 (Expected Behavior)**:
  法律引用必須根據案發基準日與起訴基準日進行「跨時效力檢驗（Temporal Validity）」；若無該歷史期間法規版本資料，必須回傳 `UNKNOWN` / `TEMPORAL_VALIDITY_UNVERIFIED`，不得逕行認定通過。
- **證據 (Evidence)**:
  現行所有引註比對函式均無接收 `incidentDate` 或 `caseDate` 參數，亦無比對 `effectiveFrom` / `effectiveTo` 之邏輯。
- **對安全性／法律正確性的影響 (Impact)**:
  例如民法第205條最高約定利率於 2021 年修正降為 16%，若案件發生於 2019 年卻引用新法判定無效，或發生於 2023 年卻引用舊法 20%，將直接導致訴訟主張之利息計算錯誤。
- **建議修復方式 (Recommended Fix)**:
  為法規庫加入版本時間軸，在 Citation Verification 傳入案件發生日期進行跨時法規比對，資料不足時 Fail-Closed 標記為 `UNKNOWN`。
- **需要補上的回歸測試 (Required Regression Test)**:
  - 測試歷史案件日期與修法前後的條文比對，確認舊案引用新法或未明時段時回傳 `TEMPORAL_VALIDITY_UNKNOWN`。

---

### AUDIT-P1-004: 三段論法僅停留於 Prompt 宣告，缺乏 Runtime 輸出結構契約 (P1-4)
- **Severity**: P1 (High)
- **所在檔案與概略行號**: 
  - `src/prompts/universal-syllogism.ts`: 行 1–11
  - `server/services/legalGenerationPipeline.ts`: 行 90–120
- **目前觀察到的行為 (Observed Behavior)**:
  `UNIVERSAL_SYLLOGISM_RULES` 僅是一段被注入在 LLM Prompt 中的文字指令。雖然 pipeline 宣稱強制注入三段論，但在生成後僅驗證 JSON parse 或字串長度，未強制檢驗輸出是否包含符合三段論的結構化欄位。
- **預期行為 (Expected Behavior)**:
  三段論必須為實體輸出契約（Output Contract）。法律分析與書狀生成結果必須解析出：
  ```json
  {
    "majorPremise": [...],
    "minorPremise": [...],
    "subsumption": [...],
    "conclusion": [...],
    "unknownFacts": [...],
    "unsupportedClaims": [...]
  }
  ```
  Runtime Validator 必須真正檢驗各區塊的實質內容，非僅檢查 Prompt 字串是否存在。
- **證據 (Evidence)**:
  `src/prompts/universal-syllogism.ts` 僅有提示詞文字，無搭配的 Schema Validator 與結構化欄位解析。
- **對安全性／法律正確性的影響 (Impact)**:
  LLM 產出常出現「跳躍式推論」或「無事實依據的涵攝」，因無 Runtime 契約防線，此類殘缺推論將被直接渲染交付。
- **建議修復方式 (Recommended Fix)**:
  建立 `SyllogismOutputContract` 與 `SyllogismValidator`，在生成產物中強制解析大前提、小前提、涵攝與結論，若結構缺失或空泛立即拒絕放行。
- **需要補上的回歸測試 (Required Regression Test)**:
  - 增加 Schema 測試：模擬 LLM 缺少小前提（事實）或缺少涵攝環節時，Validator 判定 FAIL。

---

### AUDIT-P1-005: 稽核日誌缺少必要 Provenance 溯源結構 (P1-7)
- **Severity**: P1 (High)
- **所在檔案與概略行號**: 
  - `server/services/auditLog.ts`: 行 26–40
- **目前觀察到的行為 (Observed Behavior)**:
  `AuditLogEntry` 介面僅包含：
  `{ id, requestId, timestamp, tenantId, userId, action, resource, status, statusCode, durationMs, ip, userAgent, metadata }`。
  缺少法律交付追溯必備之原生欄位：
  `actorType`, `role`, `caseId`, `workflowId`, `artifactId`, `documentFingerprint`, `promptVersion`, `model`, `provider`, `retrievalVersion`, `citationVerificationVersion`, `gate`, `decision`。
  目前的作法僅能將部分資料非結構化地塞入 `metadata` JSON 字串中，無法以 SQLite 索引高效查詢與合規稽核。
- **預期行為 (Expected Behavior)**:
  法律系統之 Audit Log 必須具備第一級（First-class）之完整溯源欄位，同時嚴格遵守 PII 脫敏，絕不記錄當事人未脫敏個資或完整私密內文。
- **證據 (Evidence)**:
  `server/services/auditLog.ts` SQLite 資料庫表格定義未包含上述關鍵溯源欄位。
- **對安全性／法律正確性的影響 (Impact)**:
  一旦發生法律訴訟爭議或資安事件，無法迅速根據 `documentFingerprint` 或 `promptVersion` 重建當初生成時的完整環境與審批責任人。
- **建議修復方式 (Recommended Fix)**:
  升級 SQLite `audit_logs` 表格結構，增加結構化索引欄位。
- **需要補上的回歸測試 (Required Regression Test)**:
  - 增加稽核日誌結構測試，驗證寫入時具備完整生成與審批溯源資訊，且無敏感個資洩漏。

---

### AUDIT-P1-006: 缺少 Prompt Versioning 與生成環境不可重現性 (P1-8)
- **Severity**: P1 (High)
- **所在檔案與概略行號**: 
  - `src/prompts/`: 全目錄
- **目前觀察到的行為 (Observed Behavior)**:
  所有法律 Prompt 均為 TypeScript 模組中的靜態字串或動態插值函式，無版本識別碼（`promptVersion`）、無內容雜湊（`hash`）、無生效與修訂時間記錄。
- **預期行為 (Expected Behavior)**:
  每一款法律 Prompt 必須具備不可篡改的版本詮釋資料：
  `{ promptId, promptVersion, legalDomain, effectiveAt, hash }`。
  文件生成時必須記錄該次生成所採用的 `promptVersion`、`model`、`retrievalVersion`，確保數年後之訴訟審理中仍能 100% 重現當初之生成條件。
- **證據 (Evidence)**:
  `src/prompts/appeal-prompts.ts`、`defense-prompts.ts`、`toolbox-prompts.ts` 均無宣告版本資訊與雜湊。
- **對安全性／法律正確性的影響 (Impact)**:
  法規提示詞若隨程式碼更新而改動，舊案件之生成依據將不可考，違反法律合規之重現性要求。
- **建議修復方式 (Recommended Fix)**:
  為所有提示詞模組導入宣告式版本與雜湊計算工具。
- **需要補上的回歸測試 (Required Regression Test)**:
  - 測試 Prompt Versioning 註冊中心，確保每份生成的文書皆能追溯至唯一確定之 Prompt 版本與雜湊。

---

### AUDIT-P1-007: Production Content Security Policy (CSP) 存在 Wildcard 與 Unsafe 設定 (CSP Hardening)
- **Severity**: P1 (High)
- **所在檔案與概略行號**: 
  - `server/middleware/security.ts`: 行 22–45
- **目前觀察到的行為 (Observed Behavior)**:
  在生產環境 CSP 設定中：
  - `scriptSrc`: 包含 `'unsafe-inline'`
  - `imgSrc`: 包含通配符 `"https:"`
  - `connectSrc`: 包含通配符 `"https://*.run.app"`、`"https://*.dr-legal.com.tw"`
- **預期行為 (Expected Behavior)**:
  生產環境應縮限 CSP 白名單，避免使用寬鬆的通配符；對於內嵌腳本應優先採用 Nonce-based CSP 或嚴格 Hash，徹底防禦 XSS 攻擊與未授權資料外洩。
- **證據 (Evidence)**:
  `server/middleware/security.ts`:
  ```typescript
  scriptSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", "data:", "https:", "blob:"],
  connectSrc: [
    "'self'",
    "https://generativelanguage.googleapis.com",
    "https://data.judicial.gov.tw",
    "https://*.run.app",
    "https://tlr.dr-legal.com.tw",
    "https://*.dr-legal.com.tw",
    ...
  ]
  ```
- **對安全性／法律正確性的影響 (Impact)**:
  攻擊者若能透過儲存型 XSS 注入惡意圖片或腳本，通配符將允許資料向任意外部 HTTPS 伺服器洩漏。
- **建議修復方式 (Recommended Fix)**:
  1. 移除 `imgSrc` 之 `https:` 通配符，限定合法圖片來源。
  2. 縮限 `connectSrc` 與 `scriptSrc`，增加 Nonce 產生機制與 HTTP CSP 回歸測試。
- **需要補上的回歸測試 (Required Regression Test)**:
  - 增加 `productionSecurity.test.ts` 測試生產環境回應之 `Content-Security-Policy` 標頭不含 `https:` 通配符。

---

### AUDIT-P2-001: 架構邊界測試僅為靜態字串比對，缺乏端到端強制力 (P2-1)
- **Severity**: P2 (Medium)
- **所在檔案與概略行號**: 
  - `src/domain/workflow/architectureBoundary.test.ts`: 行 1–43
- **目前觀察到的行為 (Observed Behavior)**:
  現有的架構邊界測試僅用 `fs.readFileSync` 讀取少數特定目錄，檢查檔案中是否包含 `"from 'express'"` 或 `"@google/genai"`。
  並未透過編譯期或執行期測試驗證：
  - UI 是否無法直接存取 AI Secret
  - UI 請求是否無法自我賦權 approve/deploy
  - 路由層是否能繞過 Canonical Pipeline
- **預期行為 (Expected Behavior)**:
  應具備專門的 `npm run test:architecture` 套件，透過架構 AST 語法樹或模組邊界測試工具，對所有 API 路由與領域層進行嚴格邊界檢查。
- **建議修復方式 (Recommended Fix)**:
  建立專門的架構契約整合測試，防範跨層依賴與特權洩漏。

---

### AUDIT-P2-002: SSRF 防禦存在 DNS Rebinding 潛在競爭時差 (TOCTOU)
- **Severity**: P2 (Medium)
- **所在檔案與概略行號**: 
  - `server/routes/fetchUrl.ts`: 行 50–120
- **目前觀察到的行為 (Observed Behavior)**:
  `fetchUrl.ts` 在發送請求前先執行 `dns.lookup` 檢查解析出之 IP 是否為私有/保留位址，確認合法後再呼叫 HTTP Client 發起連線。
  雖然自訂了 `http.Agent` 嘗試鎖定 IP，但若外部 DNS 伺服器配置極短 TTL 並在解析後立即更換解析位址，可能存在 Time-of-Check to Time-of-Use (TOCTOU) 風險。
- **預期行為 (Expected Behavior)**:
  連線必須直接使用最初驗證通過之固定 IP 建立 TCP Socket，並在 TLS Handshake 時將 SNI 設定為原始域名，徹底消除 DNS Rebinding 可能性。
- **建議修復方式 (Recommended Fix)**:
  強化 IP Pinning 連線池，確保 Socket 連線之對端 IP 與查核 IP 100% 相同。

---

## Top 10 最危險／最急迫問題清單 (Top 10 Critical Vulnerabilities)

| 排名 | Finding ID | 嚴重度 | 核心問題摘要 | 風險分類 |
|:---:|:---|:---:|:---|:---|
| **1** | **AUDIT-P0-001** | **P0** | 上訴狀與答辯狀 Fallback 以 `documentText: ""` 繞過引註查核並偽造 PASS | 法律正確性 / 欺騙性降級 |
| **2** | **AUDIT-P0-004** | **P0** | HTTP Request Body 可直接自訂 `ApprovalContext` 偽裝律師批准 Gate | 特權提升 / 治理失效 |
| **3** | **AUDIT-P0-002** | **P0** | 核心端點以 `void [...]` 死碼欺騙治理測試之靜態字串檢查 | 測試造假 / 假安全感 |
| **4** | **AUDIT-P0-003** | **P0** | 上訴狀與答辯狀身為法院訴狀，完全脫鉤於 P4–P9 守門與交付授權 | 訴訟程式瑕疵 / 越權交付 |
| **5** | **AUDIT-P0-005** | **P0** | 工作流專案與工件存取無 Tenant 所有權比對，存在跨租戶水平越權 (IDOR) | 多租戶隔離 / 個資外洩 |
| **6** | **AUDIT-P1-004** | **P1** | 三段論法僅存在於 Prompt 內，缺乏 Runtime 結構化輸出契約與實質驗證 | 法律推論缺陷 / AI 幻覺 |
| **7** | **AUDIT-P1-001** | **P1** | 實定法規庫缺乏來源雜湊、公報出處、生效起訖日等 Provenance 詮釋資料 | 法律證據溯源瑕疵 |
| **8** | **AUDIT-P1-003** | **P1** | 引註查核缺乏跨時效力（Temporal Validity）維度，無法判別案發適用版本 | 引用廢止/失效條文 |
| **9** | **AUDIT-P1-005** | **P1** | 稽核日誌缺少 actorType、documentFingerprint 等結構化審判溯源欄位 | 法律審計中斷 |
| **10** | **AUDIT-P1-007** | **P1** | 生產環境 CSP 包含 `unsafe-inline` 與 `https:` 通配符 | 網路安全 / XSS 威脅 |

---

## 本次審查檢視的檔案清單 (Inspected Files)

1. `server/index.ts`
2. `server/middleware/auth.ts`
3. `server/middleware/tenantScope.ts`
4. `server/middleware/security.ts`
5. `server/services/auditLog.ts`
6. `server/services/legalGenerationPipeline.ts`
7. `server/services/canonicalPleadingPipeline.ts`
8. `server/services/officialCitationVerification.ts`
9. `server/routes/appeal.ts`
10. `server/routes/defense.ts`
11. `server/routes/toolbox.ts`
12. `server/routes/sdlc.ts`
13. `server/routes/unifiedWorkflow.ts`
14. `server/routes/fetchUrl.ts`
15. `src/domain/workflow/authorization.ts`
16. `src/domain/workflow/sdlcOrchestrator.ts`
17. `src/domain/workflow/verification.ts`
18. `src/domain/workflow/stageTransitions.ts`
19. `src/domain/workflow/auditEvent.ts`
20. `src/domain/case/workflow.ts`
21. `src/domain/case/citationGate.ts`
22. `src/lib/citationVerifier.ts`
23. `src/lib/generatedDocumentPipeline.ts`
24. `src/lib/finalGate/pleadingFinalGate.ts`
25. `src/lib/finalGate/pleadingExportGate.ts`
26. `src/lib/rules/courtPleadingRuleProfiles.ts`
27. `src/prompts/universal-syllogism.ts`
28. `src/types.ts`
29. `docs/governance/LEGAL_GOVERNANCE.md`
30. `docs/workflows/GATE_POLICY.md`
31. `docs/workflows/PERMISSION_MODEL.md`

---

## 本次審查執行的測試與命令清單 (Executed Tests & Commands)

1. `npm test`：執行全端測試套件（80 個測試檔案，585 項測試全部通過，費時 171.76s）
2. `npm run test:eval`：執行法治治理回歸測試 `src/lib/legalGovernance.test.ts`（15 項測試通過）
3. `npm run test:ssrf`：執行 SSRF 嚴格安全防禦驗證 `test-ssrf.cjs`（21 個高風險網址與 4 個合法網址，全部通過）
4. `npm run test:e2e`：執行端到端案件生命週期測試 `src/domain/case/caseLifecycle.e2e.test.ts`（2 項測試通過）
5. `npm run lint`：執行 TypeScript 型別檢查 `tsc --noEmit`（通過，0 個型別錯誤）
6. `grep -rn "dangerouslySetInnerHTML" src/`：確認無未過濾的 DOM 注入（返回 0 筆匹配）
7. `grep -rn "pleadingFinalGate\|canonicalPleadingPipeline\|verifyGeneratedDocument" server/ src/`：清查書狀管線掛載真實狀況
8. `grep -rn "UNIVERSAL_SYLLOGISM_RULES" server/ src/`：確認三段論法的實體引用與死碼狀況

---
**審查結論**：  
系統核心具有良好的架構骨幹，但邊界存在以「死碼符合測試」、「Fallback 避開查核」及「前端偽造 Context」等高危風險。必須按優先順序，嚴格依照 Fail-Closed 原則進行 Phase 2 至 Phase 9 之加固修復。
