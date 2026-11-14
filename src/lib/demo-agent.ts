// Deterministic, inspectable business logic used by the live agent's tools
// and by the explicitly labeled guided fallback. No customer systems are read.
export type Focus = "support" | "sales" | "operations" | "knowledge" | "other";

export type Opportunity = {
  focus: Focus;
  title: string;
  headline: string;
  candidate: string;
  integrations: string[];
  humanControls: string[];
  measures: string[];
  phases: string[];
};

const cases: Record<Focus, Omit<Opportunity, "focus">> = {
  support: {
    title: "Customer service",
    headline: "Help your team resolve more inquiries without sacrificing judgment or care.",
    candidate: "Agent-assisted triage: classify incoming requests, retrieve relevant policy or knowledge, and draft a response for a person to approve.",
    integrations: ["Help desk or CRM", "Approved knowledge base", "Team notification channel"],
    humanControls: ["Agents cannot promise refunds or change accounts without approval.", "Escalate urgent, sensitive, or uncertain cases.", "Restrict retrieval to approved knowledge sources."],
    measures: ["Average handling time", "First-response time", "Escalation quality", "Customer satisfaction"],
    phases: ["Map the most frequent request categories and decision rules.", "Connect a read-only knowledge source and evaluate draft quality.", "Pilot with an approval step and measure results before wider access."],
  },
  sales: {
    title: "Sales operations",
    headline: "Give sellers more time for relationships and higher-value conversations.",
    candidate: "Sales preparation assistant: summarize account history, assemble call briefs, and draft follow-ups for human review.",
    integrations: ["CRM", "Approved account notes", "Calendar or email"],
    humanControls: ["Require approval before external communication.", "Limit account access by sales territory or role.", "Never invent account facts or quote unapproved prices."],
    measures: ["Preparation time", "Follow-up latency", "CRM completeness", "Seller adoption"],
    phases: ["Pick one recurring seller workflow and define successful output.", "Connect read-only CRM records and generate draft briefs.", "Evaluate factual accuracy and pilot with a small seller group."],
  },
  operations: {
    title: "Business operations",
    headline: "Reduce repetitive coordination while keeping people in control.",
    candidate: "Workflow copilot: summarize submissions, validate required fields, and route work to the right person with clear exceptions.",
    integrations: ["Forms or shared inbox", "Operations system", "Team notifications"],
    humanControls: ["Keep financial, legal, and irreversible actions behind approvals.", "Log each recommendation and handoff.", "Flag low-confidence or missing data."],
    measures: ["Minutes per request", "Rework rate", "Time to completion", "Exception frequency"],
    phases: ["Select a high-volume, rule-rich workflow with a clear owner.", "Create read-only classification and routing tools.", "Pilot human-reviewed handoffs and monitor exceptions."],
  },
  knowledge: {
    title: "Knowledge work",
    headline: "Make trusted organizational knowledge easier to find and apply.",
    candidate: "Knowledge assistant: answer questions using approved documents, cite supporting passages, and identify gaps for human review.",
    integrations: ["SharePoint, Drive, or knowledge repository", "Identity and access control", "Document indexing"],
    humanControls: ["Enforce source-level permissions.", "Provide citations and say when evidence is absent.", "Do not train on or expose private materials without authorization."],
    measures: ["Time to locate answers", "Citation accuracy", "Unanswered questions", "Knowledge coverage"],
    phases: ["Choose a narrow, approved document collection.", "Build permission-aware retrieval with source citations.", "Test correctness and access boundaries with actual users."],
  },
  other: {
    title: "AI opportunity",
    headline: "Start with one meaningful human outcome rather than a broad AI mandate.",
    candidate: "A human-supervised assistant for one bounded, repetitive step: gather context, propose a next action, and present it for approval.",
    integrations: ["The system of record", "Approved reference data", "Human approval channel"],
    humanControls: ["Begin read-only.", "Require approval before external or irreversible actions.", "Log activity and handle uncertain cases explicitly."],
    measures: ["Minutes saved", "Error or rework rate", "User satisfaction", "Completion quality"],
    phases: ["Choose one measurable workflow and map failure cases.", "Prototype with synthetic or approved sample information.", "Run an approval-based pilot and evaluate outcomes."],
  },
};

export function resolveFocus(text: string): Focus {
  const lower = text.toLowerCase();
  if (/ticket|customer|client inquiry|support|helpdesk|complaint|service desk/.test(lower)) return "support";
  if (/sale|prospect|lead|deal|opportunit|account exec|crm|pipeline/.test(lower)) return "sales";
  if (/policy|document|knowledge|search|research|manual|sharepoint|wiki/.test(lower)) return "knowledge";
  if (/invoice|approval|request|schedule|onboard|intake|handoff|process|operation|repetitive|admin/.test(lower)) return "operations";
  return "other";
}

export function mapOpportunity(focus: Focus): Opportunity {
  return { focus, ...cases[focus] };
}

function bound(n: unknown, lo: number, hi: number, fallback: number) {
  return typeof n === "number" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}

export function estimateCapacity(input: { tasksPerWeek?: unknown; minutesSaved?: unknown; adoptionPercent?: unknown }) {
  const tasksPerWeek = bound(input.tasksPerWeek, 1, 5000, 50);
  const minutesSaved = bound(input.minutesSaved, 1, 120, 10);
  const adoptionPercent = bound(input.adoptionPercent, 10, 100, 70);
  const hoursPerWeek = Math.round(tasksPerWeek * minutesSaved * adoptionPercent / 100 / 60 * 10) / 10;
  return {
    tasksPerWeek,
    minutesSaved,
    adoptionPercent,
    hoursPerWeek,
    hoursPerYear: Math.round(hoursPerWeek * 48),
    basis: "Illustrative scenario only. Assumes 48 working weeks, indicated adoption, and unchanged task volume. Not a measured ROI or guaranteed result.",
  };
}

export function guidedAnswer(prompt: string) {
  if (/\bcalendly\b|\b(?:book|schedule|arrange|set up)\b.{0,50}\b(?:call|meeting|consultation|appointment)\b|\b(?:talk|speak|meet)\b.{0,25}\b(?:metanomic|your team|you)\b/i.test(prompt)) {
    return {
      answer: "You can schedule a conversation with Metanomic at https://metanomic.ai/contact. The contact page has one external Calendly booking link, or you can book directly at https://calendly.com/metanomic. Ask me to check available times, then choose Book here to enter your name and email, review the appointment, and confirm inside Theia. You can also book directly on Calendly.",
      activities: [],
    };
  }
  if (isStackQuestion(prompt)) return guidedStackAnswer();
  const category = mapOpportunity(resolveFocus(prompt));
  return {
    answer: [
      "A practical starting point is " + category.title.toLowerCase() + ".",
      category.headline,
      "PILOT IDEA\n" + category.candidate,
      "INTEGRATIONS\n" + category.integrations.join(" · "),
      "HUMAN SAFEGUARDS\n" + category.humanControls.map(x => "• " + x).join("\n"),
      "FIRST THREE STEPS\n" + category.phases.map((x, i) => (i + 1) + ". " + x).join("\n"),
      "MEASURE SUCCESS\n" + category.measures.join(" · "),
      "This is a guided, rule-based preview—not an AI-generated recommendation. Activate live model access for a tailored conversation.",
    ].join("\n\n"),
    activities: [{ tool: "mapOpportunity", label: "Matched a documented business workflow", detail: category.title }],
  };
}


// Public facts about this deployed demonstration. Keep this inventory in sync
// with package.json and the agent route. No keys or private configuration included.
export function describeStack() {
  return {
    identity: "Theia by Metanomic — public, bounded AI workflow advisor.",
    interface: ["Next.js 16 App Router", "React 19", "TypeScript", "Tailwind CSS 4"],
    hosting: "Vercel (frontend and server-side API route).",
    model: "OpenAI GPT-5 mini (openai/gpt-5-mini) accessed through Vercel AI Gateway.",
    orchestration: "A bounded server-side tool-calling loop using the Gateway chat-completions API; this demo does not use LangGraph or a separate agent framework.",
    tools: [
      "map_opportunity: looks up curated AI pilot patterns, safeguards, and measures.",
      "estimate_capacity: calculates illustrative hours saved from explicit assumptions.",
      "describe_stack: returns this approved technical inventory.",
      "check_calendly_availability: read-only Calendly appointment search with verified time slots and booking links (requires server-side token).",
    ],
    dataAndSafety: [
      "Messages are validated and length-limited on the server; model calls use server-side credentials.",
      "The application does not store a durable chat history. Chat context is held in the current browser session and sent with each request.",
      "In live mode, messages are processed by Vercel AI Gateway and a model provider. Do not submit sensitive information.",
      "This demo does not connect to visitor systems, read private databases, or browse the web. The model has no write-capable tools. Only a separate human-confirmed booking form can create a Calendly appointment through a validated API route.",
      "Rate limiting and duplicate submission checks use per-instance in-memory counters, not distributed enforcement. Direct booking additionally requires Cloudflare Turnstile validation.",
      "If live model inference fails, the interface explicitly labels deterministic guided responses.",
    ],
    limitations: "This is an illustrative demo, not a certified production integration or an independently audited security implementation.",
  };
}

export function isStackQuestion(prompt: string) {
  const question = prompt.toLowerCase();
  return /\b(tech(nology)? stack|under the hood|behind the scenes)\b/.test(question)
    || (/\b(you|your|theia)\b/.test(question)
      && /\b(stack|technolog\w*|architect\w*|built|model|tools?|safeguards?|privacy|security|data|messages|work|powers?)\b/.test(question));
}

export function guidedStackAnswer() {
  const stack = describeStack();
  return {
    answer: [
      "I'm Theia. Here's the actual stack behind this demo:",
      "INTERFACE\n" + stack.interface.join(" · "),
      "MODEL & HOSTING\n" + stack.model + "\n" + stack.hosting,
      "ORCHESTRATION\n" + stack.orchestration,
      "SERVER-SIDE TOOLS\n" + stack.tools.map(tool => "• " + tool).join("\n"),
      "DATA & LIMITATIONS\n" + stack.dataAndSafety.map(note => "• " + note).join("\n"),
      stack.limitations,
    ].join("\n\n"),
    activities: [{ tool: "describe_stack", label: "Read the demo's technical inventory", detail: "Verified application components and limitations" }],
  };
}
