"use client";
import { useEffect, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { useTheiaDock } from "./TheiaDock";
import { useTheiaConversation } from "./TheiaConversation";
const InlineChat = dynamic(() => import("@/app/demo/AgentExperience"), { ssr: false });
import { suggestions } from "@/lib/theia-suggestions";
import TheiaLink from "./TheiaLink";
import TheiaAvatar from "./TheiaAvatar";
const question = "Our intake forms take three days to process.";
const answer = "Here's a focused pilot:\n1. A document agent reads each form and flags missing fields.\n2. Your team approves exceptions before anything is filed.\n3. We measure turnaround time before and after.";
function SampleExchange() {
  const [length, setLength] = useState(question.length + answer.length);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    const timer = setTimeout(sync, 0); media.addEventListener("change", sync);
    return () => { clearTimeout(timer); media.removeEventListener("change", sync); };
  }, []);
  useEffect(() => {
    if (reduced || paused) return;
    const total = question.length + answer.length;
    const timer = setTimeout(() => setLength(n => n >= total ? 0 : n + 1), length >= total ? 6000 : 35);
    return () => clearTimeout(timer);
  }, [length, reduced, paused]);
  const shown = reduced ? question.length + answer.length : length;
  return <div aria-hidden="true" className="theia-sample" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    <div className="flex items-center gap-3 border-b border-[var(--site-30464f)] p-5"><TheiaAvatar status /><span className="font-semibold">Theia</span><span className="ml-auto text-xs text-[var(--site-d1e1d6)]">Ready</span></div>
    <div className="space-y-5 p-5">
      <div className="relative ml-auto w-fit max-w-[94%] rounded-2xl rounded-tr-sm border border-[var(--site-49664e)] bg-[var(--site-253f37)] px-4 py-3 text-sm leading-7 text-[var(--site-f0f6ef)]"><span className="invisible" aria-hidden="true">{question}</span><span className="absolute inset-0 px-4 py-3">{question.slice(0, shown)}</span></div>
      <div className="relative whitespace-pre-line text-sm leading-7 text-[var(--site-dce8e3)]"><span className="invisible" aria-hidden="true">{answer}</span><span className="absolute inset-0">{answer.slice(0, Math.max(0, shown - question.length))}</span></div>
    </div>
  </div>;
}
export default function TheiaShowcase() {
  const dock=useTheiaDock();
  const chat=useTheiaConversation();
  const [prompt, setPrompt] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); dock?.open("section-input", prompt);setPrompt(""); }
  return <section id="meet-theia" className="pt-8 pb-16 md:pt-10 md:pb-20 scroll-mt-24">
    <div className="container theia-showcase">
      <div className="min-w-0">
        <p className="eyebrow">TRY IT NOW · LIVE DEMO</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-.05em] md:text-4xl">Meet Theia. Tell her the problem, and she&apos;ll map the pilot.</h2>
        <p className="mt-4 leading-8 text-[var(--site-d5e5dc)]">Theia is the kind of agent we build for clients. Describe a workflow that slows your team down, and she&apos;ll outline a focused pilot covering the tools, the safeguards, and how you&apos;d measure it.</p>
        <form action="/demo" onSubmit={submit} className="mt-6" data-theia-source="section-input">
          <label htmlFor="theia-workflow" className="sr-only">Ask Theia a question</label>
          <input id="theia-workflow" value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={900} placeholder="Describe what you're working on…" className="theia-workflow-input" />
          <button type="submit" data-theia-source="section-input" className="button button-primary mt-3 w-full text-center">Ask Theia about your workflow →</button>
          <div className="theia-home-chips mt-4">{suggestions.map((s, index) => <TheiaLink key={s.label} source="section-chip" prompt={s.label} className="theia-chip">{["Explore a use case", "Your tools", "Your stack", "Data handling"][index]}</TheiaLink>)}</div>
          <p className="mt-4 text-xs leading-6 text-[var(--site-b9cbc4)]">Free live demo. Don&apos;t share sensitive information.</p>
        </form>
      </div>
      {chat.count > 0 && !dock?.drawerOpen ? <div className="theia-inline-chat"><InlineChat embedded instance="inline" /></div> : <SampleExchange />}
    </div>
  </section>;
}
