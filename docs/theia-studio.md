# Theia Studio

Route: `/theia-studio`. Separate from the marketing advisor at `/demo`.

## Included
- Individual email/password accounts, email confirmation, password recovery, profile and email/password changes, sign-out everywhere, account deletion.
- Up to ten assistants per account, with saved instructions, greeting, model, exact HTTPS embed origins and publish controls.
- OpenAI BYOK only. Validate, encrypt, replace and remove a dedicated customer key. No fallback to a Metanomic model credential.
- Hosted knowledge: up to twenty text/Markdown documents per assistant, 50,000 characters each, explicitly published. Keyword-ranked passages (not embeddings) are supplied with source titles.
- Private streaming preview and an iframe widget installed using `/theia-embed.js`. Clear conversation controls. No transcript storage.
- Server-side daily requests, per-IP rate limits and maximum output tokens. These are not a guaranteed monetary spending cap.

## Deployment
The production database schema is recorded in `supabase/theia-studio.sql`. It was applied directly and verified with transaction-scoped RLS tests; it is a schema snapshot, not a generated migration. Do not rerun it on the existing production schema. The Supabase CLI was unavailable in the implementation environment.

Existing environment: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`. New: `THEIA_STUDIO_ENCRYPTION_KEY`, a sensitive random 32-byte base64 secret. Preserve this key; replacing it without re-encrypting customer credentials makes saved keys unreadable. `THEIA_STUDIO_ORIGIN` optionally overrides the default confirmation URL origin, `https://metanomic.ai`, for non-production environments.

Auth link generation uses Supabase Auth; delivery uses the existing Resend sender. Confirmation requires a deliberate button click rather than consuming a token on GET. Recovery grants are HMAC-bound to the verified session, expire after ten minutes, and are cleared on sign-in/sign-out. Password changes and account deletion revoke sessions. Server APIs validate the session against Auth, including its session ID. Existing knowledge-admin accounts cannot be deleted in Studio.

Management operations use the caller's JWT and ownership RLS. The server-only secret is used for public widget access, quota reservation, session validation, and Auth administration. AES-256-GCM credentials are bound to their owner. Public widget responses expose only assistant name/greeting/ID, never credentials or instructions. Embedding uses an exact-origin CSP and short-lived signed grants. Origin restrictions are browser controls, not proof that a caller is human; request limits remain essential.

## Deliberate first-release boundaries
No organizations, role management, SSO/MFA, subscriptions/billing, other LLM providers, PDF parsing, semantic embeddings, persistent transcripts, custom external tools or Calendly integrations. The widget is a configurable knowledge assistant, not a copy of the marketing demo's booking tools. Owners publish only knowledge intended for public visitors. Model access and available OpenAI credit depend on the customer's key. The launcher label is configurable in its snippet; colors follow Metanomic's visual language.

## Verification
Run `npm run typecheck`, `npm run build`, `node --experimental-strip-types --test tests/*.test.mjs`, and ESLint on the new Studio routes/library/tests. Full-repository lint currently also reports pre-existing errors in the admin knowledge manager and contact pages. The Studio test suite covers key encryption/tampering, domain validation, role/history validation, retrieval draft exclusion, signed widget grants, streaming success/interruption, actual widget NDJSON parsing, recovery-cookie forgery and deletion reauthentication.

Database tests verified two-account isolation, cross-account insert/update denial, anonymous credential denial, service-only quota/session functions and daily/rate limits. Supabase advisors report no Studio-specific warnings. Existing shared-project advisories remain: public knowledge-search definer, authenticated knowledge-index/Samuel-search definers, and disabled leaked-password protection. Review existing intentional RPC permissions separately; leaked-password guidance: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

Real customer OpenAI responses and actual email receipt require final end-to-end checks with the owner's key and inbox. No customer credential was available during implementation, and none was substituted.
