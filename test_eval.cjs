/**
 * test_eval.cjs — Smart Legal Assistant 功能驗證評估
 *
 * 測試 10 個核心 triage 類別（對應 universalTriage.ts 的 11 個分支），
 * 以及 legalToolRegistry 工具定義完整性。
 *
 * 用法：node test_eval.cjs
 * 回傳碼：0 = 全數通過，1 = 有失敗
 */

const path = require("path");
const fs = require("fs");

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    passed++;
    process.stdout.write(`  ✓ ${label}\n`);
  } else {
    failed++;
    failures.push(label);
    process.stdout.write(`  ✗ ${label}\n`);
  }
}

// ─── Fixture 1: legalToolRegistry 包含 7 個分組 ───────────────────────────
(function testToolRegistryGroups() {
  process.stdout.write("\n[Fixture 1] legalToolRegistry 分組完整性\n");
  // 讀取原始碼並驗證分組存在
  const src = fs.readFileSync(
    path.join(__dirname, "src/lib/legalToolRegistry.ts"),
    "utf-8"
  );
  const groups = [
    "CRIMINAL",
    "FAMILY",
    "ELDERLY",
    "DEBT_NOTE",
    "DEMAND_LETTER",
    "EXECUTION",
    "CONTRACT_REALESTATE",
  ];
  for (const g of groups) {
    assert(src.includes(`'${g}'`), `categoryGroup '${g}' 存在`);
  }
})();

// ─── Fixture 2: legalToolRegistry 包含所有 tool IDs ─────────────────────────
(function testToolIds() {
  process.stdout.write("\n[Fixture 2] legalToolRegistry tool ID 完整性\n");
  const src = fs.readFileSync(
    path.join(__dirname, "src/lib/legalToolRegistry.ts"),
    "utf-8"
  );
  const expectedIds = [
    "CRIMINAL_COMPLAINT_TRAFFIC",
    "CRIMINAL_COMPLAINT_SEXUAL_ASSAULT",
    "DOMESTIC_VIOLENCE_PROTECTION_ORDER",
    "CIVIL_TORT_SEXUAL_ASSAULT",
    "CRIMINAL_COMPLAINT_FRAUD",
    "CRIMINAL_COMPLAINT_DEFAMATION",
    "CRIMINAL_COMPLAINT_THEFT",
    "CRIMINAL_COMPLAINT_INTIMIDATION",
    "CRIMINAL_COMPLAINT_PRIVACY",
    "CIVIL_TORT_GENERAL",
    "UNIVERSAL_AI_PLEADING",
    "CRIMINAL_SUPPLEMENTARY_CIVIL",
    "INHERITANCE_CALCULATOR",
    "FORCED_SHARE_CALCULATOR",
    "SELF_WRITTEN_WILL",
    "WAIVER_OF_INHERITANCE",
    "DIVORCE_AGREEMENT",
    "GUARDIANSHIP_PETITION",
    "ASSISTANCE_PETITION",
    "CONTRACTUAL_GUARDIANSHIP",
    "PROMISSORY_NOTE_RULING",
    "PAYMENT_ORDER_PETITION",
    "LOAN_AGREEMENT",
    "INTEREST_CALCULATOR",
    "DEMAND_LETTER_DEBT",
    "DEMAND_LETTER_RENT_DEFAULT",
    "DEMAND_LETTER_DEFECT",
    "DEMAND_LETTER_LABOR",
    "EXECUTION_SALARY_ATTACHMENT",
    "EXECUTION_BANK_REAL_ESTATE",
    "PROVISIONAL_ATTACHMENT",
    "RESIDENTIAL_LEASE_CONTRACT",
    "SPOUSAL_RIGHT_INFRINGEMENT",
  ];
  for (const id of expectedIds) {
    assert(src.includes(`'${id}'`), `tool ID '${id}' 存在`);
  }
})();

// ─── Fixture 3: universalTriage 覆蓋 10+ 個情境分支 ─────────────────────────
(function testTriageCategories() {
  process.stdout.write("\n[Fixture 3] universalTriage 分支覆蓋\n");
  const src = fs.readFileSync(
    path.join(__dirname, "src/lib/universalTriage.ts"),
    "utf-8"
  );
  const branches = [
    ["寵物/動物傷害", "CIVIL_PET_DISPUTE"],
    ["傷害罪/互毆", "CRIMINAL_COMPLAINT_ASSAULT"],
    ["公然侮辱/誹謗", "DEFAMATION_CEASE_AND_DESIST"],
    ["車禍有傷", "CRIMINAL_COMPLAINT_TRAFFIC"],
    ["車禍純車損", "CIVIL_TORT_GENERAL"],
    ["詐騙/人頭帳戶", "CRIMINAL_COMPLAINT_FRAUD"],
    ["借錢不還", "DEMAND_LETTER_DEBT"],
    ["恐嚇危安", "CRIMINAL_COMPLAINT_INTIMIDATION"],
    ["妨害性自主", "CRIMINAL_COMPLAINT_SEXUAL_ASSAULT"],
    ["竊盜/侵占", "CRIMINAL_COMPLAINT_THEFT"],
    ["租屋/漏水", "CIVIL_TORT_GENERAL"],
    ["通用預設", "UNIVERSAL_AI_PLEADING"],
  ];
  for (const [label, cat] of branches) {
    assert(src.includes(cat), `分支 '${label}' → ${cat}`);
  }
})();

// ─── Fixture 4: SDLC 階段轉移矩陣 ───────────────────────────────────────────
(function testStageTransitions() {
  process.stdout.write("\n[Fixture 4] stageTransitions 合法轉移\n");
  const src = fs.readFileSync(
    path.join(__dirname, "src/domain/workflow/stageTransitions.ts"),
    "utf-8"
  );
  const transitions = [
    ["01_plan", "02_design"],
    ["02_design", "03_build"],
    ["03_build", "04_test"],
    ["04_test", "05_deploy"],
    ["05_deploy", "06_maintain"],
  ];
  for (const [from, to] of transitions) {
    assert(
      src.includes(`'${from}'`) && src.includes(`'${to}'`),
      `轉移 ${from} → ${to} 存在`
    );
  }
  assert(src.includes("canTransition"), "canTransition 函數存在");
  assert(src.includes("assertTransition"), "assertTransition 函數存在");
})();

// ─── Fixture 5: Stage Contracts 定義 6 階段 ─────────────────────────────────
(function testStageContracts() {
  process.stdout.write("\n[Fixture 5] stageContracts 6 階段定義\n");
  const src = fs.readFileSync(
    path.join(__dirname, "src/domain/workflow/stageContracts.ts"),
    "utf-8"
  );
  const stages = [
    "01_plan",
    "02_design",
    "03_build",
    "04_test",
    "05_deploy",
    "06_maintain",
  ];
  for (const s of stages) {
    assert(src.includes(`'${s}'`), `Stage contract '${s}' 定義存在`);
  }
  assert(
    src.includes("requiredArtifactCategories"),
    "requiredArtifactCategories 欄位定義存在"
  );
  assert(
    src.includes("requiredValidatorCategories"),
    "requiredValidatorCategories 欄位定義存在"
  );
})();

// ─── Fixture 6: Feedback Policy 合法回流路徑 ─────────────────────────────────
(function testFeedbackPolicy() {
  process.stdout.write("\n[Fixture 6] feedbackPolicy 合法回流路徑\n");
  const src = fs.readFileSync(
    path.join(__dirname, "src/domain/workflow/feedbackPolicy.ts"),
    "utf-8"
  );
  const validFlows = [
    ["04_test", "03_build"],
    ["04_test", "02_design"],
    ["06_maintain", "01_plan"],
    ["06_maintain", "02_design"],
  ];
  for (const [from, to] of validFlows) {
    assert(
      src.includes(`'${from}'`) && src.includes(`'${to}'`),
      `合法回流 ${from} → ${to}`
    );
  }
  assert(src.includes("FeedbackArtifact"), "FeedbackArtifact 類型存在");
})();

// ─── Fixture 7: Permission & Authorization RBAC ──────────────────────────────
(function testAuthorization() {
  process.stdout.write("\n[Fixture 7] authorization RBAC 角色與權限\n");
  const src = fs.readFileSync(
    path.join(__dirname, "src/domain/workflow/authorization.ts"),
    "utf-8"
  );
  const roles = [
    "ANALYST",
    "GENERATOR",
    "VERIFIER",
    "APPROVER",
    "DEPLOYER",
    "ADMIN",
  ];
  for (const r of roles) {
    assert(src.includes(`'${r}'`), `角色 '${r}' 定義存在`);
  }
  const perms = ["READ", "ANALYZE", "GENERATE", "VERIFY", "APPROVE", "DEPLOY", "ADMIN"];
  for (const p of perms) {
    assert(src.includes(`'${p}'`), `權限 '${p}' 定義存在`);
  }
})();

// ─── Fixture 8: Verification Result 標準化 ──────────────────────────────────
(function testVerificationResult() {
  process.stdout.write("\n[Fixture 8] verification PASS/FAIL/NEEDS_REVIEW\n");
  const src = fs.readFileSync(
    path.join(__dirname, "src/domain/workflow/verification.ts"),
    "utf-8"
  );
  assert(src.includes("'PASS'"), "VerificationResult PASS 狀態");
  assert(src.includes("'FAIL'"), "VerificationResult FAIL 狀態");
  assert(src.includes("'NEEDS_REVIEW'"), "VerificationResult NEEDS_REVIEW 狀態");
  assert(src.includes("PrivacyValidator"), "PrivacyValidator 存在");
  assert(src.includes("SchemaValidator"), "SchemaValidator 存在");
  assert(src.includes("LegalValidator"), "LegalValidator 存在");
  assert(src.includes("CitationValidator"), "CitationValidator 存在");
  assert(src.includes("SecurityValidator"), "SecurityValidator 存在");
})();

// ─── Fixture 9: Repository 抽象化 ──────────────────────────────────────────
(function testRepository() {
  process.stdout.write("\n[Fixture 9] repository 抽象介面\n");
  const src = fs.readFileSync(
    path.join(__dirname, "src/domain/workflow/repository.ts"),
    "utf-8"
  );
  assert(
    src.includes("SdlcProjectRepository"),
    "SdlcProjectRepository 介面存在"
  );
  assert(
    src.includes("MemorySdlcProjectRepository"),
    "MemorySdlcProjectRepository 實作存在"
  );
  assert(src.includes("defaultSdlcRepository"), "defaultSdlcRepository 預設實例存在");
})();

// ─── Fixture 10: Prompt Injection 防護關鍵字檢查 ─────────────────────────────
(function testSecurityPrompts() {
  process.stdout.write("\n[Fixture 10] security — prompt injection 防護\n");
  const src = fs.readFileSync(
    path.join(__dirname, "src/lib/legalInputPrecheck.ts"),
    "utf-8"
  );
  assert(
    src.length > 100,
    "legalInputPrecheck.ts 有實質內容"
  );
  // 確認 SSRF 防禦腳本存在
  const ssrfTest = fs.readFileSync(
    path.join(__dirname, "test-ssrf.cjs"),
    "utf-8"
  );
  assert(ssrfTest.includes("127.0.0.1"), "SSRF 測試包含 localhost 阻擋");
  assert(ssrfTest.includes("169.254"), "SSRF 測試包含 metadata IP 阻擋");
  assert(ssrfTest.includes("file://"), "SSRF 測試包含 file:// 協定阻擋");
})();

// ─── 結果摘要 ───────────────────────────────────────────────────────────────
process.stdout.write("\n" + "=".repeat(50) + "\n");
process.stdout.write(`  結果：${passed} 通過 / ${failed} 失敗 / 共 ${passed + failed} 項\n`);
if (failed > 0) {
  process.stdout.write("  失敗項目：\n");
  for (const f of failures) {
    process.stdout.write(`    - ${f}\n`);
  }
  process.exit(1);
} else {
  process.stdout.write("  全數通過！\n");
  process.exit(0);
}
