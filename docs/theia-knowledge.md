# Theia Knowledge Base — Foundation (Milestone 1)

## Current status

The Metanomic source code contains:
- Private administrator interface at `/admin/knowledge`.
- Supabase Auth email/password login, server-verified administrator role, short-lived HttpOnly session.
- Document list, text/Markdown editing, import from `.md` / `.txt`, search/filter.
- Draft, Published and Archived statuses; revision history and restoration.
- Revision conflict protection so stale browser tabs cannot silently overwrite changes.
- SQL migration defining RLS-protected documents, revisions, administration memberships, and the tables required by later vector ingestion.

**Not yet active:** This deployment does not connect to Supabase until you create a dedicated Metanomic project and set the two environment variables. A Published document is stored and approved but is **not yet retrieved by Theia**. PDF ingestion, embeddings, hybrid retrieval, citations, and RAG testing are future milestones.

Do not reuse the Book Formatter Supabase project: it contains an unrelated application's data and access configuration.

## 1. Create a dedicated Supabase project

In the [Supabase dashboard](https://supabase.com/dashboard), choose the intended organization, create a project named `Metanomic` (e.g. `us-east-1` or `us-east-2`), and check its actual quoted cost before accepting it.

## 2. Apply migration

Open the dedicated project's **SQL Editor**, and run the entire file:

`supabase/migrations/20261115_theia_knowledge_foundation.sql`

It creates:
- `knowledge_admins`: manually granted users; no anonymous/admin self-elevation API.
- `knowledge_documents`: approved editorial documents.
- `knowledge_revisions`: automatic immutable revision snapshots per save.
- `knowledge_chunks`: vectors (dimension 1536) reserved for RAG.
- `knowledge_ingestion_jobs`: queue metadata reserved for RAG.

All five tables have RLS enabled. Anonymous users have no direct Data API access.

## 3. Create an administrator

1. In the dedicated project's Supabase **Authentication → Users**, create/invite an email/password user you control. Use an approved administrator identity; do not enable anonymous or public self-registration.
2. Find the user's **UUID** in Authentication → Users.
3. In the SQL Editor, grant administrator status by replacing the sample UUID:

```sql
insert into public.knowledge_admins (user_id)
values ('YOUR_AUTH_USER_UUID')
on conflict (user_id) do nothing;
```

Do not put passwords, tokens, or private identifiers into GitHub source files.

## 4. Configure Metanomic in Vercel

Open Metanomic → Settings → Environment Variables. Add these as **Production** environment variables:

| Name | Value | Type |
| --- | --- | --- |
| `SUPABASE_URL` | Project URL, `https://PROJECT_REF.supabase.co` | Config |
| `SUPABASE_PUBLISHABLE_KEY` | Active `sb_publishable_...` key | Config |

Neither variable should have the `NEXT_PUBLIC_` prefix: they are used only by the server routes. The publishable key is intrinsically not secret, but it is deliberately kept out of the frontend.

No Supabase service-role or secret key is required for this milestone. The authenticated user's JWT is sent to Supabase for every read/write, and RLS enforces administrator membership.

**Redeploy** after adding the variables. Then visit:

`https://metanomic.ai/admin/knowledge`

## 5. Acceptance checks

1. Without Supabase configured, the page displays the connection-required state, not an error stack.
2. With the project configured, anonymous visitors see a sign-in form.
3. Invalid credentials or users not added to `knowledge_admins` cannot enter.
4. Authorized admin creates and saves a Draft document.
5. Admin edits/publishes the document and sees its revision increment.
6. Revision history lists prior versions. Loading an old revision places it in a new draft, and saving creates a new revision.
7. Archiving removes it from published status.
8. A stale second browser tab receives a conflict warning rather than overwriting another editor's work.
9. Anonymous Data API calls cannot query `knowledge_documents` or `knowledge_revisions`.
10. Theia continues answering using existing curated case definitions and tools; it **does not** claim RAG retrieval is enabled yet.

### Operational limits

- 100 most recently updated documents per list request, max 100,000 characters per document.
- Upload from local `.txt` and `.md` files, max 100 KB per import.
- Password login uses short-lived sessions (up to 55 minutes); admins sign in again when expired.
- Login rate limiting is per serverless instance, not a shared distributed limiter. Consider WAF/distributed rate limiting for public launch.
- Only real authorized administrators should be provisioned. Supabase Auth policies and password/MFA choices should be reviewed before broad team access.
- Some organizations disable the Supabase Data API. The project must allow the `public` schema through its Data API, with RLS in force, for this design.

## Next milestone: ingestion and retrieval

1. Upload PDFs/other approved files to private Supabase Storage; extract and segment text with controlled limits.
2. Compute embeddings for approved published chunks and reindex changes/revocations.
3. Add hybrid retrieval (Postgres full-text + pgvector), server-side query filtering to published documents, and search evaluation.
4. Introduce a bounded, read-only `search_knowledge` tool to Theia.
5. Display source citations and refuse unsupported company-specific claims.
6. Add an admin **Test Knowledge** panel that shows retrieved passages and grounding quality.

This foundation deliberately separates **publication** from **activation for public retrieval** to avoid accidental disclosure during ingestion development.
