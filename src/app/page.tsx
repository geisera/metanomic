import Link from "next/link";

const services = [
  { number: "01", title: "AI strategy & advisory", description: "Find where AI can extend your team's expertise, remove constraints, and unlock meaningful outcomes. We turn those opportunities into practical plans." },
  { number: "02", title: "Custom AI agents", description: "Purpose-built agents that expand your team's reach—researching, coordinating, and taking action within boundaries you control." },
  { number: "03", title: "Workflow automation", description: "Give people more time for judgment, creativity, and connection by automating repetitive work without losing human oversight." },
  { number: "04", title: "Integration & operations", description: "Bring data, tools, and teams together so intelligent systems reliably support the people and outcomes that matter." }
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
    <div className="border-b border-[#20303b]">
      <header className="container flex min-h-[86px] items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Primary navigation" className="hidden items-center gap-8 md:flex">
          <a className="navlink" href="#services">What we do</a>
          <a className="navlink" href="#approach">Our approach</a>
          <Link className="navlink" href="/enterprise-ai-stack">AI stack</Link>
          <Link className="navlink" href="/demo">Meet Theia</Link>
          <a className="navlink" href="#about">About</a>
        </nav>
        <Link href="/contact" className="button button-outline !min-h-[40px] !px-4">Let&apos;s talk <span aria-hidden>↗</span></Link>
      </header>
    </div>

    <section className="relative overflow-hidden">
      <div className="container relative flex min-h-[min(83vh,820px)] items-center py-28 md:py-36">
        <div>
          <span className="pill">Human purpose. Intelligent execution.</span>
          <h1 className="mt-8 max-w-[790px] text-[clamp(3.4rem,7.5vw,6.9rem)] leading-[1.02] font-semibold tracking-[-.075em]">AI that magnifies<br/><span className="text-[#c9ec8a]">human impact.</span></h1>
          <p className="muted mt-8 max-w-[550px] text-[17px] leading-[1.85]">We build AI tools that give people greater reach and more room to do their best work. From custom agents to connected workflows, our mission is to turn human expertise, ambition, and ideas into meaningful results at a greater scale.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/contact" className="button button-primary">Start a conversation <span aria-hidden>↗</span></Link>
            <a href="#services" className="button button-outline">Explore our services <span aria-hidden>↓</span></a>
            <Link href="/demo" className="button button-outline">Meet Theia <span aria-hidden>↗</span></Link>
          </div>
        </div>
      </div>
    </section>

    <section id="services" className="rule py-24 md:py-30">
      <div className="container">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-8">
          <div><p className="eyebrow">What we do</p><h2 className="mt-4 max-w-[620px] text-4xl font-semibold tracking-[-.055em] md:text-5xl">More capability. Greater human impact.</h2></div>
          <p className="muted max-w-[320px] text-sm leading-7">The value of AI isn't what it does on its own. It's what people can accomplish with it.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => <article className="card group min-h-[255px]" key={service.number}>
            <span className="eyebrow">{service.number} / Expertise</span>
            <h3 className="mt-7 text-[25px] font-semibold tracking-[-.04em]">{service.title}</h3>
            <p className="muted mt-4 max-w-[480px] text-sm leading-7">{service.description}</p>
          </article>)}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-lg border border-[#31454b] bg-[#0e1d27]/85 p-6 backdrop-blur-sm md:p-8">
          <div>
            <p className="eyebrow">Explore the technology</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-.035em]">What goes into an enterprise AI system?</h3>
            <p className="muted mt-2 max-w-[650px] text-sm leading-7">Explore the models, agents, integrations, and infrastructure behind AI tools built for real work.</p>
          </div>
          <Link href="/enterprise-ai-stack" className="button button-outline">Explore the AI stack <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </section>

    <section className="rule py-16 md:py-20">
      <div className="container flex flex-wrap items-center justify-between gap-8 rounded-xl border border-[#3a5452] bg-[#10252a]/90 p-8 backdrop-blur-lg md:p-12">
        <div className="max-w-[700px]">
          <p className="eyebrow">See the technology in action</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-.05em] md:text-4xl">Meet Theia. An AI guide with a real job to do.</h2>
          <p className="muted mt-4 max-w-[600px] leading-8">Describe a business challenge. Theia, our interactive AI guide, helps turn it into a bounded pilot with practical tools, safeguards, and measurable outcomes.</p>
        </div>
        <Link href="/demo" className="button button-primary">Talk with Theia <span aria-hidden="true">↗</span></Link>
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
          <p className="muted mt-7 max-w-[660px] leading-8">The promise of AI isn't to replace the people who do meaningful work. It's to extend their expertise, creativity, and ability to act. We build practical tools that put more possibility in human hands—helping individuals and organizations solve bigger problems and make a greater difference.</p>
        </div>
      </div>
    </section>

    <section className="border-y border-[#405242] bg-[#c9ec8a]/90 py-20 text-[#14231e] backdrop-blur-sm">
      <div className="container flex flex-wrap items-center justify-between gap-8">
        <div><p className="text-xs font-bold uppercase tracking-[.2em]">Build what comes next</p><h2 className="mt-3 max-w-[660px] text-4xl font-semibold tracking-[-.06em] md:text-5xl">Let&apos;s make a bigger impact.</h2></div>
        <Link href="/contact" className="button !bg-[#14231e] !text-[#eff7e8]">Talk with Metanomic <span aria-hidden>↗</span></Link>
      </div>
    </section>
    <footer className="container flex flex-wrap items-center justify-between gap-5 py-10"><Logo/><p className="muted text-xs">© {new Date().getFullYear()} Metanomic. All rights reserved.</p><Link className="navlink" href="/contact">Contact</Link></footer>
  </main>;
}
