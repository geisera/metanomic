# Theia Studio UI/UX revision

Implemented November 17, 2026. No dependencies added. Knowledge retrieval, supported imports (.txt/.md, 200 KB maximum), document limits, and message limits are unchanged.

“Done” below means implemented, with the verification limits listed at the end. Source attribution and failed-attempt coverage have explicit qualifications.

## 1. Functionality

| Item | Status | Implementation / files |
|---|---|---|
| 1.1 Key/publish conflict | Done | `Workspace.tsx`, `ui.tsx`, `Account.tsx`: blocking banner, Connect key action, Paused – no key on cards/header; account key changes refresh assistant state. |
| 1.2 Setup checklist | Done | `Workspace.tsx`: four linked steps based on key, saved configuration/Behavior, published knowledge, and publication state. |
| 1.3 Unsaved changes | Done | `ui.tsx`, `Settings.tsx`, `Knowledge.tsx`, `Studio.tsx`: dirty indicators, sticky Save, browser unload warning, confirmation on tab/assistant/top-nav changes. Also protects Publish & Embed edits. |
| 1.4 Knowledge list | Done | `Knowledge.tsx`: existing documents first, title/status/character count, count out of twenty, Add document editor, exact import helper. |
| 1.5 Preview sources/tokens | Partially done | `Preview.tsx`, `chat.ts`: actual provider token count; source titles cited in the reply and verified against supplied passages. Model causality cannot be proven, so this is labeled “Sources cited,” not a claim that every supplied document influenced an answer. Missing counts show Unavailable. |
| 1.6 Embed customization | Done | `Publish.tsx`, `ui.tsx`, `widget.ts`, manage API: saved label/color/position, button preview, escaped generated snippet, working embed attributes. |
| 1.7 Origin validation | Done | `Publish.tsx`, `ui.tsx`: per-line HTTPS/path/wildcard feedback; www/non-www action; invalid input blocks save. Server validation retained. |
| 1.8 Usage/alerts | Partially done | `Workspace.tsx`, `usage.ts`, chat/manage APIs, SQL: seven-day totals and failed reserved model attempts; opt-in 80% email with daily claim/idempotency. Historical failures and rejected requests before reservation are not counted as failed model attempts. Actual email delivery remains unverified. |
| 1.9 Local reset | Done | `ui.tsx`, Settings/Help/chart/Preview, `widget.ts`: next UTC reset formatted in the viewer’s local timezone. |

## 2. Ease of use

| Item | Status | Implementation / files |
|---|---|---|
| 2.1 Help/Behavior naming | Done | `Studio.tsx`, `Workspace.tsx`, `Settings.tsx`, `Instructions.tsx`. |
| 2.2 Width/type | Done | `studio.module.css`: wider container, 16px base, at least 14px helpers. |
| 2.3 Collapse hero | Done | `Studio.tsx`: headline omitted after the first assistant exists. |
| 2.4 Create flow | Done | `Workspace.tsx`: + New assistant below list, inline name/template/Create. |
| 2.5 Tab order | Done | `Workspace.tsx`, `Publish.tsx`: Settings, Knowledge, Preview, Publish & Embed; origins/publication moved. |
| 2.6 Danger zone | Done | `Settings.tsx`, styles: bottom section, red outline Delete, explicit confirmation. |
| 2.7 Immediate publication | Done | `Publish.tsx`, manage API: immediate switch and confirmation toast; requires saved origins and a connected key. |
| 2.8 Model guidance | Done | `Settings.tsx`: visible per-option speed/cost/capability guidance and Recommended option; supported models unchanged. |
| 2.9 Output presets | Done | `Settings.tsx`: Short/Medium/Long and Advanced numeric control, existing bounds retained. |
| 2.10 Behavior editor | Done | `Settings.tsx`, `templates.ts`: larger editor, count, shared help template, overwrite confirmation. |
| 2.11 Preview input | Done | `Preview.tsx`: Enter sends, Shift+Enter newline, composition-safe, three suggested tests. |
| 2.12 Account key | Done | `Account.tsx`: key section first, OpenAI API keys link. |
| 2.13 Copy feedback | Done | `Publish.tsx`: Copied ✓ for two seconds, clipboard failure fallback. |

## 3. Copy changes

| Requested change | Status | Files |
|---|---|---|
| Exact hero headline/subhead | Done | `Studio.tsx` |
| Limits helper and local reset | Done | `Settings.tsx`, `Instructions.tsx`, `ui.tsx` |
| Approved origins helper | Done | `Publish.tsx` |
| Live on my website / Use this document in answers | Done | `Publish.tsx`, `Knowledge.tsx` |
| Connect key / Update password and sign-out helper | Done | `Account.tsx` |
| Key validation copy | Done | `Account.tsx`, `Instructions.tsx` |
| Usage/assistant count formats | Done | `Workspace.tsx` |
| Administrator-only deletion notice | Done | `Account.tsx`, auth GET API: own administrator membership read under existing RLS. |
| Assistant/chat button terminology | Done | Studio UI, Help, privacy, `crypto.ts`; technical routes and `data-agent` unchanged. |
| Three embed privacy bullets | Done | `Publish.tsx`, `Instructions.tsx` |
| Visible essential guidance, supplementary icons | Done | `FieldHelp.tsx`, Settings, styles; icons beside labels, 44px targets, Escape support. |
| Matching Help guide | Done | `Instructions.tsx` |

## 4. User happiness

| Item | Status | Implementation / files |
|---|---|---|
| 4.1 Empty states | Done | `Knowledge.tsx`, `Preview.tsx`: requested copy/actions. |
| 4.2 First-publish moment | Done | `Publish.tsx`, manage API/SQL: first-publish flag, live panel, code/copy, first approved-origin link. |
| 4.3 Save feedback | Done | `ui.tsx`, Settings/Knowledge/Publish/Account/Workspace: Saved toast, relative saved timestamps; toasts auto-hide after five seconds. |
| 4.4 Actionable errors | Done | `chat.ts`, `server.ts`, APIs, `ui.tsx`, Preview: missing/invalid key, model access, credit, daily limit, origin errors and corrective actions. |
| 4.5 Status/usage bars | Done | `ui.tsx`, `Workspace.tsx`, styles: Live/Draft/Paused colors and bounded card usage bars. |
| 4.6 Starter templates | Done | `templates.ts`, `Workspace.tsx`, manage API: Customer support, FAQ, Lead qualifier, Blank. |
| 4.7 Welcome default | Done | `templates.ts`, create API: Hi! How can I help today? |
| 4.8 Accessibility | Done | Shared styles/components: brighter helper text, visible focus, 44px tabs, filled active state, native controls and ARIA. Manual keyboard/screen-reader audit remains unverified. |
| 4.9 Mobile preview | Done | `Preview.tsx`, styles: desktop/mobile widths and visitor-style chat frame; Studio retains diagnostic source/token metadata and testing controls. |

## Backend/API additions

- `supabase/theia-studio-ux.sql`, applied as `theia_studio_ux`: assistant configuration/first-publication timestamps, button settings, alert opt-in; usage failure count and alert claim/delivery timestamps. Two SECURITY INVOKER functions, callable only by service_role. Existing RLS remains enabled.
- Manage GET: seven-day usage and document metadata. Manage POST: separate saved-settings, embed-settings, immediate publication, alert preference, and validated starter-template creation.
- Auth GET: own administrator membership boolean for conditional copy. Authorization semantics unchanged.
- Chat completion: returns cited supplied source titles and OpenAI-reported total tokens; structured safe error codes. Does not store conversations.
- Usage outcome processing: records failed reserved attempts and sends opted-in alerts through the existing Resend configuration, to a verified account email. Daily idempotency and retry on a later attempt. No scheduled job or new email provider.
- Chat route runtime allowance increased from 60 to 120 seconds so post-response reporting can finish; the OpenAI timeout, token bounds, request quotas, and retrieval behavior are unchanged.
- Embed script accepts generated label/color/position attributes and chooses contrasting text. Public daily-limit errors display local reset time.

## Files changed

- `src/app/theia-studio/Studio.tsx`
- `src/app/theia-studio/Account.tsx` (new extraction)
- `src/app/theia-studio/Workspace.tsx` (new extraction)
- `src/app/theia-studio/Settings.tsx` (new extraction)
- `src/app/theia-studio/Knowledge.tsx` (new extraction)
- `src/app/theia-studio/Preview.tsx` (new extraction)
- `src/app/theia-studio/Publish.tsx` (new extraction)
- `src/app/theia-studio/ui.tsx` (new shared UI)
- `src/app/theia-studio/FieldHelp.tsx`
- `src/app/theia-studio/Instructions.tsx`
- `src/app/theia-studio/studio.module.css`
- `src/app/theia-studio/privacy/page.tsx`
- `src/app/api/theia-studio/auth/route.ts`
- `src/app/api/theia-studio/manage/route.ts`
- `src/app/api/theia-studio/chat/route.ts`
- `src/lib/studio/core.ts`
- `src/lib/studio/server.ts`
- `src/lib/studio/chat.ts`
- `src/lib/studio/crypto.ts`
- `src/lib/studio/widget.ts`
- `src/lib/studio/templates.ts` (new)
- `src/lib/studio/usage.ts` (new)
- `supabase/theia-studio-ux.sql` (new)
- `tests/theia-studio.test.mjs`
- `tests/studio-ui.test.mjs` (new)
- `tests/studio-usage.test.mjs` (new)
- `docs/theia-studio-ux-report.md` (this report)

## Verification and limitations

- Production build passed after each implementation section; final TypeScript check passed.
- All 126 existing/new automated tests pass, including server-rendered editor views, no-key status, origin validation, embed escaping, stream metadata, safe provider errors, alert opt-in/claim behavior, daily email idempotency, delivery retry, and existing authentication/encryption/limits/retrieval checks.
- Scoped lint passes for changed Studio code and tests. Full-repository lint has eight existing errors and two warnings in unrelated admin/contact/demo/config files. These were not changed by this revision.
- SQL verification confirms RLS remains enabled, new functions are SECURITY INVOKER, anon/authenticated cannot execute them, service_role can, and an unknown assistant cannot claim an alert.
- Database advisors report no new Studio findings. Existing unrelated knowledge/Samuel function advisories, indexes, and disabled leaked-password protection remain outside this revision. References: [function advisory](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated function advisory](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [index advisory](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).
- Local Next server starts. Authenticated browser interaction/responsive checks were attempted with mocked accounts but Chromium could not launch: the execution environment denied its required socket. Therefore 375/768/1440 visual layouts, keyboard navigation, clipboard timing, and click-through flows are not claimed as verified.
- No production test users were created, no real OpenAI requests were made, and no test emails were sent. End-to-end provider answers and actual alert delivery remain unverified.
