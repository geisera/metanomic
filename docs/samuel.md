# Samuel

Private opportunity research workspace: https://metanomic.ai/samuel

## Connection

1. In Vercel → Metanomic → Settings → Environment Variables, add `SAM_GOV_API_KEY` for Production using an appropriately authorized SAM.gov API key. Keep it server-only; never prefix it with `NEXT_PUBLIC_`.
2. Redeploy the project after adding or rotating the variable. Never put the key in source control, chat, browser storage, or client configuration.
3. Sign in at `/samuel` using the existing Metanomic knowledge administrator credentials. All Samuel API calls verify that session and administrator membership server-side.
4. Search a title keyword (for example, Salesforce), choose a date range, and open a source notice to verify the results. Add a company profile and request a fit brief.

AI briefs reuse the project's existing AI Gateway credentials and model. No new provider account, dependencies, database schema or scheduled work is introduced.

## Scope and limitations

- Official SAM.gov public opportunities search, 20 notices per page, with agency, NAICS, notice type, set-aside and posted-date filters. Keyword is a title search, not semantic full-text search. Maximum 50 pages per search.
- API offset is a page index according to GSA documentation. Verify pagination and description access against the live account once the key is configured.
- The key-configured indicator checks configuration presence, not credential validity. The first live request verifies acceptance by SAM.gov.
- Briefing re-fetches the notice server-side and retrieves its description. User-supplied record bodies and URLs are never used as authoritative evidence or fetched.
- Description input is limited to 24,000 characters and explicitly labeled when truncated or unavailable. Attachments are not downloaded or reviewed.
- AI output is preliminary, not an eligibility determination or win prediction. Complete source requirements must be reviewed by a person.
- Profile and up to 100 shortlisted notices are stored in localStorage under an account-specific versioned key. They remain on that browser after sign-out; this is not encrypted storage and should not hold sensitive information. No cross-device synchronization. Export produces JSON. Shortlists are snapshots; refresh source notices before acting.
- Each search performs one SAM call; each brief performs up to two SAM calls and one AI call, without automatic retries. A secondary per-instance 30-request/hour/user throttle is not a distributed quota guarantee. SAM.gov also enforces its account quota.
- No monitoring, email digests, Salesforce synchronization, outreach or bid submissions in this first version.

## Verification

`npx eslint src/app/samuel src/app/api/samuel src/lib/samuel`

`npm run typecheck`

`node --experimental-strip-types --test tests/*.test.mjs`

`npm run build`

Tests use fixtures and mocked upstream responses, not a live SAM.gov key. Complete live key acceptance, result accuracy, pagination, description retrieval and AI briefing checks after configuration.
