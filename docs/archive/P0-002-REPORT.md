PHASE 3 — P0-002

Original Finding
Governance tests in `legalGovernance.test.ts` only check for `toContain('verifyGeneratedDocument')` and `UNIVERSAL_SYLLOGISM_RULES`. Several backend routes added `void [UNIVERSAL_SYLLOGISM_RULES, verifyGeneratedDocument];` as dead code to trick this static check.

Confirmed
YES

Root Cause
Lack of actual runtime enforcement checks in the governance regression suite. The test relied solely on source-code string matching.

Runtime Governance Before
The pipeline still enforced citation checking in `defaultLegalGenerationPipeline.execute()`, but the governance regression test itself could be fooled. A rogue route could completely skip `defaultLegalGenerationPipeline`, include `void [UNIVERSAL_SYLLOGISM_RULES, verifyGeneratedDocument];`, and the test would mistakenly pass, making the whole governance test suite effectively a false sense of security.

Runtime Governance After
Governance tests actively execute `LegalGenerationPipeline` via `vi.spyOn` over `defaultAIProvider`, proving that `UNIVERSAL_SYLLOGISM_RULES` is concatenated to the actual prompt, and asserting that the `verifyGeneratedDocument` rejection branch is active.

Dead Code Removed
- `server/routes/appeal.ts`: Removed `void [UNIVERSAL_SYLLOGISM_RULES, verifyGeneratedDocument];`
- `server/routes/defense.ts`: Removed `void [verifyGeneratedDocument, assertGeneratedDocumentVerified];`
- `server/routes/analyzeJudgment.ts`: Removed `void [UNIVERSAL_SYLLOGISM_RULES];`
- `server/routes/toolbox.ts`: Removed `void [UNIVERSAL_SYLLOGISM_RULES, verifyGeneratedDocument, assertGeneratedDocumentVerified];`

Tests Added / Replaced
- `src/lib/legalGovernance.test.ts`: Replaced weak `toContain` heuristics with a robust runtime test `verifies generated documents at runtime and enforces UNIVERSAL_SYLLOGISM_RULES in the prompt`.

Anti-Bypass Verification
- Dead code only → PASS? NO (Test fails if actual execution trace doesn't show syllogism in payload)
- Source string only → PASS? NO
- Verifier removed → Test fails? YES
- Verifier forced failure → PASS possible? NO (Verified by Fail-Closed logic)
- UNIVERSAL_SYLLOGISM_RULES actually enforced? YES (Observed via mock inspection)

Test Results
- P0-002 targeted tests: PASS
- `npm test`: PASS (81 files, 594 tests)
- `npm run test:eval`: PASS (15 tests)
- `npm run test:ssrf`: PASS (21 URLs blocked)
- `npm run lint`: PASS (0 errors)

Files Modified
- `server/routes/appeal.ts`
- `server/routes/defense.ts`
- `server/routes/analyzeJudgment.ts`
- `server/routes/toolbox.ts`
- `src/lib/legalGovernance.test.ts`
- `docs/audit/CURRENT_RUNTIME_AUDIT.md`

Remaining Risk
Low to none on this specific finding.

Status
FIXED
