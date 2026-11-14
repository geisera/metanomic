import type { Metadata } from "next";
import Link from "next/link";
import AgentExperience from "./AgentExperience";

export const metadata: Metadata = {
  title: "AI Agent Demo — Workflow Advisor",
  description: "Experience Metanomic's interactive AI workflow advisor: explore enterprise AI use cases, inspect tool activity, and design a human-centered pilot.",
  alternates: { canonical: "/demo" },
  openGraph: {
    title: "Metanomic AI Agent Demo — From Workflow to Impact",
    description: "Try an AI workflow advisor that connects conversation to practical tools, human safeguards, and measurable outcomes.",
    url: "https://metanomic.ai/demo",
    type: "website",
  },
};

export default function DemoPage() {
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
            <Link href="/enterprise-ai-stack" className="navlink hidden sm:inline">AI stack</Link>
            <Link href="/contact" className="button button-outline !min-h-[40px] !px-4">Let&apos;s talk <span aria-hidden="true">↗</span></Link>
          </nav>
        </header>
      </div>
      <section className="container py-20 md:py-28">
        <div className="max-w-[930px]">
          <p className="eyebrow">Metanomic / Interactive capability demonstration</p>
          <h1 className="mt-6 text-[clamp(3.05rem,6.7vw,6.3rem)] font-semibold leading-[1.03] tracking-[-.07em]">
            AI that moves beyond <span className="text-[#c9ec8a]">the conversation.</span>
          </h1>
          <p className="muted mt-8 max-w-[740px] text-[17px] leading-[1.85] md:text-lg">
            A useful AI agent needs more than a clever response. It needs a defined job,
            trustworthy tools, clear boundaries, and a human outcome worth improving.
            Describe a business challenge and explore how a practical solution might work.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href="#try-agent" className="button button-primary">Try the workflow advisor <span aria-hidden="true">↓</span></a>
            <Link href="/enterprise-ai-stack" className="button button-outline">Explore the technology <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <div className="mt-14 grid gap-3 border-y border-[#30434c] py-5 text-[11px] font-semibold uppercase tracking-[.15em] text-[#a8c6b7] sm:grid-cols-4">
          <div>01 / Understand the task</div>
          <div>02 / Select approved tools</div>
          <div>03 / Propose a pilot</div>
          <div>04 / Keep people in control</div>
        </div>
      </section>
      <AgentExperience />
      <footer className="container flex flex-wrap items-center justify-between gap-5 border-t border-[#31454a] py-10">
        <Link href="/" className="text-[18px] font-semibold tracking-[-.035em]">metanomic<span className="text-[#c9ec8a]">.</span></Link>
        <p className="muted text-xs">© {new Date().getFullYear()} Metanomic. All rights reserved.</p>
        <Link className="navlink" href="/contact">Contact</Link>
      </footer>
    </main>
  );
}
