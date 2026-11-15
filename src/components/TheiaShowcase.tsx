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
    <div className="flex items-center gap-3 border-b border-[#30464f] p-5"><TheiaAvatar status /><span className="font-semibold">Theia</span><span className="ml-auto text-xs text-[#d1e1d6]">Ready</span></div>
    <div className="space-y-5 p-5">
      <div className="ml-auto max-w-[94%] rounded-2xl rounded-tr-sm border border-[#49664e] bg-[#253f37] px-4 py-3 text-sm leading-7 text-[#f0f6ef] min-h-[80px]">{question.slice(0, shown)}</div>
      <div className="whitespace-pre-line text-sm leading-7 text-[#dce8e3] min-h-[245px]">{answer.slice(0, Math.max(0, shown - question.length))}</div>
    </div>
  </div>;
}
export default function TheiaShowcase() {
  const dock=useTheiaDock();
  const chat=useTheiaConversation();
  const [prompt, setPrompt] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); dock?.open("section-input", prompt);setPrompt(""); }
  return <section id="meet-theia" className="rule py-16 md:py-20 scroll-mt-36">
    <div className="container theia-showcase">
      <div className="min-w-0">
        <TheiaAvatar status />
        <p className="eyebrow mt-5">TRY IT NOW · LIVE DEMO</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-.05em] md:text-4xl">Meet Theia. Tell her the problem, and she&apos;ll map the pilot.</h2>
        <p className="mt-4 leading-8 text-[#d5e5dc]">Theia is the kind of agent we build for clients. Describe a workflow that slows your team down, and she&apos;ll outline a focused pilot covering the tools, the safeguards, and how you&apos;d measure it.</p>
        <form action="/demo" onSubmit={submit} className="mt-6" data-theia-source="section-input">
          <label htmlFor="theia-workflow" className="sr-only">Ask Theia a question</label>
          <input id="theia-workflow" value={prompt} onChange={event => setPrompt(event.target.value)} maxLength={900} placeholder="Describe what you're working on…" className="theia-workflow-input" />
          <TheiaLink source="section-input" prompt={prompt} className="button button-primary mt-3 w-full text-center">Ask Theia about your workflow →</TheiaLink>
          <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">Submit</button>
          <div className="mt-4 flex flex-wrap gap-2">{suggestions.map(s => <TheiaLink key={s.label} source="section-chip" prompt={s.label} className="theia-chip">{s.label}</TheiaLink>)}</div>
          <p className="mt-4 text-xs leading-6 text-[#b9cbc4]">Free live demo. Don&apos;t share sensitive information.</p>
        </form>
      </div>
      {chat.count > 0 && !dock?.drawerOpen ? <div className="theia-inline-chat"><InlineChat embedded instance="inline" /></div> : <SampleExchange />}
    </div>
  </section>;
}
