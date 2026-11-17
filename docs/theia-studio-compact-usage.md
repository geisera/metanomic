# Compact usage revision

- Removed the shared Messages per day chart from all assistant tabs.
- Added header totals, local reset time, nonzero failure count, green/amber/red meter, and a Raise limit action that opens Settings and focuses Daily message limit.
- Added Settings-only seven-day sparkline with hover/focus daily tooltips and an accessible table. Zero days are baseline ticks; an entirely empty week displays a sentence. Failed attempts remain included in request totals: each bar stacks successful attempts below failed attempts, without double counting.
- Moved the email alert under Daily message limit. It participates in Settings dirty-state protection and Save changes, using the existing usage-alert endpoint after saving settings. No backend, tracking, database, email-delivery, or quota changes.
- Applied the same thresholds to assistant list meters and updated Help.
- Hid Delete account for protected administrator accounts. Non-administrator deletion remains available and backend protection is unchanged.

Files: Workspace.tsx, Settings.tsx, Usage.tsx (new), Account.tsx, Instructions.tsx, studio.module.css under src/app/theia-studio; tests/studio-ui.test.mjs; this report.

Verification: production build, TypeScript, scoped lint, and 130 automated tests pass. New tests cover usage thresholds, seven UTC-day buckets, empty/nonempty rendering, keyboard-focusable daily bars, accessible table, conditional header failures, full-limit action, checked alert hydration from saved data, and administrator-only hiding. Preview continues to refresh the shared usage snapshot after each attempt, and the header reads that snapshot. The alert write/read endpoints are unchanged.

Not verified in an authenticated browser: real Preview request updating the header, mouse/keyboard tooltip appearance, Raise limit focus, and save/reload persistence. Local Chromium could not launch in this environment during the preceding revision because its required socket was denied. No real emails or OpenAI requests were sent for this change.
