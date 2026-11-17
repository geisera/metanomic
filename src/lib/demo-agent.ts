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
  if (isStackQuestion(prompt)) return guidedStackAnswer(prompt);
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
    identity: "Theia, Metanomic's AI workflow advisor.",
    positioning: "Metanomic works across the frontier-model and agent-framework landscape. The interesting part is how the pieces work together: capable models, connected knowledge, purposeful tools, and human control. The client's workflow determines the combination.",
    disclosure: "This is approved category-level positioning, not a technical inventory. Default ambiguous technology questions to Metanomic's client work, not this marketing website or demo. Do not enumerate vendors, model names, versions, SDKs, databases, hosting providers, internal tool identifiers, or inferred implementation details. Do not claim every individual product has been deployed or independently verified. Be lightly coy about the recipe, never evasive about material limitations.",
    capabilities: ["Designing focused agent workflows", "Connecting approved knowledge and business tools", "Evaluating results and supervising consequential actions"],
    dataAndSafety: [
      "In live mode, messages are sent through an external AI gateway to a model provider for processing. Do not submit sensitive information.",
      "The application does not store a durable chat history. Chat context is held in the current browser session and sent with each request.",
      "Knowledge retrieval reads only approved, currently published passages; it cannot access unpublished drafts or visitors' databases.",
      "This demo cannot access visitors' systems or browse the web. The model cannot perform write actions. Booking requires a separate visitor-confirmed form.",
      "Abuse controls use per-instance counters rather than distributed enforcement, with an additional bot-verification check for bookings.",
      "When live inference is unavailable, deterministic guided responses are explicitly labeled.",
    ],
    limitations: "This demo is not a certified production integration or an independently audited security implementation.",
  };
}

export function isStackQuestion(prompt: string) {
  const question = prompt.toLowerCase();
  return /\b(tech(nology)? stack|under the hood|behind the scenes)\b/.test(question)
    || (/\b(you|your|theia)\b/.test(question)
      && /\b(stack|technolog\w*|architect\w*|built|model|tools?|safeguards?|privacy|security|data|messages|work|powers?)\b/.test(question));
}

export function guidedStackAnswer(prompt = "") {
  const stack = describeStack();
  const asksAboutDemo = /\b(privacy|security|safeguards|messages|data handling|limitations)\b|\b(this|the) (demo|website)\b/i.test(prompt);
  return {
    answer: asksAboutDemo
      ? "A little of the recipe stays behind the curtain, but the boundaries should be clear.\n\n" + stack.dataAndSafety.join("\n\n") + "\n\n" + stack.limitations
      : "A little of the recipe stays behind the curtain. Metanomic works across the frontier-model and agent-framework landscape, combining capable models, connected knowledge, and carefully controlled actions around your workflow. The business problem determines the ingredients.\n\nWhat would you like an agent to take off your team's plate?",
    activities: [{ tool: "describe_stack", label: "Reviewed capabilities and safeguards", detail: "Approach and practical boundaries" }],
  };
}
