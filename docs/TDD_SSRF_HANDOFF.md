# SSRF TDD handoff for 5.6 Luna

## Scope

Implement the minimum production code required to make `test_judicial_url_policy.cjs` pass.
Do not redesign TLR search, precedent verification, or the appeal-petition generation path.

## Required contract

- Add `src/lib/judicialUrlPolicy.ts` exporting:
  - `validateJudicialUrl(input, { lookup })`
  - `fetchJudicialUrl(fetchImpl, input, { lookup, maxRedirects? })`
- Permit only `https://judicial.gov.tw` and HTTPS subdomains ending in `.judicial.gov.tw`.
- Reject lookalike domains, URL user-info tricks, non-HTTPS schemes, loopback, private, link-local, and unique-local addresses.
- Resolve DNS before every request. If any returned address is not public, fail closed.
- Use `redirect: "manual"`; validate every redirect target before issuing the next request.
- Bound redirect count and return a stable `JUDICIAL_URL_*` error code.
- Wire `/api/fetch-url` through `fetchJudicialUrl(fetch, url, ...)` before reading the response body.
- Do not retain a direct `fetch(url, ...)` path.

## Existing behavior that must remain green

- `npm run test:eval`
- `npm run lint`
- `npm run build`
- `test_tlr_search.cjs` must continue calling the fixed hosted endpoint
  `https://tlr.dr-legal.com.tw/v1/search`.
- `search-precedents` must remain fail closed.

## tw-legal-rag integration decision

The project already calls the same hosted TLR REST backend used by
`aa0101181514/tw-legal-rag`. Do not add the Python CLI or MCP runtime in this
SSRF fix. A later, separately scoped change may adopt its bundle concepts:
`allowed_citations`, `unread_candidates`, full-text reading, and case-history
checks.

Hosted-service terms permit individual, internal-business, research, and
professional use. A third-party product whose substantial value derives from
the hosted API may require a separate written agreement with the operator.
