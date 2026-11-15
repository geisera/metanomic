# Theia — Balanced Conversation Scope

## Purpose

Theia is Metanomic's public AI/workflow advisor, not an unrestricted general-purpose assistant. The live server applies a **Balanced** subject policy and preserves factual access to explicitly approved published knowledge.

## Routing policy

Implementation:
- `src/lib/theia-scope.ts`: standalone, testable subject policy. No LLM calls or external credentials are required for classification.
- `src/app/api/agent-demo/route.ts`: enforces explicit out-of-scope redirects before calling the response-generation model. Scheduling stays on the existing live Calendly route.

Routing categories:
- **Core:** Enterprise AI, agents, RAG, business automation, integration, CRM/Salesforce, technology, governance, security, Metanomic's services.
- **Knowledge:** A published, currently indexed knowledge passage with distinctive words that actually overlap with the visitor's question. Semantic proximity by itself is insufficient.
- **Small talk:** Brief greetings and pleasantries.
- **Out of scope:** Clearly unrelated sports scores, general trivia, recipes, unrelated creative-writing requests, celebrity/film trivia, and political trivia. The server returns a brief, neutral subject redirect without a second model call.
- **Review:** Ambiguous requests receive a separate, narrowly instructed classification call. Only requests classified as in scope reach Theia's general answer model. Classification failures fail closed with a gentle, optional Metanomic contact invitation.

**Important:** The regex classifier is intentionally conservative about rejecting ambiguous questions. A second, low-output-token model pass checks REVIEW intents against the professional domain, using recent conversational context. This adds a model request and latency **only for ambiguous questions**. A failed or inconclusive classification redirects rather than silently permitting an off-topic answer. This is a subject-routing mechanism, not a comprehensive semantic-security guarantee.

AI-related goals take precedence over unrelated subject keywords; for example, "How could a baseball team use AI?" and "Can an AI agent help write novels?" are in scope.

## Approved-knowledge exception

A published article can make a fictional or niche subject eligible for answers, such as the published Bellwether Hollow test document. The request must contain distinctive lexical anchors that appear in a retrieved excerpt or title. This reduces false-positive approval from a weak vector nearest-neighbor match.

Unpublished and outdated knowledge revisions remain excluded by database search rules. Retrieved material is treated as untrusted data, not as instructions that can override scope policy.

## Availability and fallback

Calendly requests always use the established appointment-availability routing. Scope does not block scheduling. Normal AI tool execution and booking confirmation controls are unchanged.

If the language model fails but pertinent published excerpts were retrieved, Theia displays verified excerpts with a clear notice rather than an unrelated canned AI pilot response. This does not claim that a generated answer succeeded.

## Regression tests

Run:

```sh
npm run test:scope
```

The test suite (`tests/theia-scope.test.mjs`) uses Node's built-in test runner and exercises relevant business questions, AI applications to other domains, greetings, unrelated trivia, unrelated creative writing, false-positive knowledge overlap, and Bellwether Hollow.

Production acceptance cases (expanded):
- "How do I make a mocha latte?" → server-generated, gentle hospitality/AI redirection; no recipe.
- "How do I fix a leaking faucet?" → ambiguity-classifier redirect, not plumbing instructions.
- "How could a coffee shop use AI for inventory planning?" → substantive AI workflow answer.

1. "Who won the 1986 World Series?" → polite server-side redirect.
2. "Write a fantasy novel." → redirect.
3. "How could a baseball team use AI for scouting?" → substantive in-scope answer.
4. "Who rules Bellwether Hollow?" → Queen Maribel the Uncrowned, with approved source citations.
5. "What happens during Hush?" → documented rules with source citations.

This milestone does not include administrator-configurable scope settings or durable message analytics.
