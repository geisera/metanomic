import Link from "next/link";
import { ArrowPathRoundedSquareIcon, ChatBubbleLeftRightIcon, CloudIcon, DocumentCheckIcon, DocumentMagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";
import styles from "./services.module.css";
import { servicePrompt } from "@/lib/theia-dock";
import TheiaLink from "@/components/TheiaLink";
import PrimaryNav from "@/components/PrimaryNav";
import TheiaShowcase from "@/components/TheiaShowcase";

const services = [
  { number: "01", audience: "FOR ANALYSTS & EXPERTS", title: "Knowledge & research agents", outcome: "Answers your team can trace.", description: "Searches approved sources, compares evidence, and cites every finding.", icon: DocumentMagnifyingGlassIcon },
  { number: "02", audience: "FOR OPERATIONS", title: "Operations agents", outcome: "Routine work that doesn't stall.", description: "Coordinates recurring tasks across systems, chases missing information, and escalates exceptions.", icon: ArrowPathRoundedSquareIcon },
  { number: "03", audience: "FOR SUPPORT", title: "Customer service agents", outcome: "Faster resolutions, cleaner handoffs.", description: "Answers questions, investigates account issues, and passes complex cases to your team with full context.", icon: ChatBubbleLeftRightIcon },
  { number: "04", audience: "FOR REVENUE TEAMS", title: "Sales & intake agents", outcome: "Every inquiry qualified and logged.", description: "Collects requirements, updates your CRM, and books the next step.", icon: FunnelIcon },
  { number: "05", audience: "FOR BACK OFFICE", title: "Document-processing agents", outcome: "Documents in, validated data out.", description: "Extracts and checks information, flags gaps and inconsistencies, and queues follow-up.", icon: DocumentCheckIcon },
  { number: "06", audience: "FOR SALESFORCE ORGS", title: "Salesforce agents", outcome: "Agents native to your org.", description: "Investigates cases, recommends resolutions, and updates only the fields you approve.", icon: CloudIcon }
];
const steps = [
  { index: "01", title: "Understand", description: "We begin with the people, their ambitions, and the work worth amplifying." },
  { index: "02", title: "Design", description: "We shape the solution around human needs, clear safeguards, and measurable impact." },
  { index: "03", title: "Build", description: "We put practical AI tools into people's hands, integrated with how they already work." },
  { index: "04", title: "Improve", description: "We learn from real use, refine the tools, and help their human impact grow." }
];

export default function Home() {
  return <main>
    <PrimaryNav />

    <section id="home-hero" className="relative overflow-hidden">
      <div className="container relative flex min-h-[min(83vh,820px)] items-center py-28 md:py-36">
        <div>
          <span className="pill">Human purpose. Intelligent execution.</span>
          <h1 className="mt-8 max-w-[790px] text-[clamp(3.4rem,7.5vw,6.9rem)] leading-[1.02] font-semibold tracking-[-.075em]">AI that magnifies<br/><span className="text-[var(--site-c9ec8a)]">human impact.</span></h1>
          <p className="muted mt-8 max-w-[550px] text-[17px] leading-[1.85]">We build AI tools that give people greater reach and more room to do their best work. From custom agents to connected workflows, our mission is to turn human expertise, ambition, and ideas into meaningful results at a greater scale.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/contact" className="button button-primary">Talk with our team <span aria-hidden>→</span></Link>
            <TheiaLink source="hero" className="button button-outline">Ask Theia, our AI advisor →</TheiaLink>
          </div>
          <a href="#services" className="mt-5 inline-flex rounded py-2 text-sm text-[var(--site-d5e5dc)]">Explore our services ↓</a>
        </div>
      </div>
    </section>

    <section id="services" className={`rule pt-24 pb-12 md:pt-30 md:pb-15 ${styles.section}`}>
      <div className="container">
        <div className="mb-12">
          <p className="eyebrow">What we do</p>
          <h2 className="mt-4 max-w-[900px] text-4xl font-semibold tracking-[-.055em] md:text-5xl">AI agents that do the work. Your people make the calls.</h2>
          <p className="muted mt-6 max-w-[65ch] text-lg leading-relaxed md:text-xl">We design, integrate, and run custom agents that use your knowledge and your tools to finish defined tasks, inside the permissions you set.</p>
        </div>
        <div className={styles.grid}>
          {services.map((service) => <TheiaLink source="card" prompt={servicePrompt(service.title)} id={`service-${service.number}`} data-theia-context={service.title} className={`card ${styles.card}`} key={service.number} aria-label={`${service.title}: Ask Theia about this`}>
            <service.icon className={styles.icon} width={28} height={28} />
            <p className="eyebrow mt-5">{service.number} / {service.audience}</p>
            <h3 className="mt-5 text-[25px] font-semibold tracking-[-.04em]">{service.title}</h3>
            <p className={styles.outcome}>{service.outcome}</p>
            <p className={styles.body}>{service.description}</p>
            <span className="mt-auto pt-6 text-sm font-semibold text-[var(--site-c9ec8a)]">Ask Theia about this →</span>
          </TheiaLink>)}
        </div>
        <p className="mt-8 text-center text-base leading-relaxed">Every agent ships with defined permissions, human approval on consequential actions, and measured results.</p>
        <ol className={styles.strip}>
          <li><span className="eyebrow">1.</span><div><p className="font-semibold">Pilot.</p><p className={styles.body}>One focused use case, scoped to a measurable outcome.</p></div></li>
          <li><span className="eyebrow">2.</span><div><p className="font-semibold">Production.</p><p className={styles.body}>Integrated with your systems, knowledge, and permissions.</p></div></li>
          <li><span className="eyebrow">3.</span><div><p className="font-semibold">Operations.</p><p className={styles.body}>Evaluated, monitored, and improved continuously.</p></div></li>
        </ol>
        <div className={styles.ctas}>
          <Link href="/contact" className="button button-primary">Talk with our team →</Link>
          <a href="#meet-theia" className="navlink rounded text-[var(--site-c9ec8a)]">See it live: meet Theia ↓</a>
        </div>
      </div>
    </section>

    <section id="approach" className="rule py-24 md:py-28">
      <div className="container">
        <p className="eyebrow">How we do it</p>
        <h2 className="mt-4 max-w-[640px] text-4xl font-semibold tracking-[-.055em] md:text-5xl">People lead. Intelligence amplifies.</h2>
        <p className="muted mt-6 max-w-[650px] leading-8">Every engagement starts with the people whose work matters. We pair human judgment with thoughtfully designed AI to expand capability while keeping people in control.</p>
        <div className="mt-14 grid gap-8 md:grid-cols-4">
          {steps.map((step) => <div className="border-t border-[var(--site-426050)] pt-5" key={step.index}>
            <span className="text-xs font-bold text-[var(--site-c9ec8a)]">{step.index}</span>
            <h3 className="mt-7 text-xl font-semibold">{step.title}</h3>
            <p className="muted mt-3 text-sm leading-7">{step.description}</p>
          </div>)}
        </div>
      </div>
    </section>

    <TheiaShowcase />

    <section aria-label="Explore the technology">
      <div className="container">
        <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-lg border border-[var(--site-31454b)] bg-[var(--site-0e1d27)]/85 p-6 backdrop-blur-sm md:p-8">
          <div>
            <p className="eyebrow">Explore the technology</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-.035em]">What goes into an enterprise AI system?</h3>
            <p className="muted mt-2 max-w-[650px] text-sm leading-7">Explore the models, agents, integrations, and infrastructure behind AI tools built for real work.</p>
          </div>
          <Link href="/enterprise-ai-stack" className="button button-outline">Explore the AI stack <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </section>

    <section id="about" className="rule py-24 md:py-32">
      <div className="container grid gap-10 md:grid-cols-[.55fr_1fr]">
        <p className="eyebrow pt-2">The Metanomic perspective</p>
        <div><h2 className="text-4xl font-semibold leading-[1.15] tracking-[-.06em] md:text-[3.3rem]">Human potential is the point.</h2>
          <p className="muted mt-7 max-w-[660px] leading-8">The promise of AI isn&apos;t to replace the people who do meaningful work. It&apos;s to extend their expertise, creativity, and ability to act. We build practical tools that put more possibility in human hands—helping individuals and organizations solve bigger problems and make a greater difference.</p>
        </div>
      </div>
    </section>

    <section className="border-y border-[var(--site-405242)] bg-[#c9ec8a]/90 py-20 text-[#14231e] backdrop-blur-sm">
      <div className="container flex flex-wrap items-center justify-between gap-8">
        <div><p className="text-xs font-bold uppercase tracking-[.2em]">Build what comes next</p><h2 className="mt-3 max-w-[660px] text-4xl font-semibold tracking-[-.06em] md:text-5xl">Let&apos;s make a bigger impact.</h2></div>
        <div className="flex flex-wrap items-center gap-5"><Link href="/contact" className="button !bg-[var(--site-14231e)] !text-[var(--site-eff7e8)]">Talk with our team →</Link><TheiaLink source="final-cta" className="rounded py-3 font-semibold">Or start with Theia →</TheiaLink></div>
      </div>
    </section>

  </main>;
}
