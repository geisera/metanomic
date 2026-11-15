# Theia Knowledge Base — Foundation (Milestone 1)

## Current status

The Metanomic source code contains:
- Private administrator interface at `/admin/knowledge`.
- Supabase Auth email/password login, server-verified administrator role, short-lived HttpOnly session.
- Document list, text/Markdown editing, import from `.md` / `.txt`, search/filter.
- Draft, Published and Archived statuses; revision history and restoration.
- Revision conflict protection so stale browser tabs cannot silently overwrite changes.
- SQL migration defining RLS-protected documents, revisions, administration memberships, and the tables required by later vector ingestion.

**Current deployment:** Supabase and Vercel are connected. Publishing a document initiates embedding and indexing; Theia can use indexed published passages. PDF ingestion and background retries remain future work.

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

## RAG retrieval (Milestone 2 — deployed)

The migration `supabase/migrations/20261115_theia_rag_pipeline.sql` adds:
- An administrator-only `knowledge_index_document` RPC for atomic replacement of each document's embedded chunks.
- A read-only `knowledge_search` RPC combining PostgreSQL full-text search and pgvector semantic ranking (reciprocal rank fusion).
- A generated full-text index and a revision check that **immediately excludes** edited, archived, unpublished or not-yet-reindexed documents.

### Indexing an approved document

1. Sign into [Theia Knowledge Administration](https://metanomic.ai/admin/knowledge).
2. Select a document and click **Publish**. The browser saves the new revision, then requests indexing with your authenticated Supabase JWT. Publishing is not a reservation of a vector index: wait for the explicit **Published and indexed N passages** confirmation.
3. If indexing fails, the document remains Published but is not available for retrieval until successfully indexed. Clicking Publish again retries (and creates a new revision).
4. Use the **Test Knowledge** panel with a specific question. It displays actual published excerpts, document titles, and revision numbers.
5. Visit [Theia](https://metanomic.ai/demo) and ask the question. Theia can call `search_knowledge`; sources are appended to live answers.

**Important:** The fabricated Bellwether Hollow fixture is intentionally still a **Draft**. It is not publicly searchable until you Publish it. This avoids treating fictional material as ordinary company content without an explicit review step.

### Security controls

- Editing/indexing requires a verified Supabase Auth administrator session; the model has no write-capable knowledge tool.
- Retrieval is a bounded, anonymous, read-only RPC which returns **only current-revision Published chunks**; stale vectors are never returned.
- Public retrieval never uses a service-role key. The database function enforces publication status and index revision in SQL.
- A failed or interrupted indexing attempt cannot expose stale content; the atomic RPC writes the new index and completion state together.
- Supabase's advisor warns that `knowledge_search` is a publicly callable `SECURITY DEFINER` function and that authenticated users may call the administrator indexing `SECURITY DEFINER` function. Those permissions are intentional for the respective RPCs. The search function returns only a small projection from current published indexed revisions; the indexing function explicitly verifies `auth.uid()` membership in `knowledge_admins` and checks current published revision under a row lock. Review these exceptions before broad public rollout.
- The contents of retrieved excerpts are untrusted source material and cannot override Theia's system or tool instructions.
- `AI_GATEWAY_API_KEY` is used server-side for embeddings (`openai/text-embedding-3-small`, 1,536 dimensions).

### Known constraints / further work

- Text and Markdown only in the editor. PDF extraction and Supabase Storage ingestion are not yet implemented.
- Indexing uses a request initiated by an administrator publishing the document. There is no scheduled background index-retry worker or resilient job queue yet.
- Large documents may exceed the 60-second function duration: split oversized content until background jobs are added.
- Source titles and revisions are displayed; optional externally approved source URLs are retained. Fine-grained paragraph anchors and automatic external-document citation links are future improvements.
- Hybrid retrieval ranking should be tuned using evaluation questions to reduce false positives.
- A complete browser acceptance test using a real admin session is still required; server-side SQL tests used synthetic vectors and verified that unpublished content is excluded. These tests did not exercise live model-generated embeddings. SQL test writes caused revision updates to the test document; the fixture was restored to Draft.
- A published document with no successful index is **not searchable**, even if it remains marked Published in the editor.

