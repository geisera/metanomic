import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Enterprise AI Technology Stack",
  description:
    "A practical guide to the ten layers of enterprise AI: models, agents, orchestration, data, integration, infrastructure, evaluation, and governance.",
  alternates: { canonical: "/enterprise-ai-stack" },
  openGraph: {
    title: "The Enterprise AI Technology Stack | Metanomic",
    description:
      "Explore the tools and engineering layers behind reliable enterprise AI systems that magnify human impact.",
    url: "https://metanomic.ai/enterprise-ai-stack",
    type: "article",
  },
};

const layers = [
  {
    id: "models",
    number: "01",
    name: "AI models & APIs",
    tools: ["OpenAI", "Anthropic Claude", "Google Gemini", "Meta Llama"],
    description:
      "The reasoning and generation layer. Models interpret information, produce responses, analyze content, and power the decisions or recommendations used by an AI application.",
    purpose: "Reasoning, generation, analysis, and decision support",
  },
  {
    id: "agent-development",
    number: "02",
    name: "Agent development",
    tools: ["OpenAI Agents SDK", "LangChain", "CrewAI", "Google ADK"],
    description:
      "Frameworks for building AI agents that can use tools, follow instructions, coordinate work, and take defined actions rather than simply return text.",
    purpose: "Tool-using agents and task execution",
  },
  {
    id: "orchestration",
    number: "03",
    name: "Agent orchestration",
    tools: ["LangGraph", "Temporal", "Microsoft Agent Framework"],
    description:
      "The control layer for multi-step operations. Orchestration helps manage execution state, retries, long-running work, handoffs, and human approval checkpoints.",
    purpose: "Stateful workflows, reliability, and oversight",
  },
  {
    id: "enterprise-platforms",
    number: "04",
    name: "Enterprise AI platforms",
    tools: ["Microsoft Foundry", "AWS Bedrock AgentCore", "Gemini Enterprise Agent Platform"],
    description:
      "Managed environments for operating AI systems at organizational scale, with platform services for deploying agents and applying enterprise controls.",
    purpose: "Managed deployment, scaling, security, and governance",
  },
  {
    id: "automation",
    number: "05",
    name: "Workflow automation",
    tools: ["n8n", "Microsoft Power Automate", "UiPath", "Make"],
    description:
      "Connect intelligence to repeatable business processes. Automation tools move information between applications and coordinate work with or without a person in the loop.",
    purpose: "Application workflows and process automation",
  },
  {
    id: "retrieval",
    number: "06",
    name: "Data & retrieval",
    tools: ["PostgreSQL / pgvector", "Pinecone", "Weaviate", "Elasticsearch"],
    description:
      "Provide relevant organizational context, from structured records to searchable documents, so AI systems can work with information beyond the model's built-in knowledge.",
    purpose: "Knowledge access, storage, and semantic search",
  },
  {
    id: "integration",
    number: "07",
    name: "AI integration",
    tools: ["MCP", "REST APIs", "Function calling", "MuleSoft"],
    description:
      "Make enterprise tools available to AI systems in a controlled way. Integrations connect agents to the services where people actually do their work.",
    purpose: "Secure connections to business systems and tools",
  },
  {
    id: "evaluation",
    number: "08",
    name: "Evaluation & monitoring",
    tools: ["LangSmith", "Langfuse", "Braintrust", "Arize Phoenix"],
    description:
      "Trace what agents do, assess output quality, investigate failures, and measure whether an AI system reliably completes the work it was designed to support.",
    purpose: "Tracing, testing, quality, and production visibility",
  },
  {
    id: "infrastructure",
    number: "09",
    name: "Deployment infrastructure",
    tools: ["Docker", "Kubernetes", "Azure", "AWS", "Google Cloud", "Vercel"],
    description:
      "The operational foundation for hosting applications, APIs, agents, and supporting services, with infrastructure choices matched to the demands of each environment.",
    purpose: "Hosting, release management, and scalability",
  },
  {
    id: "governance",
    number: "10",
    name: "Security & governance",
    tools: ["Microsoft Entra", "Okta", "HashiCorp Vault", "Cloud IAM"],
    description:
      "Control who and what can access data, credentials, tools, and sensitive actions. Governance turns technical capability into a system an organization can safely operate.",
    purpose: "Identity, permissions, secrets, and access control",
  },
] as const;

const architecture = [
  {
    step: "01",
    title: "Understand",
    label: "Models + data",
    description: "Interpret a request using the right model and relevant business knowledge.",
  },
  {
    step: "02",
    title: "Coordinate",
    label: "Agents + orchestration",
    description: "Plan steps, use tools, retain state, and request approval when needed.",
  },
  {
    step: "03",
    title: "Take action",
    label: "Integrations + automation",
    description: "Connect the AI system to the applications and workflows people rely on.",
  },
  {
    step: "04",
    title: "Operate responsibly",
    label: "Infrastructure + evaluation + security",
    description: "Deploy, observe, evaluate, protect, and improve the system over time.",
  },
] as const;

export default function EnterpriseAIStackPage() {
  return (
    <main>
      <div className="border-b border-[#20303b]">
        <header className="container flex min-h-[86px] items-center justify-between gap-4">
          <Link href="/" aria-label="Metanomic home" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#7b986d] bg-[#c9ec8a] text-lg font-black text-[#122322]">M</span>
            <span className="text-[18px] font-semibold tracking-[-.035em]">metanomic<span className="text-[#c9ec8a]">.</span></span>
          </Link>
          <nav aria-label="Page navigation" className="flex items-center gap-4 sm:gap-7">
            <Link href="/" className="navlink">Home</Link>
            <Link href="/#services" className="navlink hidden sm:inline">Services</Link>
            <Link href="/contact" className="button button-outline !min-h-[40px] !px-4">Let&apos;s talk <span aria-hidden="true">→</span></Link>
          </nav>
        </header>
      </div>

      <section className="relative border-b border-[#263843] py-20 md:py-28">
        <div className="container">
          <div className="max-w-[880px]">
            <p className="eyebrow">Metanomic / Field Guide 01</p>
            <h1 className="mt-6 text-[clamp(3rem,6.8vw,5.8rem)] font-semibold leading-[1.05] tracking-[-.07em]">
              The enterprise AI <span className="text-[#c9ec8a]">technology stack.</span>
            </h1>
            <p className="muted mt-8 max-w-[760px] text-[17px] leading-[1.9] md:text-lg">
              What does it take to move from an AI experiment to a reliable business tool?
              More than a model. Production AI brings together agents, data, integrations,
              infrastructure, evaluation, and security—each layer serving the people who use it.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href="#layers" className="button button-primary">Explore the 10 layers <span aria-hidden="true">↓</span></a>
              <a href="#architecture" className="button button-outline">See how they fit together</a>
            </div>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-[#30444a] bg-[#30444a] sm:grid-cols-3">
            <div className="bg-[#111e27]/95 p-6">
              <p className="text-3xl font-semibold tracking-[-.06em] text-[#c9ec8a]">10</p>
              <p className="muted mt-1 text-sm">Core technology layers</p>
            </div>
            <div className="bg-[#111e27]/95 p-6">
              <p className="text-3xl font-semibold tracking-[-.06em] text-[#c9ec8a]">1</p>
              <p className="muted mt-1 text-sm">Connected production system</p>
            </div>
            <div className="bg-[#111e27]/95 p-6">
              <p className="text-3xl font-semibold tracking-[-.06em] text-[#c9ec8a]">Human</p>
              <p className="muted mt-1 text-sm">Impact as the measure of success</p>
            </div>
          </div>
        </div>
      </section>

      <section id="layers" className="py-20 md:py-28">
        <div className="container">
          <div className="max-w-[780px]">
            <p className="eyebrow">The essential components</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-.055em] md:text-5xl">Ten layers. One useful system.</h2>
            <p className="muted mt-5 leading-8">
              These are representative tools used across enterprise AI development—not a
              ranking, and not a requirement to adopt every product. The right combination
              depends on the organization, existing systems, and work to be done.
            </p>
          </div>
          <nav aria-label="Technology layer index" className="mt-10 flex flex-wrap gap-2">
            {layers.map(layer => (
              <a key={layer.id} href={`#${layer.id}`} className="rounded-full border border-[#344c53] bg-[#12212b]/85 px-3 py-2 text-xs text-[#c5d5d0] transition-colors hover:border-[#c9ec8a] hover:text-white">
                {layer.number} / {layer.name}
              </a>
            ))}
          </nav>
          <div className="mt-9 grid gap-4 md:grid-cols-2">
            {layers.map(layer => (
              <article id={layer.id} key={layer.id} className="card scroll-mt-8">
                <div className="flex items-start justify-between gap-4">
                  <p className="eyebrow">{layer.number} / Stack layer</p>
                  <span aria-hidden="true" className="text-[#6b8b7a]">→</span>
                </div>
                <h3 className="mt-6 text-[26px] font-semibold tracking-[-.045em]">{layer.name}</h3>
                <p className="muted mt-4 min-h-[90px] text-sm leading-7">{layer.description}</p>
                <p className="mt-7 border-t border-[#31434d] pt-5 text-[11px] font-semibold uppercase tracking-[.15em] text-[#c9ec8a]">Representative tools</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {layer.tools.map(tool => (
                    <span key={tool} className="rounded border border-[#354750] bg-[#0b1720]/80 px-2.5 py-1.5 text-xs text-[#d3e0da]">{tool}</span>
                  ))}
                </div>
                <p className="mt-6 text-xs leading-6 text-[#a8bfb4]"><span className="font-semibold text-[#d7e8d7]">Primary role:</span> {layer.purpose}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="architecture" className="rule py-20 md:py-28">
        <div className="container grid gap-12 lg:grid-cols-[.65fr_1fr]">
          <div>
            <p className="eyebrow">Putting the pieces together</p>
            <h2 className="mt-4 max-w-[490px] text-4xl font-semibold tracking-[-.055em] md:text-5xl">From capability to human impact.</h2>
            <p className="muted mt-6 max-w-[510px] leading-8">
              A working system connects the layers into a dependable flow. It starts with a
              human goal and ends with a result people can understand, trust, and use.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-[#31434d] bg-[#0e1d27]/90 backdrop-blur-sm">
            {architecture.map((step, index) => (
              <div key={step.step} className={`grid gap-4 p-6 sm:grid-cols-[58px_1fr] sm:gap-6 md:p-8 ${index ? "border-t border-[#31434d]" : ""}`}>
                <span className="text-xl font-semibold tracking-[-.04em] text-[#c9ec8a]">{step.step}</span>
                <div>
                  <p className="eyebrow">{step.label}</p>
                  <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
                  <p className="muted mt-2 text-sm leading-7">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#405242] bg-[#c9ec8a]/90 py-16 text-[#14231e] backdrop-blur-sm md:py-20">
        <div className="container flex flex-wrap items-center justify-between gap-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em]">Build for meaningful outcomes</p>
            <h2 className="mt-3 max-w-[680px] text-4xl font-semibold tracking-[-.06em] md:text-5xl">The technology matters. People matter more.</h2>
            <p className="mt-4 max-w-[600px] text-sm leading-7 text-[#244038]">Metanomic builds AI tools around the people, processes, and goals they are meant to support.</p>
          </div>
          <Link href="/contact" className="button !bg-[#14231e] !text-[#eff7e8]">Talk with our team <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <footer className="container flex flex-wrap items-center justify-between gap-5 py-10">
        <Link href="/" className="text-[18px] font-semibold tracking-[-.035em]">metanomic<span className="text-[#c9ec8a]">.</span></Link>
        <p className="muted text-xs">© {new Date().getFullYear()} Metanomic. All rights reserved.</p>
        <Link className="navlink" href="/">Back to home</Link>
      </footer>
    </main>
  );
}
