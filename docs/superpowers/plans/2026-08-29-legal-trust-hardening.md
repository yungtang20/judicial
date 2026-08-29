# Legal Trust Hardening Implementation Plan

> Execute task-by-task in the exact order below.

**Goal:** Make precedent retrieval, credential handling, Gemini orchestration, OCR review, and evaluation fail-closed and reproducible.

**Architecture:** Add a server-side precedent verification helper that resolves every model citation through TLR and drops unverifiable entries. Keep credentials server-only. Consolidate Gemini retry/search behavior without changing callers' observable response shape. Add explicit OCR uncertainty markers and fixture-based evaluation.

**Tech Stack:** TypeScript, Express, React, Gemini SDK, Node test scripts.

**Spec:** User-provided ordered checklist in the task request.

## Global Constraints

- Execute items strictly from 1 through 6; do not begin the next item before verifying the current item.
- Unverifiable citations must be removed, not retained with a warning.
- Legal fallbacks must not invent case facts, citations, deadlines, or holdings.
- Credentials may only come from process.env.JUDICIAL_OPENDATA_ACCOUNT and process.env.JUDICIAL_OPENDATA_PASSWORD.
- Remove all six root-level patch scripts after reviewing their logic.

## Tasks

1. Add failing tests and implement verified precedent retention/removal plus fail-closed fallback; verify before continuing.
2. Add failing credential-boundary tests and implement env-only credential resolution; verify before continuing.
3. Review all six patch scripts, merge still-needed logic, delete all six, and verify no references remain.
4. Add a failing Gemini helper test, consolidate the two helpers, verify all four call paths.
5. Add a failing OCR marker test, implement fixed [不確定] output and frontend highlighting, then build.
6. Add criminal/civil/administrative/adversarial fixtures and produce fixture-level eval_report.md.

## Final Gate

Inspect the complete diff, run clean-install, lint, build, and eval checks, then commit and push.
