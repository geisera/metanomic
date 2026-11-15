import Link from "next/link";
import styles from "./services.module.css";
import { contextPrompts } from "@/lib/theia-dock";
import TheiaLink from "@/components/TheiaLink";
import TheiaNav from "@/components/TheiaNav";
import TheiaShowcase from "@/components/TheiaShowcase";

const services = [
  { number: "01", audience: "FOR ANALYSTS & EXPERTS", title: "Knowledge & research agents", outcome: "Answers your team can trace.", description: "Searches approved sources, compares evidence, and cites every finding.", icon: "M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 6 6M7 8h6M7 11h4" },
  { number: "02", audience: "FOR OPERATIONS", title: "Operations agents", outcome: "Routine work that doesn't stall.", description: "Coordinates recurring tasks across systems, chases missing information, and escalates exceptions.", icon: "M4 4h6v6H4zM14 14h6v6h-6zM10 7h7v7M7 10v7h7" },
  { number: "03", audience: "FOR SUPPORT", title: "Customer service agents", outcome: "Faster resolutions, cleaner handoffs.", description: "Answers questions, investigates account issues, and passes complex cases to your team with full context.", icon: "M4 13v-2a8 8 0 0 1 16 0v2M4 12H2v6h4v-6H4Zm16 0h2v6h-4v-6h2Zm0 6v1a2 2 0 0 1-2 2h-6" },
  { number: "04", audience: "FOR REVENUE TEAMS", title: "Sales & intake agents", outcome: "Every inquiry qualified and logged.", description: "Collects requirements, updates your CRM, and books the next step.", icon: "M4 4h16l-6 8v7l-4 2v-9L4 4ZM16 16l2 2 4-4" },
  { number: "05", audience: "FOR BACK OFFICE", title: "Document-processing agents", outcome: "Documents in, validated data out.", description: "Extracts and checks information, flags gaps and inconsistencies, and queues follow-up.", icon: "M14 2H4v20h16V8l-6-6Zm0 0v6h6M8 15l3 3 5-6" },
  { number: "06", audience: "FOR SALESFORCE ORGS", title: "Salesforce agents", outcome: "Agents native to your org.", description: "Investigates cases, recommends resolutions, and updates only the fields you approve.", icon: "M6 18a4 4 0 0 1-1-8 6 6 0 0 1 11-3 5 5 0 1 1 2 11H6ZM9 12l2 2 4-4" }
];
const steps = [
  { index: "01", title: "Understand", description: "We begin with the people, their ambitions, and the work worth amplifying." },
  { index: "02", title: "Design", description: "We shape the solution around human needs, clear safeguards, and measurable impact." },
  { index: "03", title: "Build", description: "We put practical AI tools into people's hands, integrated with how they already work." },
  { index: "04", title: "Improve", description: "We learn from real use, refine the tools, and help their human impact grow." }
];

function Logo() {
  return <Link href="/" aria-label="Metanomic home" className="flex items-center gap-3">
    <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#7b986d] bg-[#c9ec8a] text-[#122322] font-black text-lg">M</span>
    <span className="text-[18px] font-semibold tracking-[-.035em]">metanomic<span className="text-[#c9ec8a]">.</span></span>
  </Link>;
}

export default function Home() {
  return <main>
    <div className="sticky top-0 z-40">
      <div className="border-b border-[#20303b] bg-[#091019]/95 backdrop-blur-sm">
        <header className="container flex min-h-[86px] items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Primary navigation" className="hidden items-center gap-8 lg:flex">
          <a className="navlink" href="#services">What we do</a>
          <a className="navlink" href="#approach">Our approach</a>
          <Link className="navlink" href="/enterprise-ai-stack">AI stack</Link>
          <TheiaNav />
          <a className="navlink" href="#about">About</a>
        </nav>
        <Link href="/contact" className="button button-outline !min-h-[40px] !px-4">Let&apos;s talk <span aria-hidden>→</span></Link>
      </header>
      </div>
    </div>

    <section id="home-hero" className="relative overflow-hidden">
      <div className="container relative flex min-h-[min(83vh,820px)] items-center py-28 md:py-36">
        <div>
          <span className="pill">Human purpose. Intelligent execution.</span>
          <h1 className="mt-8 max-w-[790px] text-[clamp(3.4rem,7.5vw,6.9rem)] leading-[1.02] font-semibold tracking-[-.075em]">AI that magnifies<br/><span className="text-[#c9ec8a]">human impact.</span></h1>
          <p className="muted mt-8 max-w-[550px] text-[17px] leading-[1.85]">We build AI tools that give people greater reach and more room to do their best work. From custom agents to connected workflows, our mission is to turn human expertise, ambition, and ideas into meaningful results at a greater scale.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/contact" className="button button-primary">Start a conversation <span aria-hidden>→</span></Link>
            <TheiaLink source="hero" className="button button-outline">Describe a workflow, get a pilot plan →</TheiaLink>
          </div>
          <a href="#services" className="mt-5 inline-flex rounded py-2 text-sm text-[#d5e5dc]">Explore our services ↓</a>
        </div>
      </div>
    </section>

    <section id="services" className={`rule py-24 md:py-30 ${styles.section}`}>
      <div className="container">
        <div className="mb-12">
          <p className="eyebrow">What we do</p>
          <h2 className="mt-4 max-w-[900px] text-4xl font-semibold tracking-[-.055em] md:text-5xl">AI agents that do the work. Your people make the calls.</h2>
          <p className="muted mt-6 max-w-[65ch] text-lg leading-relaxed md:text-xl">We design, integrate, and run custom agents that use your knowledge and your tools to finish defined tasks, inside the permissions you set.</p>
        </div>
        <div className={styles.grid}>
          {services.map((service) => <TheiaLink source="card" prompt={contextPrompts[service.title].replace(/…$/, ".")} id={`service-${service.number}`} data-theia-context={service.title} className={`card ${styles.card}`} key={service.number} aria-label={`${service.title}: Ask Theia about this`}>
            <svg className={styles.icon} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={service.icon} /></svg>
            <svg className={styles.arrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            <p className="eyebrow mt-5">{service.number} / {service.audience}</p>
            <h3 className="mt-5 text-[25px] font-semibold tracking-[-.04em]">{service.title}</h3>
            <p className={styles.outcome}>{service.outcome}</p>
            <p className={styles.body}>{service.description}</p>
            <span className="mt-auto pt-6 text-sm font-semibold text-[#c9ec8a]">Ask Theia about this →</span>
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
          <TheiaLink source="section-input" className="button button-outline">Ask Theia about your workflow →</TheiaLink>
        </div>
      </div>
    </section>

    <TheiaShowcase />

    <section aria-label="Explore the technology">
      <div className="container">
        <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-lg border border-[#31454b] bg-[#0e1d27]/85 p-6 backdrop-blur-sm md:p-8">
          <div>
            <p className="eyebrow">Explore the technology</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-.035em]">What goes into an enterprise AI system?</h3>
            <p className="muted mt-2 max-w-[650px] text-sm leading-7">Explore the models, agents, integrations, and infrastructure behind AI tools built for real work.</p>
          </div>
          <Link href="/enterprise-ai-stack" className="button button-outline">Explore the AI stack <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </section>

    <section id="approach" className="rule py-24 md:py-28">
      <div className="container">
        <p className="eyebrow">How we work</p>
        <h2 className="mt-4 max-w-[640px] text-4xl font-semibold tracking-[-.055em] md:text-5xl">People lead. Intelligence amplifies.</h2>
        <p className="muted mt-6 max-w-[650px] leading-8">Every engagement starts with the people whose work matters. We pair human judgment with thoughtfully designed AI to expand capability while keeping people in control.</p>
        <div className="mt-14 grid gap-8 md:grid-cols-4">
          {steps.map((step) => <div className="border-t border-[#426050] pt-5" key={step.index}>
            <span className="text-xs font-bold text-[#c9ec8a]">{step.index}</span>
            <h3 className="mt-7 text-xl font-semibold">{step.title}</h3>
            <p className="muted mt-3 text-sm leading-7">{step.description}</p>
          </div>)}
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

    <section className="border-y border-[#405242] bg-[#c9ec8a]/90 py-20 text-[#14231e] backdrop-blur-sm">
      <div className="container flex flex-wrap items-center justify-between gap-8">
        <div><p className="text-xs font-bold uppercase tracking-[.2em]">Build what comes next</p><h2 className="mt-3 max-w-[660px] text-4xl font-semibold tracking-[-.06em] md:text-5xl">Let&apos;s make a bigger impact.</h2></div>
        <div className="flex flex-wrap items-center gap-5"><Link href="/contact" className="button !bg-[#14231e] !text-[#eff7e8]">Talk with our team →</Link><TheiaLink source="final-cta" className="rounded py-3 font-semibold">Or start with Theia →</TheiaLink></div>
      </div>
    </section>
    <footer className="container flex flex-wrap items-center justify-between gap-5 py-10"><Logo/><p className="muted text-xs">© {new Date().getFullYear()} Metanomic. All rights reserved.</p><nav aria-label="Footer navigation" className="flex flex-wrap gap-6"><TheiaLink source="footer" className="navlink rounded">Try Theia →</TheiaLink><Link className="navlink" href="/contact">Contact our team →</Link></nav></footer>
  </main>;
}
