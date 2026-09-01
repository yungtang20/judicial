# Smart Legal Assistant - Architecture & Technical Documentation

## 1. System Overview
Smart Legal Assistant is a React-based Single Page Application (SPA) powered by Vite, utilizing a Node.js (Express) backend for secure proxying of AI services and judicial open data platforms.

## 2. Core Architecture (Separation of Concerns)
To maintain high readability and low technical debt, the application is divided into specific layers:

- **Presentation Layer (UI)**: `src/components/SmartAppealAssistant.tsx` acts as the primary orchestrator, rendering the Multi-Step wizard (Step 1 to Step 4).
- **Business Logic & Utilities (Lib)**:
  - `classifier.ts`: Contains the deterministic algorithms to classify case types and detect procedural anomalies (e.g., re-trials, labor mediation).
  - `deadlineCalculator.ts`: Calculates judicial deadlines (e.g., 20-day appeal windows) while properly handling Taiwanese national holidays and weekends.
  - `pdfUtils.ts`: Encapsulates PDF.js logic, handling text extraction and Canvas-based image rendering for OCR fallbacks.
  - `deidentifier.ts`: A pure function layer executing Regular Expressions to strip PII (Personal Identifiable Information) before LLM submission.
- **State Persistence (Hooks)**: Auto-save mechanisms are decoupled to prevent UI re-render blocking.
- **API Proxy Layer (Server)**: `server.ts` handles all external network requests. **Crucially, the Gemini API key and Judicial Open Data tokens are NEVER exposed to the client-side bundle.**

## 3. Data Flow
1. **Input**: User uploads a PDF or texts. `pdfUtils.ts` processes it. If image-only, the backend `/api/ocr` is invoked.
2. **De-identification**: User clicks "De-identify", triggering `deidentifier.ts` to mask sensitive data locally.
3. **Analysis**: Client calls `/api/analyze-judgment`. The backend validates the payload and invokes `@google/genai` with structured prompts.
4. **Drafting**: Extracted JSON is populated into the React state, allowing the user to review facts, issues, and evidence before triggering the final `/api/generate-appeal-petition`.
5. **Legal reasoning and citation checks**: All legal-domain prompts include the shared universal syllogism rule (major premise, minor premise, subsumption, conclusion). Generated legal documents pass through `verifyGeneratedDocument`, while externally supplied documents can be checked independently by `LegalDocAiChecker`.

## 4. Security & Privacy
- **Zero-Trust Client**: Client has no direct access to LLMs or external databases.
- **Data Minimization**: Regular expressions proactively mask ID numbers, phone numbers, and addresses.
- **Stateless Backend**: The Node.js server does not persist user uploads, ensuring GDPR/PDPA compliance by design.

## 5. Testing Strategy
- **Vitest Framework**: Used for unit testing core business logic (`classifier.ts`, `deadlineCalculator.ts`, `deidentifier.test.ts`).
- **Automated gates**: GitHub Actions runs `npm ci`, production dependency audit, TypeScript lint, Vitest, and the production build for pushes and pull requests.
- **Governance regressions**: `legalGovernance.test.ts` protects universal syllogism coverage, legacy-feature removal, dynamic toolbox counts, generated-document verification, and external-document checking.
- **Coverage**: Vitest covers core business logic and governance regressions; no unverified 100% coverage claim is made.
