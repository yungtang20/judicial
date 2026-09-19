# Pleading Legacy Dependency Map

## Scope and evidence

This map covers the legacy keyword-based `formatChecker.ts` path found by repository-wide static search during P10. It does not claim runtime coverage beyond the listed imports and calls.

## Current dependency graph

```text
Production UI
ToolResultPanel.tsx
  -> FormatCheckerDisplay.tsx
     -> verifyDocumentFormat(documentText)
        -> FormatCheckItem[]

Legacy regression
formatChecker.test.ts
  -> verifyDocumentFormat(documentText, { pleadingType? })

Canonical generated-pleading path (separate; no production caller found)
buildStructuredPleadingDraft
  -> verifyPleadingCompliance
  -> reviewPleading
  -> applyPleadingRevision
  -> independentlyReReview
  -> evaluateFinalGate

Format boundaries
Generated pleading -> verifyGenerationTemplate(caseType, FormatProfile)
External DOCX/PDF -> verifyExternalDocument(...) -> UNVERIFIED (physical parser out of scope)
```

No import from `generatedDocumentPipeline.ts`, `docGeneration.ts`, API routes, or server services to `formatChecker.ts` was found. The generated-document pipeline performs anti-ghost citation verification and is not a replacement for pleading content or layout verification.

## Lifecycle

| Stage | Status | Evidence / next condition |
|---|---|---|
| Adapter | ACTIVE | `verifyDocumentFormat` retains the existing text-to-`FormatCheckItem[]` contract. Keyword presence never returns `COMPLIANT`. |
| Migration | PARTIAL | The only production display now labels results as legacy text indicators and does not present a pass/compliance conclusion. Canonical P4-P9 modules are not yet supplied with production `CaseInput` and approval evidence. |
| Deprecation | ACTIVE | The legacy interface, `passed` field, and function are marked `@deprecated`. |
| Removal | BLOCKED | Requires production caller migration, regression proof, and explicit human approval. P10 does not delete or rename the legacy module. |

## Known consumers

| Consumer | Kind | Current dependency |
|---|---|---|
| `src/components/toolbox/FormatCheckerDisplay.tsx` | production UI | Direct function and type import |
| `src/components/toolbox/ToolResultPanel.tsx` | production UI parent | Renders `FormatCheckerDisplay` for every generator result |
| `src/lib/formatChecker.test.ts` | test | Direct function import |

## Migration constraints

- `ToolResultPanel` receives a `LegalToolboxResult` containing unstructured `documentText`; it does not receive the `CaseInput`, approved Rule Profile, P8 report, or P9 Final Gate report required by the canonical pipeline.
- The toolbox includes generators that are not civil pleadings. Applying the civil Rule Profile to every result would expand legal scope and produce false conclusions.
- `verifyExternalDocument` cannot replace the text adapter because physical DOCX/PDF layout parsing is explicitly outside the current SDD scope.
- `exportReport.ts` exports a separate `LegalWorkflowState` analysis report. Static evidence does not identify it as a `StructuredPleadingDraft` export path.

## Human approval gate for removal

Deletion is allowed only after all of the following are evidenced and approved by a human:

1. Every pleading production caller supplies structured case data and a current P9 Final Gate report.
2. Non-pleading toolbox documents are explicitly excluded from civil pleading rules.
3. Copy, download, print, and API delivery paths enforce their applicable gate.
4. Legacy regression tests are replaced by canonical integration tests without losing the Article 116/117/244 mapping protections.

Until then, `formatChecker.ts` remains a deprecated, non-authoritative indicator adapter.
