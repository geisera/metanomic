# Metanomic Workflow Advisor — Demonstration Architecture

## Purpose

A public, bounded demonstration of an enterprise AI agent that augments human work. The
agent helps a visitor describe a workflow and explore a measurable, approval-based pilot.
It is a capability demo, not a client deployment or a replacement for discovery.

## Components

- `/demo`: responsive chat UI and example scenarios.
- `/api/agent-demo`: server-only conversational orchestration with a bounded tool loop.
- `src/lib/demo-agent.ts`: deterministic, auditable business functions.
- Vercel AI Gateway: routing to `openai/gpt-5-mini` through OIDC or an optional gateway key.
- No secrets are included in the browser or Git repository.

## Actual tool operations

1. `map_opportunity`: returns a bounded use-case pattern with integrations, metrics, pilot
   phases, and human safeguards.
2. `estimate_capacity`: performs arithmetic over explicit or disclosed hypothetical
   numbers. Caps extreme inputs. Returns assumptions and an explicit non-guarantee.

The language model **chooses** whether to invoke those functions. The server validates
tool names and arguments, executes business logic, and returns the results for a final
answer. Tools perform no write operations and access no client systems.

## Model availability and transparent fallback

Deployment authentication prefers `AI_GATEWAY_API_KEY` when supplied, otherwise Vercel's
`VERCEL_OIDC_TOKEN`. Model inference occurs only on the server. If authentication,
credits, or model access are unavailable, the endpoint responds with **guided mode**:
a clearly labeled, deterministic use-case recommendation. It never presents that response
as an AI-generated answer.

Optional: set `DEMO_AGENT_LIVE=false` to force guided mode and prevent model calls.
This is useful before enabling account-level spend limits.

## Safety and operating limits

- Browser requests use JSON only; content and conversation length are bounded.
- Up to seven visitor prompts are allowed per UI session. The server validates a maximum
  of ten message turns and 6,400 characters per call.
- Server-side limits: 15 requests/IP/hour and 150 requests/process/hour.
- **Important**: in-memory limits are per function instance, not global enforcement.
  Before marketing the demo broadly, configure an account/project AI Gateway spend
  budget and distributed rate limiting or Vercel WAF rules.
- Each model turn has an 18-second timeout and the agent makes at most three model
  calls per request. Model output is capped at 750 tokens per call.
- Browser displays text, not raw executable HTML. The server exposes only approved,
  read-only tools. No customer credentials, real records, or business systems are used.
- Inputs may be sent to the model provider when live mode is available. The UI explicitly
  warns users not to include personal, confidential, or regulated information.
- No durable chat history is stored by the application.
- No claims are made about customer results, certifications, or measured ROI.

## Acceptance checks

- [x] Dedicated demo page and homepage navigation are deployed.
- [x] Server route compiled and typechecked in Vercel build.
- [x] Guided mode is available without inference credentials.
- [x] Tool outputs have documented semantics and explicit estimation assumptions.
- [ ] Run a live end-to-end tool-call trace once gateway credits are confirmed.
- [ ] Apply central, hard cost budgets and distributed request throttling.
- [ ] Add automated integration/evaluation tests and observability before enterprise reuse.

## Example conversations

1. "We receive 300 service requests a week and routing takes 12 minutes each.
   Outline a safe pilot and an illustrative capacity calculation."
2. "How could an agent help our customer support team resolve repetitive questions?"
3. "We need answers from approved procedure documents. How should we protect permissions
   and cite evidence?"

## Next-stage improvements

- Source-grounded retrieval from an approved sample knowledge base
- Human approval checkpoints for a simulated write action
- Evaluations, error budgets, quality metrics, and tracing
- SSO/tenant isolation for a real enterprise customer
- Distributed rate limiting and durable conversation storage (only with consent)
