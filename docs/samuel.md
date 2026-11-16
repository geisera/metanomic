# Samuel

Private workspace: https://metanomic.ai/samuel

## Current user workflow

One keyword box searches titles AND available descriptions in the official public SAM.gov active-notice CSV extract. There is no collection setup, mandatory agency/NAICS filter, paid provider or API-key requirement for search. Case-insensitive substring matching requires every entered word somewhere in the combined title and description. The existing optional filters and 364-day default date window remain. Results sort newest first, with stable notice-ID tie-breaking, 20 per page (up to 50 pages).

Source: https://s3.amazonaws.com/falextracts/Contract%20Opportunities/datagov/ContractOpportunitiesFullCSV.csv

The server streams and validates the entire CSV into a projected NDJSON disk cache before serving results. Search does not download just title matches. Cache refresh is demand-driven after six hours, single-flight per instance, with atomic replacement. Failed refreshes retain the last valid cache and display a stale warning. Empty, malformed or oversized extracts are rejected; no silent title-only fallback. The source date, notice count and available-description count are displayed. No archives or attachments are searched; source descriptions can be incomplete or shortened. Published active status does not guarantee an open response period.

This is an ephemeral per-server cache, not a durable shared database index. A cold instance downloads the approximately 213 MB extract; subsequent searches reuse the projected file. The download has a 240-second timeout and 400 MB source cap; projected output is limited to 240 MB, allowing old and replacement files within the server's temporary disk budget. The route allows 300 seconds. The first search can be slower; warm searches scan locally. No scheduled job or new dependency is added.

Live AI briefs still retrieve the selected notice and description through the public API with the existing global request budget; only briefs require a company profile. Search no longer spends that API budget. Legacy protected collection/index endpoints remain available internally but are not part of the user workflow.

Verification on the November 16, 2026 extract: 70,669 records, 59,147 with descriptions. Salesforce in the default date window matched 4 notices: 1 title match and 3 description-only matches. Local preparation took approximately 14 seconds excluding download; warm search approximately 1 second. This does not establish parity with SAM.gov website search or production latency.

## Retained index backend

1. Sign in with an existing Metanomic knowledge administrator account.
2. Create a collection using an agency and/or NAICS code, optional notice type and set-aside, and a fixed posted-date window (maximum 364 days between dates). The editable initial suggestion is NAICS 541512 over the previous 90 days. This is not a claim about the company's registered codes.
3. Click **Update opportunities**. Each click reserves 1–5 API requests and performs one small batch. Metadata is collected without a title filter, in pages of 20. Queued descriptions are processed before the next metadata page. Repeat manually to continue from the saved cursor.
4. Search the stored titles and available descriptions. All keyword words must match using Postgres `simple` text search. No SAM.gov or AI requests run during searches. Optional related terms use a small explicit mapping (for example Salesforce → CRM, Service Cloud); related results are labeled and placed after exact keyword matches.
5. Check coverage counts: metadata collected versus upstream total; descriptions ready, pending, unavailable or truncated; last update; reserved API budget. Zero matches means zero matches in this collection, not no opportunities on SAM.gov.
6. Request a preliminary AI brief against your company profile. The brief uses the stored snapshot, not a new SAM request. Open the original notice to verify current requirements and dates.

Collections and indexed notices live in the existing Metanomic Supabase database, owned by the signed-in administrator. Company profiles and shortlists remain browser-local and do not sync. Existing shortlists remain usable; a brief requires the notice to exist in the selected collection.

## Request controls

- No schedules, automatic collection loops, or retries are introduced.
- `SAM_GOV_API_KEY` is server-only. Never use `NEXT_PUBLIC_` for this key.
- `SAMUEL_DAILY_REQUEST_LIMIT` optionally sets an integer 1–1000; default is **10 reservations per UTC day**, shared across Samuel administrators and server instances. This is an application ceiling, not a claim about the account's SAM.gov allowance. Choose a value no greater than the account's actual allowance, allowing for any other key usage.
- A batch reserves its entire chosen allowance atomically before upstream calls. Failed and unused reservations count against the cap, deliberately favoring conservative consumption after crashes. There is no refund race.
- A 90-second database lease prevents concurrent updates of the same collection. Production requests have a 60-second runtime limit. The lease expires after interrupted requests so collection can resume; completed batches release it.
- Each metadata page costs one request, each description costs one request. No LLM is used for collection or search. Briefs use one existing AI Gateway call with a per-instance 30/hour/user throttle.
- Every collection is capped at 50 metadata pages (1,000 notices). Narrow the scope if exceeded. Supabase storage and platform usage still apply.

## Coverage limitations

- Fixed date windows do not automatically roll forward. Create a new collection to extend the window.
- **Refresh from first page** starts another metadata pass and retries descriptions as their records are revisited. Unchanged completed pages are otherwise cached; later manual batches resume without downloading them again.
- Metadata ordering and totals can change upstream during collection; this is not a transactional snapshot of SAM.gov. Refresh to reconcile changes. Records absent from a later response are retained as explicitly dated snapshots, not silently treated as current.
- Description failures are recorded as unavailable; they do not block metadata collection forever. The next refresh can retry them.
- Indexed descriptions are limited to 100,000 characters, explicitly marked if shortened; AI input is limited to 24,000. Attachments are not indexed or reviewed. Stored active status does not guarantee an open response period.
- No promise of identical results to SAM.gov's full website search. Search covers the selected scope and retrieved text only.

## Database

Schema snapshot: `supabase/samuel-index.sql`. Applied through the database connector. The local migration CLI was unavailable when packaging this change; this file is an explicit schema snapshot, not a generated migration-history entry.

Tables: `samuel_scopes`, `samuel_notices`, `samuel_request_budget`. All have RLS. Notice access follows the owner's scope and existing `knowledge_admins` membership. RPCs are security-invoker and not executable by anonymous users. No new service-role key or bypass is used. Search uses a generated tsvector with GIN index.

## Verification

Run changed-file ESLint, TypeScript, `node --experimental-strip-types --test tests/*.test.mjs`, and `npm run build`.

Database transaction tests verify description-only matching, exact/related separation, status filtering, lock exclusion, budget rejection, and non-admin isolation. Test records and budget changes are rolled back. Unit tests verify resumable batches, request caps, safe source retrieval, no external calls for index searches, and cached briefing. Live authenticated collection and visual workspace QA still require an administrator session.

Date boundary: defaults and validation use a 364-day interval to avoid the upstream rejection at the full-year boundary. Longer custom ranges are rejected locally before reserving or using an API call.
