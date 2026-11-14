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
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[#20303b]">
        <header className="container flex h-[66px] items-center justify-between gap-3 sm:h-[72px]">
          <Link href="/" aria-label="Metanomic home" className="flex shrink-0 items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[#7b986d] bg-[#c9ec8a] text-base font-black text-[#122322]">M</span>
            <span className="text-[18px] font-semibold tracking-[-.035em]">metanomic<span className="text-[#c9ec8a]">.</span></span>
          </Link>
          <nav aria-label="Page navigation" className="flex items-center gap-3 sm:gap-6">
            <Link href="/" className="navlink hidden sm:inline">Home</Link>
            <Link href="/enterprise-ai-stack" className="navlink hidden md:inline">AI stack</Link>
            <Link href="/contact" className="button button-outline !min-h-[36px] !px-3 sm:!px-4">Let&apos;s talk <span aria-hidden="true">↗</span></Link>
          </nav>
        </header>
      </div>

      <section className="container flex shrink-0 items-center justify-between gap-4 py-3 sm:py-4">
        <div className="min-w-0">
          <p className="eyebrow hidden sm:block">Metanomic / Interactive agent demonstration</p>
          <h1 className="text-xl font-semibold leading-tight tracking-[-.045em] sm:mt-1 sm:text-2xl">
            Meet the <span className="text-[#c9ec8a]">Workflow Advisor.</span>
          </h1>
          <p className="muted mt-1 hidden text-xs leading-5 md:block">Explore a practical AI pilot with controlled tools, human oversight, and measurable outcomes.</p>
        </div>
        <Link href="/enterprise-ai-stack" className="navlink shrink-0 text-right sm:hidden">AI stack ↗</Link>
      </section>

      <AgentExperience />
    </main>
  );
}
