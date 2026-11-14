import Link from "next/link";

const services = [
  { number: "01", title: "AI strategy & advisory", description: "Find the opportunities worth pursuing. We turn promising AI ideas into clear, practical plans grounded in your business." },
  { number: "02", title: "Custom AI agents", description: "Purpose-built digital teammates that research, coordinate, and complete work within the guardrails you define." },
  { number: "03", title: "Workflow automation", description: "Remove repetitive work and connect the systems your team already depends on—without losing human oversight." },
  { number: "04", title: "Integration & operations", description: "Connect data, tools, and processes into reliable systems that can be maintained, monitored, and improved." }
];
const steps = [
  { index: "01", title: "Understand", description: "We start with your people, your processes, and the outcomes that matter." },
  { index: "02", title: "Design", description: "We map a useful solution, establish boundaries, and define how success is measured." },
  { index: "03", title: "Build", description: "We develop and integrate agents and automations into real working systems." },
  { index: "04", title: "Improve", description: "We evaluate results, refine performance, and support responsible growth." }
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
          <a className="navlink" href="#about">About</a>
        </nav>
        <Link href="/contact" className="button button-outline !min-h-[40px] !px-4">Let&apos;s talk <span aria-hidden>↗</span></Link>
      </header>
    </div>

    <section className="relative overflow-hidden">
      <div className="container relative flex min-h-[min(83vh,820px)] items-center py-28 md:py-36">
        <div>
          <span className="pill">Thoughtful AI. Real-world impact.</span>
          <h1 className="mt-8 max-w-[790px] text-[clamp(3.4rem,7.5vw,6.9rem)] leading-[1.02] font-semibold tracking-[-.075em]">Human purpose.<br/><span className="text-[#c9ec8a]">Intelligent</span><br/>execution.</h1>
          <p className="muted mt-8 max-w-[550px] text-[17px] leading-[1.85]">We help organizations put AI to work. From smart strategy to custom agents and connected workflows, we build technology that gives people more room to do what matters.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/contact" className="button button-primary">Start a conversation <span aria-hidden>↗</span></Link>
            <a href="#services" className="button button-outline">Explore our services <span aria-hidden>↓</span></a>
          </div>
        </div>
      </div>
    </section>

    <section id="services" className="rule py-24 md:py-30">
      <div className="container">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-8">
          <div><p className="eyebrow">What we do</p><h2 className="mt-4 max-w-[620px] text-4xl font-semibold tracking-[-.055em] md:text-5xl">Intelligence built for the way you work.</h2></div>
          <p className="muted max-w-[320px] text-sm leading-7">No technology for technology&apos;s sake. Just useful solutions designed around your business.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => <article className="card group min-h-[255px]" key={service.number}>
            <span className="eyebrow">{service.number} / Expertise</span>
            <h3 className="mt-7 text-[25px] font-semibold tracking-[-.04em]">{service.title}</h3>
            <p className="muted mt-4 max-w-[480px] text-sm leading-7">{service.description}</p>
          </article>)}
        </div>
      </div>
    </section>

    <section id="approach" className="rule py-24 md:py-28">
      <div className="container">
        <p className="eyebrow">How we work</p>
        <h2 className="mt-4 max-w-[640px] text-4xl font-semibold tracking-[-.055em] md:text-5xl">People first. Purpose always.</h2>
        <p className="muted mt-6 max-w-[650px] leading-8">The best AI systems are designed with people—not just processes—in mind. We bring care, clarity, and practical engineering to every engagement.</p>
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
        <div><h2 className="text-4xl font-semibold leading-[1.15] tracking-[-.06em] md:text-[3.3rem]">Technology should extend human capability, not complicate it.</h2>
          <p className="muted mt-7 max-w-[660px] leading-8">We believe the future of work is a partnership between human judgment and intelligent systems. Our role is to make that partnership useful, reliable, and accessible—one thoughtfully built solution at a time.</p>
        </div>
      </div>
    </section>

    <section className="border-y border-[#405242] bg-[#c9ec8a]/90 py-20 text-[#14231e] backdrop-blur-sm">
      <div className="container flex flex-wrap items-center justify-between gap-8">
        <div><p className="text-xs font-bold uppercase tracking-[.2em]">Build what comes next</p><h2 className="mt-3 max-w-[660px] text-4xl font-semibold tracking-[-.06em] md:text-5xl">Let&apos;s make intelligence useful.</h2></div>
        <Link href="/contact" className="button !bg-[#14231e] !text-[#eff7e8]">Talk with Metanomic <span aria-hidden>↗</span></Link>
      </div>
    </section>
    <footer className="container flex flex-wrap items-center justify-between gap-5 py-10"><Logo/><p className="muted text-xs">© {new Date().getFullYear()} Metanomic. All rights reserved.</p><Link className="navlink" href="/contact">Contact</Link></footer>
  </main>;
}
