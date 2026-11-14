"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";

type Activity = { tool: string; label: string; detail: string };
type ChatItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: "live" | "guided";
  notice?: string;
  activities?: Activity[];
};

const intro = "What is one repetitive or time-consuming part of your team's work? Describe it in plain language. I can help identify a useful AI pilot, the systems involved, human safeguards, and how to measure its impact.";

const examples = [
  {
    label: "Customer service",
    detail: "Summarize tickets and draft responses",
    prompt: "Our support team handles hundreds of repetitive customer questions each week. How could we use AI while keeping people in control of responses?",
  },
  {
    label: "Internal knowledge",
    detail: "Find answers in trusted documents",
    prompt: "Employees waste time finding procedures across hundreds of internal documents. Outline an AI knowledge assistant with permissions and source citations.",
  },
  {
    label: "Operations",
    detail: "Triage and route requests",
    prompt: "We receive 300 service requests a week, and each one takes about 12 minutes to classify and route. Show a safe pilot and an illustrative time-savings calculation.",
  },
];

function formattedText(content: string) {
  // Lightweight, safe display: render plain text and simple headings without HTML injection.
  return content.split("\n").map((line, index) => {
    const key = String(index);
    const trimmed = line.trim();
    if (!trimmed) return <div aria-hidden="true" className="h-3" key={key} />;
    if (/^[A-Z][A-Z0-9 &\/-]{3,54}$/.test(trimmed)) {
      return <p key={key} className="mt-3 text-xs font-bold uppercase tracking-[.12em] text-[#c9ec8a]">{trimmed}</p>;
    }
    const segments = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={key} className="min-h-[1.55em]">
        {segments.map((part, i) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={i} className="font-semibold text-[#e9f4e3]">{part.slice(2, -2)}</strong>
            : <span key={i}>{part}</span>
        )}
      </p>
    );
  });
}

export default function AgentExperience() {
  const [items, setItems] = useState<ChatItem[]>([{ id: "intro", role: "assistant", content: intro }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastMode, setLastMode] = useState<"live" | "guided" | null>(null);
  const [error, setError] = useState("");
  const conversationRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const count = items.filter(item => item.role === "user").length;
  const atLimit = count >= 7;

  // Scroll only the conversation panel. scrollIntoView() also scrolls the page
  // and was causing the entire demo to jump each time a message arrived.
  useEffect(() => {
    if (items.length === 1 && !busy && !error) return;
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [items, busy, error]);

  async function submit(text: string) {
    const prompt = text.trim();
    if (!prompt || busy || atLimit || prompt.length > 900) return;
    const userItem: ChatItem = { id: "u-" + Date.now(), role: "user", content: prompt };
    const next = [...items, userItem];
    setItems(next);
    setInput("");
    setError("");
    setBusy(true);
    setLastMode(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 40000);
    try {
      const messages = next.filter(item => item.id !== "intro").slice(-10).map(item => ({
        role: item.role,
        content: item.content,
      }));
      const response = await fetch("/api/agent-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });
      const data: {
        answer?: string;
        error?: string;
        mode?: "live" | "guided";
        notice?: string;
        activities?: Activity[];
      } = await response.json();
      if (!response.ok || !data.answer) throw new Error(data.error || "The request could not be completed.");
      setLastMode(data.mode || null);
      setItems(previous => [...previous, {
        id: "a-" + Date.now(),
        role: "assistant",
        content: data.answer || "",
        mode: data.mode,
        notice: data.notice,
        activities: data.activities,
      }]);
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "AbortError" ? cause.message : "The agent request timed out. Please try again.");
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
      // Avoid reopening the software keyboard and shifting the mobile viewport.
      if (window.matchMedia("(pointer: fine)").matches) draftRef.current?.focus({ preventScroll: true });
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit(input);
    }
  }

  function reset() {
    if (busy) return;
    setItems([{ id: "intro", role: "assistant", content: intro }]);
    setInput("");
    setError("");
    setLastMode(null);
  }

  return (
    <section id="try-agent" className="container flex min-h-0 flex-1 flex-col pb-3 sm:pb-5">
      <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[.38fr_.62fr]">
        <aside className="hidden min-h-0 space-y-4 overflow-y-auto overscroll-contain pr-1 lg:block">
          <div className="rounded-xl border border-[#314550] bg-[#10202b]/90 p-6 backdrop-blur-md md:p-8">
            <p className="eyebrow">A working example</p>
            <h2 className="mt-4 text-[26px] font-semibold leading-tight tracking-[-.045em]">From business friction to a practical AI pilot.</h2>
            <p className="muted mt-4 text-sm leading-7">This demonstration shows how an agent can combine a language model with controlled business tools. It maps opportunities, identifies safeguards, and can calculate illustrative capacity gains.</p>
            <div className="mt-7 border-t border-[#344752] pt-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[.16em] text-[#c9ec8a]">Try a scenario</p>
              <div className="grid gap-2">
                {examples.map(example => (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => void submit(example.prompt)}
                    disabled={busy || atLimit}
                    className="group rounded-lg border border-[#354852] bg-[#122630]/75 px-4 py-3 text-left transition-colors hover:border-[#749580] hover:bg-[#1a3440] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <span className="block text-sm font-semibold text-[#e7f1e9]">{example.label}<span aria-hidden="true" className="float-right text-[#c9ec8a]">↗</span></span>
                    <span className="muted mt-1 block text-xs">{example.detail}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[#30434b] bg-[#0e1c25]/85 p-6 backdrop-blur-md">
            <p className="eyebrow">What's under the hood</p>
            <div className="mt-5 space-y-4 text-sm leading-6">
              <div><span className="font-semibold text-[#e5efe6]">01 / Reason</span><p className="muted mt-1">Understand a workflow and the human outcome it should improve.</p></div>
              <div><span className="font-semibold text-[#e5efe6]">02 / Use tools</span><p className="muted mt-1">Look up mapped use cases or calculate assumptions in server-side functions.</p></div>
              <div><span className="font-semibold text-[#e5efe6]">03 / Recommend</span><p className="muted mt-1">Propose a bounded pilot with approvals, metrics, and measurable next steps.</p></div>
            </div>
            <p className="mt-6 border-t border-[#30434b] pt-5 text-xs leading-6 text-[#9bb0b0]">Do not enter personal, confidential, or regulated data. Live AI messages are sent to an external model provider through Vercel AI Gateway. This demo does not connect to your company systems or retain a chat history on our server.</p>
            <Link href="/contact" className="button button-outline mt-5">Discuss a real implementation <span aria-hidden="true">↗</span></Link>
          </div>
        </aside>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#3a5255] bg-[#0c1a23]/95 shadow-[0_24px_90px_rgba(0,0,0,.20)] backdrop-blur-lg">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#30464f] px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#b3db98]/35 bg-[#223a32] font-bold text-[#d9f5b8]">M</span>
              <div>
                <h3 className="text-sm font-semibold text-[#edf5e9]">Metanomic Workflow Advisor</h3>
                <p className="mt-0.5 text-xs text-[#a2b4b7]">Interactive AI agent demonstration</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span aria-label={lastMode === "live" ? "Live model connected" : lastMode === "guided" ? "Rule-based guided preview" : "Demo ready"} className="flex items-center gap-2 text-[11px] text-[#b2c7bb]">
                <span className={lastMode === "guided" ? "h-2 w-2 rounded-full bg-amber-300" : "h-2 w-2 rounded-full bg-[#c9ec8a]"} />
                {lastMode === "guided" ? "Guided mode" : lastMode === "live" ? "Live model" : "Demo ready"}
              </span>
              <button type="button" onClick={reset} disabled={busy} className="rounded border border-[#405963] px-2.5 py-1.5 text-[11px] text-[#c5d5d1] hover:bg-[#20333c] disabled:opacity-50">Reset</button>
            </div>
          </div>

          <div ref={conversationRef} role="log" aria-label="Agent conversation" aria-live="polite" className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            {items.map(item => (
              <div key={item.id} className={item.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={item.role === "user"
                  ? "max-w-[93%] rounded-2xl rounded-tr-sm border border-[#49664e] bg-[#253f37]/85 px-4 py-3 text-sm leading-7 text-[#f0f6ef] sm:max-w-[85%]"
                  : "max-w-[97%] text-sm leading-7 text-[#dce8e3] sm:max-w-[90%]"}>
                  {item.role === "assistant" && <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.13em] text-[#c9ec8a]">{item.id === "intro" ? "Metanomic" : "Advisor"}</p>}
                  <div className="space-y-0.5">{formattedText(item.content)}</div>
                  {item.activities && item.activities.length > 0 && (
                    <div className="mt-5 rounded-lg border border-[#385044] bg-[#112620]/75 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#c9ec8a]">Server-side tool activity</p>
                      {item.activities.map((activity, i) => (
                        <p key={i} className="mt-2 text-xs leading-5 text-[#cbded1]">
                          <span className="font-semibold">{activity.label}</span>
                          <span className="mt-0.5 block text-[#9fb9ab]">{activity.detail}</span>
                        </p>
                      ))}
                    </div>
                  )}
                  {item.notice && <p className="mt-4 border-l-2 border-amber-300/60 pl-3 text-xs leading-6 text-[#e6d7a9]">{item.notice}</p>}
                </div>
              </div>
            ))}
            {count === 0 && (
              <div className="grid gap-2 lg:hidden">
                <p className="eyebrow">Try an example</p>
                {examples.map(example => (
                  <button
                    key={example.label}
                    type="button"
                    disabled={busy}
                    onClick={() => void submit(example.prompt)}
                    className="rounded-lg border border-[#354852] bg-[#122630]/75 px-4 py-2.5 text-left text-xs text-[#e7f1e9] hover:border-[#749580] disabled:opacity-45"
                  >
                    <span className="font-semibold">{example.label}</span>
                    <span className="ml-2 text-[#9aafb0]">{example.detail}</span>
                  </button>
                ))}
              </div>
            )}
            {busy && <div className="flex items-center gap-3 text-sm text-[#bed0bf]" role="status">
              <span className="flex gap-1" aria-hidden="true"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c9ec8a]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c9ec8a] [animation-delay:150ms]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c9ec8a] [animation-delay:300ms]" /></span>
              Evaluating the workflow…
            </div>}
            {error && <div role="alert" className="rounded-lg border border-red-300/25 bg-red-950/30 px-4 py-3 text-xs leading-6 text-[#f3c9c9]">{error}</div>}

          </div>

          <form onSubmit={onSubmit} className="shrink-0 border-t border-[#30464f] bg-[#0d1e27]/95 p-3 sm:p-4">
            <label htmlFor="agent-question" className="mb-2 block text-xs font-semibold text-[#c9ec8a]">Your business challenge</label>
            <div className="flex items-end gap-3 rounded-lg border border-[#425860] bg-[#0b1720] p-2 transition-colors focus-within:border-[#b7e294]">
              <textarea
                id="agent-question"
                ref={draftRef}
                value={input}
                onChange={event => setInput(event.target.value.slice(0, 900))}
                onKeyDown={onKeyDown}
                placeholder={atLimit ? "Demo limit reached. Reset to start again." : "Describe a workflow your team would like to improve…"}
                rows={2}
                maxLength={900}
                disabled={busy || atLimit}
                className="min-h-[48px] max-h-[100px] w-full resize-y bg-transparent px-2 py-2 text-sm leading-6 text-[#f0f7ef] outline-none placeholder:text-[#81939d] disabled:opacity-50"
              />
              <button type="submit" disabled={busy || !input.trim() || atLimit} className="button button-primary !min-h-[42px] !px-4 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message">
                Send <span aria-hidden="true">↗</span>
              </button>
            </div>
            <div className="muted mt-3 flex flex-wrap justify-between gap-2 text-[11px]">
              <span>{atLimit ? "Session limit reached. Reset to continue." : "Enter to send · Shift+Enter for a new line"}</span>
              <span>{count}/7 prompts</span>
            </div>
          </form>
        </div>
      </div>


    </section>
  );
}
