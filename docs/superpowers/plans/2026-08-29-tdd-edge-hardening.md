# TDD Edge Hardening Implementation Plan

**Goal:** Add fail-closed tests and implementations for OCR, Taiwan case parsing, TLR failures, precedent matching, credentials, Gemini responses, and concurrent verification.

**Order:** OCR → case parsing → TLR → precedent verification → credentials/API → Gemini → concurrency.

**Global constraints:** Each batch must have a RED test before production code, preserve fail-closed behavior, and run the full release gate before commit/push.
