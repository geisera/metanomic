# Samuel

Private workspace: https://metanomic.ai/samuel

## Current user workflow

One keyword box searches titles AND available descriptions from the official public SAM.gov active-notice CSV extract. There is no collection setup, mandatory agency/NAICS filter, paid provider or API-key requirement for search. The existing optional filters and 364-day default date window remain. Results sort newest first, with stable notice-ID tie-breaking, 20 per page (up to 50 pages).

Source: https://s3.amazonaws.com/falextracts/Contract%20Opportunities/datagov/ContractOpportunitiesFullCSV.csv

Keyword matching uses Postgres full-text search (`simple` configuration, no stemming). Every entered word must appear as a whole word in the combined title and description, case-insensitively. `"Quoted phrases"` and `-excluded` words are supported. Punctuation separates words on both sides, so `Salesforce.com` and `follow-on` match their parts. This replaces the earlier substring match: `sales` no longer matches `Salesforce`.

### Extract store

Searches read a shared Postgres store (`samuel_extract_notices`) through `samuel_extract_search`. A search never downloads the source file, so there is no cold-start download and every server instance returns the same version. Schema: `supabase/migrations/20261116_samuel_extract_store.sql`.

A scheduled job, `GET /api/samuel/ingest`, keeps the store current:

1. It sends a `HEAD` request to the source and compares `ETag` (or `Last-Modified`) with the published version. An unchanged file is not downloaded; only the check time is recorded.
2. A changed file is streamed, validated and projected to a temporary disk file. Empty, malformed, oversized or schema-changed files are rejected, as is a file with more than 20% fewer notices than the published version.
3. Only notices whose content hash changed are written. Notices that left the extract are removed and the new version is published in one transaction, which also verifies that the stored notice count equals the extract's.

Runs are single-flight across instances. A failed run leaves the published version in place and is recorded in `samuel_extract_versions`. A run that reaches its time budget is recorded as `partial`; the next run skips rows already written and continues. Changed rows become visible as they are written, while removals and the version switch are atomic. Descriptions are stored up to 100,000 characters.

Schedule (`vercel.json`): four daily checks at 05:23, 09:23, 14:23 and 20:23 UTC. Each cron entry runs once a day, which every Vercel plan allows; on Pro these can be replaced by one hourly entry.

Setup, in this order:

1. Apply the migration to the Metanomic Supabase project.
2. Add `SUPABASE_SECRET_KEY` (a Supabase secret key; `SUPABASE_SERVICE_ROLE_KEY` is also accepted) and `CRON_SECRET` (any long random string) to the Vercel Production environment. Both are server-only; never use a `NEXT_PUBLIC_` prefix.
3. Deploy, then run the first load: `curl -H "Authorization: Bearer $CRON_SECRET" https://metanomic.ai/api/samuel/ingest`. Repeat while the response status is `partial`.

Until the first load completes, extract search returns a "not been loaded yet" error; live API search is unaffected. `?force=1` reloads an unchanged file and accepts a file the shrink guard rejected.

### Freshness shown to users

Results show SAM.gov's own publication time for the loaded file (or "unknown publication date" when the source did not report one), the load time, the notice count and the available-description count. A warning appears when the latest refresh failed, when no scheduled check has succeeded for 26 hours, or when the loaded file is more than 36 hours old. No archives or attachments are searched; source descriptions can be incomplete or shortened. Published active status does not guarantee an open response period.

Live AI briefs still retrieve the selected notice and description through the public API with the existing global request budget; only briefs require a company profile. Search does not spend that API budget. Legacy protected collection/index endpoints remain available internally but are not part of the user workflow.

Verification: unit tests cover source-change detection, incremental writes and removals, duplicate rows, rejection of bad files, partial runs and single-flight. The migration and the ingest-to-search path were exercised against an in-process Postgres with synthetic data. Not yet verified: a load of the real ~213 MB extract, its duration on Vercel, and behavior against the production Supabase project.

## Retained index backend

1. Sign in with an existing Metanomic knowledge administrator account.
2. Create a collection using an agency and/or NAICS code, optional notice type and set-aside, and a fixed posted-date window (maximum 364 days between dates). The editable initial suggestion is NAICS 541512 over the previous 90 days. This is not a claim about the company's registered codes.
3. Click **Update opportunities**. Each click reserves 1–5 API requests and performs one small batch. Metadata is collected without a title filter, in pages of 20. Queued descriptions are processed before the next metadata page. Repeat manually to continue from the saved cursor.
4. Search the stored titles and available descriptions. All keyword words must match using Postgres `simple` text search. No SAM.gov or AI requests run during searches. Optional related terms use a small explicit mapping (for example Salesforce → CRM, Service Cloud); related results are labeled and placed after exact keyword matches.
5. Check coverage counts: metadata collected versus upstream total; descriptions ready, pending, unavailable or truncated; last update; reserved API budget. Zero matches means zero matches in this collection, not no opportunities on SAM.gov.
6. Request a preliminary AI brief against your company profile. The brief uses the stored snapshot, not a new SAM request. Open the original notice to verify current requirements and dates.

Collections and indexed notices live in the existing Metanomic Supabase database, owned by the signed-in administrator. Company profiles and shortlists remain browser-local and do not sync. Existing shortlists remain usable; a brief requires the notice to exist in the selected collection.

## Request controls

- The extract ingest above is the only scheduled job; it calls no SAM.gov API and spends no request budget. No automatic collection loops or API retries are introduced.
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

## Optional SAM.gov entity record

The company sidebar includes independent, default-off controls for showing the entity panel and using the selected record in fit briefs. Enter a 12-character UEI, look up the registered public entity, and confirm the business. Confirming a different entity resets brief usage to off. Remove clears the selection and disables entity context. UEI and preferences are stored under `samuel:entity:v1:<userId>` in this browser; full entity records are not persisted. After reload, use Look up / refresh to display the record again. Hiding the panel does not change brief usage.

Authenticated same-origin lookups use the existing SAM_GOV_API_KEY with the documented `/entity-information/v3/entities` endpoint, exact UEI and entityRegistration/coreData/assertions sections. Only a whitelist of business name, UEI, CAGE, registration dates/status, NAICS and business classifications is returned. Financial, tax, banking, contact and security-level fields are discarded. Non-public, mismatched and ambiguous records are rejected. Records not registered with SAM.gov (UEI-only) are not included by this endpoint's default query.

Lookup reserves one request against the existing shared daily limit. A brief with entity context reserves three (entity, notice, description), instead of two. The browser submits only the selected UEI; the server freshly retrieves the entity before the AI call. Failure stops the brief rather than silently dropping requested entity context. No increase to the daily ceiling. Briefs distinguish self-reported capabilities from registry-reported entity facts and show the entity and retrieval time used. Entity data does not verify ownership or establish eligibility for any solicitation.

Validation: unit tests cover sanitization, exact matching, independent toggles, missing/ambiguous records, API permission failure, and opt-in/out AI context. Live access with the production key and an authenticated user's UEI remains unverified; no key is exposed or retrieved for local testing.

## Search source selection

Users choose Public extract (the unchanged default, titles and descriptions) or Live SAM.gov API (title-only). Live search and each pagination request reserve one call against the existing shared budget and use the server's configured Metanomic SAM_GOV_API_KEY. User-provided keys are not implemented. Extract searches need no key or API quota. There is no automatic fallback on empty results, quota errors or outages: users explicitly choose the other source and submit again. Result labels identify the actual source; pagination preserves the source and filters of the submitted search even if the form selection changes. Existing briefs and entity lookups are unchanged.
