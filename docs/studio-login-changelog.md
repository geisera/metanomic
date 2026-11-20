# Assistant Studio login refresh

The login page has a centered auth card, an above-the-fold appearance picker, and a desktop product panel. Email sign-in includes validation, typo correction, pending and error feedback, and a focused confirmation screen with a 60-second resend timer. Password sign-in and recovery stay in the same card. A new-account link can carry an email to signup for one visit through session storage.

Studio uses the same neutral response for eligible and unknown email addresses. The confirmation screen and `magic_link_sent` analytics event describe a request that Studio accepted. Only the delivery provider can confirm mailbox delivery.

## Operations

- `STUDIO_MAGIC_LINK_TTL_MINUTES` controls the expiry shown in the UI. Set it to the Supabase Auth email OTP expiry in minutes if the project uses a value other than Supabase's 60-minute default.
- Login analytics use first-party structured runtime logs named `studio_login_event`. Event names, methods, and error codes come from fixed lists. The request includes no email, credential, token, or redirect.
- `STUDIO_OAUTH_PLACEHOLDERS=true` displays disabled Google and Microsoft placeholders for layout review. Leave the flag off in production until sign-in is wired.

## OAuth setup

1. Register the Google web client and, if offering Microsoft sign-in, the Microsoft Entra ID app. Configure their Supabase provider callback URLs and credentials. Request the required email scope and check Microsoft's verified-email guidance. [Google setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) · [Microsoft setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-azure)
2. Add a Studio callback URL to Supabase's allowed redirects. Implement the PKCE callback, validate the code exchange and the same-origin destination, and use Studio's existing session-cookie logic. Apply the existing account eligibility and terms rules before accepting new OAuth users. [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow) · [Allowed redirects](https://supabase.com/docs/guides/auth/redirect-urls)
3. Replace the placeholders with working provider-branded controls. Test sign-in, denied consent, account linking, callback errors, and sign-out in staging, then enable each verified provider. [Google button guidelines](https://developers.google.com/identity/branding-guidelines)

## Modified files

| File | Change |
| --- | --- |
| `src/app/assistant-studio/login/page.tsx` | Login shell, value panel, footer, metadata, and destination context |
| `src/app/assistant-studio/login/LoginForm.tsx` | Email, password, recovery, feedback, confirmation, and resend states |
| `src/app/assistant-studio/login/form-controls.tsx` | Button, input, divider, OAuth placeholder, and icons |
| `src/app/assistant-studio/login/login.module.css` | Responsive layout, theme tokens, focus rings, and reduced motion |
| `src/app/assistant-studio/AuthForm.tsx` | Consumes the one-time signup email |
| `src/app/assistant-studio/confirm/page.tsx` | Restores a validated destination after magic-link verification |
| `src/app/api/theia-studio/auth/route.ts` | Passes a validated destination to the existing mail flow |
| `src/app/api/theia-studio/login-events/route.ts` | Records allowlisted login events |
| `src/app/layout.tsx` | Uses the route-aware default theme picker |
| `src/components/ThemeControl.tsx` | Supports a compact header picker and suppresses the duplicate footer picker on login |
| `src/components/IntelligenceVisual.tsx` | Skips the animated background on login |
| `src/components/SiteAccount.tsx` | Skips the extra identity fetch on login |
| `src/lib/studio/login-destination.ts` | Validates redirect targets and provides destination labels |
| `src/lib/studio/login-events.ts` | Defines event names, methods, and error codes |
| `src/lib/studio/mail.ts` | Carries the validated destination in a magic-link email |
| `tests/theia-studio.test.mjs` | Tests redirect validation and restores missing auth fixture dependencies |
| `docs/studio-login-changelog.md` | Records changes and OAuth setup |
