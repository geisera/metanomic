import {AccountMenu} from '@/components/SiteAccount';
import type { Metadata } from "next";
import Link from "next/link";
import AgentExperience from "./AgentExperience";

export const metadata: Metadata = {
  title: "Meet Theia — AI workflow advisor",
  description: "Meet Theia, Metanomic's AI workflow advisor. Explore practical AI use cases, review trusted knowledge sources, and design a human-centered workflow pilot.",
  alternates: { canonical: "/demo" },
  openGraph: {
    title: "Meet Theia — Metanomic's AI workflow advisor",
    description: "Theia is Metanomic\'s AI workflow advisor for exploring AI pilots, tools, and safeguards.",
    url: "https://metanomic.ai/demo",
    type: "website",
  },
};

export default function DemoPage() {
  return (
    <main className="theia-demo flex h-dvh min-h-0 flex-col overflow-x-hidden">
      <header className="container flex h-[58px] shrink-0 items-center justify-between gap-4 sm:h-[64px]">
        <Link href="/" aria-label="Metanomic home" className="flex min-h-11 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a]">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--site-7b986d)] bg-[#c9ec8a] text-sm font-black text-[#122322]">M</span>
          <span className="text-[16px] font-semibold tracking-[-.035em]">metanomic<span className="text-[var(--site-c9ec8a)]">.</span></span>
        </Link>
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm text-[var(--site-d1e0dc)] hover:text-[var(--site-c9ec8a)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a]"><span aria-hidden="true">←</span> Back to site</Link>
      <AccountMenu/></header>
      <AgentExperience />
    </main>
  );
}
