import PrimaryNav from "@/components/PrimaryNav";
import type { Metadata } from "next";
import Link from "next/link";
import LayerNavigation from "./LayerNavigation";
import styles from "./stack.module.css";

const title = "The Enterprise AI Stack: 10 Layers from Pilot to Production | Metanomic";
const description = "A practical guide to the ten layers of enterprise AI, the tools in each (OpenAI Agents SDK, Google ADK, n8n, Zapier, MCP), and how to choose between automating, assembling and building custom agents.";
export const metadata: Metadata = {
  title: { absolute: title }, description,
  alternates: { canonical: "/enterprise-ai-stack" },
  openGraph: { title, description, url: "https://metanomic.ai/enterprise-ai-stack", type: "article" },
  twitter: { card: "summary_large_image", title, description },
};

// Enable only after all proof placeholders below have approved real content.
const SHOW_PROOF = false;

const layers = [
  {
    "id": "models",
    "number": "01",
    "name": "AI models & APIs",
    "description": "The reasoning and generation layer. Models interpret information, produce responses, analyze content, and power the decisions or recommendations used by an AI application.",
    "groups": [
      {
        "label": "Hosted APIs",
        "tools": [
          "OpenAI",
          "Anthropic Claude",
          "Google Gemini"
        ]
      },
      {
        "label": "Open-weight / self-hosted",
        "tools": [
          "Meta Llama",
          "Mistral"
        ]
      }
    ],
    "choose": "You need a model to interpret information, generate responses, or support decisions."
  },
  {
    "id": "agent-development",
    "number": "02",
    "name": "Agent development",
    "description": "Frameworks for building AI agents that can use tools, follow instructions, coordinate work, and take defined actions rather than simply return text. Custom agents are built here, in code, when an off-the-shelf builder can't meet your logic, data or compliance requirements.",
    "groups": [
      {
        "label": "Vendor SDKs",
        "tools": [
          "OpenAI Agents SDK",
          "Google ADK",
          "Claude Agent SDK"
        ]
      },
      {
        "label": "Open frameworks",
        "tools": [
          "LangChain",
          "CrewAI",
          "LlamaIndex",
          "Pydantic AI"
        ]
      }
    ],
    "choose": "You need an agent that uses tools and takes defined actions to complete a task."
  },
  {
    "id": "orchestration",
    "number": "03",
    "name": "Agent orchestration",
    "description": "The control layer for multi-step operations. Orchestration helps manage execution state, retries, long-running work, handoffs, and human approval checkpoints. Layer 02 builds one agent. Layer 03 keeps many steps and agents running reliably.",
    "groups": [
      {
        "label": "Tools",
        "tools": [
          "LangGraph",
          "Temporal",
          "Microsoft Agent Framework"
        ]
      }
    ],
    "choose": "Your process needs multiple steps, retries, handoffs, or human approval checkpoints."
  },
  {
    "id": "enterprise-platforms",
    "number": "04",
    "name": "Enterprise AI platforms",
    "description": "Managed environments for operating AI systems at organizational scale, with platform services for deploying agents and applying enterprise controls.",
    "groups": [
      {
        "label": "Pro-code platforms",
        "tools": [
          "Microsoft Foundry",
          "AWS Bedrock AgentCore",
          "Gemini Enterprise Agent Platform"
        ]
      },
      {
        "label": "Low-code builders",
        "tools": [
          "Microsoft Copilot Studio",
          "Salesforce Agentforce"
        ]
      }
    ],
    "choose": "You need a managed environment to deploy agents and apply controls across your organization."
  },
  {
    "id": "automation",
    "number": "05",
    "name": "Workflow automation",
    "description": "Connect intelligence to repeatable business processes. Automation tools move information between applications and coordinate work with or without a person in the loop.",
    "groups": [
      {
        "label": "No-code SaaS",
        "tools": [
          "Zapier",
          "Make"
        ]
      },
      {
        "label": "Self-hostable",
        "tools": [
          "n8n"
        ]
      },
      {
        "label": "Enterprise and RPA",
        "tools": [
          "Microsoft Power Automate",
          "UiPath",
          "Workato"
        ]
      }
    ],
    "choose": "You need to move information between applications and coordinate a repeatable business process."
  },
  {
    "id": "retrieval",
    "number": "06",
    "name": "Data & retrieval",
    "description": "Provide relevant organizational context, from structured records to searchable documents, so AI systems can work with information beyond the model's built-in knowledge. Connected to the sources you already have: SharePoint, Salesforce, Snowflake, Databricks.",
    "groups": [
      {
        "label": "Tools",
        "tools": [
          "PostgreSQL / pgvector",
          "Pinecone",
          "Weaviate",
          "Elasticsearch"
        ]
      }
    ],
    "choose": "Your AI system needs to use organizational records and documents beyond its built-in knowledge."
  },
  {
    "id": "integration",
    "number": "07",
    "name": "AI integration",
    "description": "Make enterprise tools available to AI systems in a controlled way. Integrations connect agents to the services where people actually do their work.",
    "groups": [
      {
        "label": "Standards",
        "tools": [
          "MCP",
          "A2A",
          "OpenAPI",
          "Function calling"
        ]
      },
      {
        "label": "Platforms",
        "tools": [
          "MuleSoft",
          "Zapier MCP"
        ]
      }
    ],
    "choose": "Your agents need controlled access to the business systems where work happens."
  },
  {
    "id": "evaluation",
    "number": "08",
    "name": "Evaluation & monitoring",
    "description": "Trace what agents do, assess output quality, investigate failures, and measure whether an AI system reliably completes the work it was designed to support.",
    "groups": [
      {
        "label": "Platforms",
        "tools": [
          "LangSmith",
          "Langfuse",
          "Braintrust",
          "Arize Phoenix"
        ]
      },
      {
        "label": "Open standard",
        "tools": [
          "OpenTelemetry"
        ]
      }
    ],
    "choose": "You need to trace agent actions, assess quality, and investigate failures."
  },
  {
    "id": "infrastructure",
    "number": "09",
    "name": "Deployment infrastructure",
    "description": "The operational foundation for hosting applications, APIs, agents, and supporting services, with infrastructure choices matched to the demands of each environment.",
    "groups": [
      {
        "label": "Containers",
        "tools": [
          "Docker",
          "Kubernetes"
        ]
      },
      {
        "label": "Cloud",
        "tools": [
          "Azure",
          "AWS",
          "Google Cloud"
        ]
      },
      {
        "label": "App hosting",
        "tools": [
          "Vercel"
        ]
      }
    ],
    "choose": "You need to host, release, and scale your AI application and its supporting services."
  },
  {
    "id": "governance",
    "number": "10",
    "name": "Security & governance",
    "description": "Control who and what can access data, credentials, tools, and sensitive actions. Governance turns technical capability into a system an organization can safely operate.",
    "groups": [
      {
        "label": "Identity and secrets",
        "tools": [
          "Microsoft Entra",
          "Okta",
          "HashiCorp Vault",
          "Cloud IAM"
        ]
      },
      {
        "label": "Guardrails, audit and data protection",
        "tools": [
          "Microsoft Purview"
        ]
      }
    ],
    "choose": "You need to control access to data, credentials, tools, and sensitive actions."
  }
] as const;

const routes = [
  { title: "Automate", fits: "Fits when the process is linear, uses SaaS apps and has low risk.", tools: ["Zapier", "Make", "n8n"] },
  { title: "Assemble", fits: "Fits when you need agents inside a suite you already use.", tools: ["Microsoft Copilot Studio", "Salesforce Agentforce", "Gemini Enterprise"] },
  { title: "Build custom", fits: "Fits when you have proprietary logic, regulated data or actions across several systems.", tools: ["OpenAI Agents SDK", "Google ADK", "Claude Agent SDK", "LangGraph", "MCP"] },
  { title: "Platform", fits: "Fits when you run many agents and need central governance.", tools: ["Microsoft Foundry", "AWS Bedrock AgentCore"] },
];
const flow = [
  { text: "A claims email arrives.", layers: [] },
  { text: "Claude classifies it.", layers: ["01"] },
  { text: "An agent built on the OpenAI Agents SDK pulls the policy through MCP.", layers: ["02", "07"] },
  { text: "n8n routes it to a person for approval.", layers: ["05"] },
  { text: "Langfuse logs the full trace.", layers: ["08"] },
];
function Tags({ tools }: { tools: readonly string[] }) {
  return <div className="mt-2 flex flex-wrap gap-2">{tools.map(tool => <span key={tool} className="rounded border border-[var(--site-354750)] bg-[var(--site-0b1720)]/80 px-2.5 py-1.5 text-xs text-[var(--site-d3e0da)]">{tool}</span>)}</div>;
}
export default function EnterpriseAIStackPage() {
  return <main className={styles.page}>
    <PrimaryNav />
    <section className="relative border-b border-[var(--site-263843)] py-20 md:py-28">
      <div className="container">
        <div className="max-w-[1000px]">
          <p className="eyebrow">Field guide · 6 min read · Updated November 2026</p>
          <h1 className="mt-6 text-[clamp(3rem,6.8vw,5.8rem)] font-semibold leading-[1.05] tracking-[-.07em]">The 10 layers between an AI pilot and <span className="text-[var(--site-c9ec8a)]">a production system.</span></h1>
          <p className="muted mt-8 max-w-[760px] text-[17px] leading-[1.9] md:text-lg">Most AI pilots stall because a model is only one of ten layers. Here is each layer, the tools that fill it (OpenAI Agents SDK, Google ADK, n8n, MCP and more), and how to choose.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link href="/contact" className="button button-primary">Get a stack recommendation →</Link><a href="#layers" className="button button-outline">Explore the 10 layers ↓</a></div>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-[var(--site-30444a)] bg-[var(--site-30444a)] sm:grid-cols-3">{[["10","Layers explained"],["40+","Tools mapped"],["1","Decision framework"]].map(([value,label])=><div key={label} className="bg-[var(--site-111e27)]/95 p-6"><p className="text-3xl font-semibold tracking-[-.06em] text-[var(--site-c9ec8a)]">{value}</p><p className="muted mt-1 text-sm">{label}</p></div>)}</div>
      </div>
    </section>
    {SHOW_PROOF && <section aria-label="Guide author and proof" className="rule py-6"><div className="container"><p>By TODO: approved author · Updated November 2026</p><div className="mt-3 flex flex-wrap gap-6"><p>TODO: approved client logos</p><p>TODO: verified outcome metrics</p></div></div></section>}
    <section id="layers" className="py-20 md:py-28">
      <div className="container">
        <div className="max-w-[780px]"><p className="eyebrow">The essential components</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.055em] md:text-5xl">Ten layers. One useful system.</h2><p className="muted mt-5 leading-8">You don&apos;t need all ten on day one. Most teams start with three.</p></div>
        <LayerNavigation layers={layers.map(({id,number,name})=>({id,number,name}))} />
        <div className="mt-9 grid gap-4 md:grid-cols-2">{layers.map(layer=><article id={layer.id} key={layer.id} className={`card min-w-0 ${styles.layer}`}>
          <p className="eyebrow">{layer.number}</p><h3 className="mt-6 text-[26px] font-semibold tracking-[-.045em]">{layer.name}</h3>
          <p className="muted mt-4 text-sm leading-7">{layer.description}</p>
          <p className="mt-6 text-sm leading-7 text-[var(--site-a8bfb4)]"><strong className="text-[var(--site-d7e8d7)]">Choose this when:</strong> {layer.choose}</p>
          <p className="mt-7 border-t border-[var(--site-31434d)] pt-5 text-[11px] font-semibold uppercase tracking-[.15em] text-[var(--site-c9ec8a)]">{layer.id === "integration" ? "Representative standards & tools" : "Representative tools"}</p>
          {layer.groups.map(group=><div key={group.label} className="mt-4"><p className="muted text-xs">{group.label}</p><Tags tools={group.tools}/></div>)}
          <details className="mt-6 border-t border-[var(--site-31434d)] pt-4"><summary className="cursor-pointer rounded py-2 text-sm font-semibold text-[var(--site-d7e8d7)]">How we implement this</summary><p className="muted mt-3 text-sm leading-7">TODO: Add approved Metanomic implementation guidance for {layer.name}.</p></details>
        </article>)}</div>
        <p className="muted mt-6 text-xs leading-6">Tools shown are representative examples, not a ranking or a required set.</p>
        <div className={styles.band}><p className="text-xl font-semibold">Not sure which layers you need?</p><Link href="/contact" className="button button-primary">Get a stack recommendation →</Link></div>
      </div>
    </section>
    <section id="decide" className="rule py-20 md:py-28"><div className="container">
      <p className="eyebrow">Choosing a path</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.055em] md:text-5xl">Automate, assemble, or build?</h2><p className="muted mt-5 leading-8">Four common routes to production, and when each one fits.</p>
      <div className="mt-10 grid gap-4 lg:grid-cols-4">{routes.map(route=><article key={route.title} className="card min-w-0"><h3 className="text-2xl font-semibold">{route.title}</h3><p className="muted mt-4 text-sm leading-7">{route.fits}</p><div className="mt-5"><Tags tools={route.tools}/></div></article>)}</div>
      <div className={styles.band}><p className="text-xl font-semibold">Not sure which path fits?</p><Link href="/contact" className="button button-primary">Book a 30-minute stack review →</Link></div>
    </div></section>
    <section id="architecture" className="rule py-20 md:py-28"><div className="container">
      <p className="eyebrow">Putting the pieces together</p><h2 className="mt-4 max-w-[850px] text-4xl font-semibold tracking-[-.055em] md:text-5xl">How the layers work together on one request.</h2><p className="muted mt-6 leading-8">One example, traced through the stack.</p>
      <ol className={styles.flow}>{flow.map(step=><li key={step.text} className="min-w-0 rounded-xl border border-[var(--site-31434d)] bg-[var(--site-0e1d27)]/90 p-6"><p className="mb-4 flex min-h-6 flex-wrap gap-3 text-xs font-semibold text-[var(--site-c9ec8a)]">{step.layers.map(number=><a key={number} href={`#${layers.find(layer=>layer.number===number)!.id}`} className="underline underline-offset-4">Layer {number}</a>)}</p><p className="text-sm leading-7">{step.text}</p></li>)}</ol>
    </div></section>
    <section className={`border-y border-[var(--site-405242)] bg-[#c9ec8a]/90 py-16 text-[#14231e] backdrop-blur-sm md:py-20 ${styles.closing}`}><div className="container">
      <p className="text-xs font-bold uppercase tracking-[.2em]">Next step</p><h2 className="mt-3 max-w-[850px] text-4xl font-semibold tracking-[-.06em] md:text-5xl">Find out which layers you need, and which you can skip.</h2>
      <p className="mt-4 max-w-[680px] text-sm leading-7 text-[#244038]">In 30 minutes we map your current systems to the ten layers and show the shortest route to production. No slides, no obligation.</p>
      <div className="mt-8 flex flex-wrap items-center gap-6"><Link href="/contact" className="button !bg-[var(--site-14231e)] !text-[var(--site-eff7e8)]">Book a stack review →</Link><a href="#stack-pdf-todo" className="rounded font-semibold underline underline-offset-4">Download the stack as a one-page PDF</a></div>
      <p id="stack-pdf-todo" className="mt-5 text-sm">TODO: Add the approved one-page PDF asset and email-capture/download delivery flow.</p>
    </div></section>

  </main>;
}
