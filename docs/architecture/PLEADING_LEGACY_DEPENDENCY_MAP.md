# Pleading Legacy Dependency Map

## Scope and evidence

This map covers the legacy keyword-based `formatChecker.ts` path found by repository-wide static search during P10. It does not claim runtime coverage beyond the listed imports and calls.

## Current dependency graph

```text
Production UI
ToolResultPanel.tsx
  -> canonical complianceChecklist + P9 delivery authorization

Removed legacy path
FormatCheckerDisplay.tsx / formatChecker.ts / formatChecker.test.ts
  -> deleted after production migration, regression proof, and Human Gate approval

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
| Adapter | REMOVED | Deleted after zero reachable production callers and explicit Human Gate approval. |
| Migration | COMPLETE | `ToolResultPanel` no longer imports or renders the legacy display. Supported court pleadings receive server-owned canonical P4-P9 results; unsupported categories remain 422. |
| Deprecation | COMPLETE | Superseded by canonical structured findings and P9 delivery authorization. |
| Removal | COMPLETE | `FormatCheckerDisplay.tsx`, `formatChecker.ts`, and `formatChecker.test.ts` removed after 2026-09-14 Human Gate approval. |

## Known consumers

| Consumer | Kind | Current dependency |
|---|---|---|
| `src/components/toolbox/FormatCheckerDisplay.tsx` | removed | No production importer remained before deletion |
| `src/components/toolbox/ToolResultPanel.tsx` | production UI | Migrated to canonical `complianceChecklist` and P9 delivery authorization |
| `src/lib/formatChecker.test.ts` | removed | Mapping protections retained by canonical Rule Profile, compliance, route, and P9 tests |

## Migration constraints

- `ToolResultPanel` receives only server-owned `pleadingDeliveryAuthorization` plus a payload-bound document fingerprint; it does not independently infer compliance from text.
- The toolbox includes generators that are not civil pleadings. Applying the civil Rule Profile to every result would expand legal scope and produce false conclusions.
- `verifyExternalDocument` cannot replace the text adapter because physical DOCX/PDF layout parsing is explicitly outside the current SDD scope.
- `exportReport.ts` exports a separate `LegalWorkflowState` analysis report. Static evidence does not identify it as a `StructuredPleadingDraft` export path.

## Human approval gate for removal

Deletion is allowed only after all of the following are evidenced and approved by a human:

1. Every pleading production caller supplies structured case data and a current P9 Final Gate report.
2. Non-pleading toolbox documents are explicitly excluded from civil pleading rules.
3. Copy, download, print, and API delivery paths enforce their applicable gate.
4. Legacy regression tests are replaced by canonical integration tests without losing the Article 116/117/244 mapping protections.

The Human Gate approved removal on 2026-09-14 after these conditions were evidenced. The canonical pipeline remains the only court-pleading compliance path.
