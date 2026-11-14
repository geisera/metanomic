import type { Metadata } from "next";
import Link from "next/link";
import AgentExperience from "./AgentExperience";

export const metadata: Metadata = {
  title: "Meet Theia — AI Workflow Advisor",
  description: "Meet Theia, Metanomic's AI guide. Explore practical AI use cases, inspect tool activity, and design a human-centered workflow pilot.",
  alternates: { canonical: "/demo" },
  openGraph: {
    title: "Meet Theia — Metanomic's AI Guide",
    description: "Theia helps turn business challenges into practical AI pilots with human safeguards, approved tools, and measurable outcomes.",
    url: "https://metanomic.ai/demo",
    type: "website",
  },
};

export default function DemoPage() {
  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <header className="container flex h-[54px] shrink-0 items-center justify-between gap-4 sm:h-[60px]">
        <Link href="/" aria-label="Metanomic home" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#7b986d] bg-[#c9ec8a] text-sm font-black text-[#122322]">M</span>
          <span className="text-[16px] font-semibold tracking-[-.035em]">metanomic<span className="text-[#c9ec8a]">.</span></span>
        </Link>
        <Link href="/" className="navlink">Back to site <span aria-hidden="true">↗</span></Link>
      </header>
      <AgentExperience />
    </main>
  );
}
