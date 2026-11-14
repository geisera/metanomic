"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import type { AvailabilityResult } from "@/lib/calendly";

type Activity = { tool: string; label: string; detail: string };
type ChatItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: "live" | "guided";
  notice?: string;
  activities?: Activity[];
  booking?: AvailabilityResult;
};

const intro = "Tell me what you're working on and I'll map out how AI can help. Or ask how I'm built—model, tools, architecture, safeguards.";

const suggestions = [
  { label: "Explore a use case", prompt: "How would you design a human-supervised AI pilot for repetitive customer support requests?" },
  { label: "What tools can you use?", prompt: "Which server-side tools can you use, and what are their limits?" },
  { label: "What's your stack?", prompt: "What technology stack are you built on, and how do the parts fit together?" },
  { label: "How is my data handled?", prompt: "How do you handle my messages, and what safeguards and limitations does this demo have?" },
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
  const remaining = 7 - count;
  const canSend = !busy && !atLimit && Boolean(input.trim());
  const statusLabel = busy ? "Thinking" : lastMode === "guided" ? "Guided mode" : lastMode === "live" ? "Live model" : "Ready";

  // Scroll only the conversation panel. scrollIntoView() also scrolls the page
  // and was causing the entire demo to jump each time a message arrived.
  useEffect(() => {
    if (items.length === 1 && !busy && !error) return;
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [items, busy, error]);

  useLayoutEffect(() => {
    const draft = draftRef.current;
    if (!draft) return;
    draft.style.height = "auto";
    const maxHeight = 164;
    const naturalHeight = draft.scrollHeight;
    draft.style.height = Math.min(naturalHeight, maxHeight) + "px";
    draft.style.overflowY = naturalHeight > maxHeight ? "auto" : "hidden";
  }, [input]);

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
        booking?: AvailabilityResult;
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
        booking: data.booking,
      }]);
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "AbortError" ? cause.message : "The agent request timed out. Please try again.");
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
      // Focus after the disabled composer is re-enabled, without moving the page.
      window.requestAnimationFrame(() => draftRef.current?.focus({ preventScroll: true }));
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
    <section id="try-agent" aria-label="Talk with Theia" className="flex min-h-0 w-full flex-1 flex-col sm:mx-auto sm:max-w-[1148px] sm:px-6 sm:pb-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-y border-[#385250] bg-[#0c1a23] shadow-[0_24px_90px_rgba(0,0,0,.20)] sm:rounded-xl sm:border">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#30464f] px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#b3db98]/35 bg-[#223a32] text-lg font-semibold text-[#d9f5b8]">
              T
            </span>
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-tight tracking-[-.02em] text-[#edf5e9]">Theia</p>
              {count > 0 && <h1 className="sr-only">Theia — AI Workflow Advisor</h1>}
              <p className="mt-0.5 hidden text-xs text-[#c2d1ca] sm:block">AI Workflow Advisor</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <span role="status" aria-label={statusLabel} className="inline-flex min-h-11 items-center gap-2 text-xs text-[#d1e1d6]">
              <span aria-hidden="true" className={lastMode === "guided" ? "h-2 w-2 shrink-0 rounded-full bg-amber-300" : "h-2 w-2 shrink-0 rounded-full bg-[#c9ec8a]"} />
              <span className="hidden sm:inline">{statusLabel}</span>
            </span>
            {count > 0 && (
              <button
                type="button"
                onClick={reset}
                disabled={busy}
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#52676c] px-3 text-sm text-[#d2e0d9] hover:border-[#9cbc92] hover:bg-[#20333c] disabled:cursor-not-allowed disabled:opacity-55"
              >
                New chat
              </button>
            )}
          </div>
        </div>

        <div
          ref={conversationRef}
          role="log"
          aria-label="Conversation with Theia"
          aria-live="polite"
          aria-relevant="additions text"
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-5 sm:px-8 sm:py-7"
        >
          {count === 0 && (
            <div className="mx-auto flex min-h-full w-full max-w-[680px] flex-col items-center justify-center px-1 pb-16 pt-4 text-center sm:pb-20">
              <div aria-hidden="true" className="mb-3 flex h-16 w-16 items-center justify-center rounded-[19px] border border-[#67836b]/55 bg-[#182f32] text-[34px] font-light text-[#d8efc4]">
                T
              </div>
              <h1 className="text-[clamp(1.75rem,4vw,2.625rem)] font-semibold tracking-[-.02em] text-[#edf5e9]">I'm Theia.</h1>
              <p className="mt-2.5 max-w-[52ch] text-base leading-6 text-[#d0e0d8]">
                Tell me what you're working on and I'll map out how AI can help.
                Or ask how I'm built—model, tools, architecture, safeguards.
              </p>
              <div className="mt-5 grid w-full max-w-[610px] grid-cols-1 gap-2.5 min-[480px]:grid-cols-2" aria-label="Suggested questions">
                {suggestions.map(suggestion => (
                  <button
                    type="button"
                    key={suggestion.label}
                    disabled={busy || atLimit}
                    onClick={() => void submit(suggestion.prompt)}
                    className="min-h-11 rounded-full border border-[#3c5757] bg-[#152b33] px-4 py-2.5 text-sm text-[#e0ece6] transition-colors hover:border-[#c9ec8a]/40 hover:bg-[#213c42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {count > 0 && (
            <div className="mx-auto w-full max-w-[780px] space-y-6">
              {items.filter(item => item.id !== "intro").map(item => (
                <div key={item.id} className={item.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={item.role === "user"
                    ? "max-w-[94%] rounded-2xl rounded-tr-sm border border-[#49664e] bg-[#253f37] px-4 py-3 text-sm leading-7 text-[#f0f6ef] sm:max-w-[85%]"
                    : "max-w-[97%] text-sm leading-7 text-[#dce8e3] sm:max-w-[90%]"}>
                    {item.role === "assistant" && <p className="mb-2 text-xs font-semibold uppercase tracking-[.1em] text-[#c9ec8a]">Theia</p>}
                    <div className="space-y-0.5">{formattedText(item.content)}</div>
                    {item.role === "assistant" && item.booking && (
                      <div className="mt-5 rounded-xl border border-[#506c53] bg-[#132a27] p-4" aria-label="Calendly scheduling options">
                        {item.booking.status === "available" && item.booking.slots?.length ? (
                          <>
                            <p className="text-sm font-semibold text-[#e6f7d4]">
                              Available {item.booking.eventType ? item.booking.eventType + " " : ""}appointments
                            </p>
                            <p className="mt-1 text-xs text-[#c6dacb]">
                              {item.booking.timeZone || "America/New_York"} · Times may change before booking.
                            </p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {item.booking.slots.map(slot => (
                                <a
                                  key={slot.startTime}
                                  href={slot.bookingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex min-h-11 items-center justify-between gap-2 rounded-lg border border-[#77946f] bg-[#1e3a33] px-3 py-2 text-sm font-semibold text-[#e7f8dc] hover:border-[#c9ec8a] hover:bg-[#29473b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a]"
                                >
                                  <span>{slot.label}</span>
                                  <span aria-hidden="true">↗</span>
                                </a>
                              ))}
                            </div>
                            <p className="mt-3 text-xs text-[#c5d7c9]">Select a time to complete your booking on Calendly.</p>
                          </>
                        ) : item.booking.status === "choose_event" && item.booking.eventTypes?.length ? (
                          <>
                            <p className="text-sm font-semibold text-[#e6f7d4]">Choose a meeting type</p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {item.booking.eventTypes.map(eventType => (
                                <a
                                  key={eventType.name}
                                  href={eventType.bookingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex min-h-11 items-center justify-between gap-2 rounded-lg border border-[#77946f] px-3 py-2 text-sm text-[#e6f7d4] hover:bg-[#29473b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a]"
                                >
                                  <span>{eventType.name}</span><span aria-hidden="true">↗</span>
                                </a>
                              ))}
                            </div>
                            <p className="mt-3 text-xs text-[#c5d7c9]">Or tell me which meeting type to check.</p>
                          </>
                        ) : (
                          <a
                            href={item.booking.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 items-center gap-2 rounded-md font-semibold text-[#c9ec8a] underline underline-offset-2 hover:text-[#e5f8c8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a]"
                          >
                            Open Metanomic's Calendly page <span aria-hidden="true">↗</span>
                          </a>
                        )}
                      </div>
                    )}
                    {item.activities && item.activities.length > 0 && (
                      <div className="mt-5 rounded-lg border border-[#385044] bg-[#112620] p-3">
                        <p className="text-xs font-bold uppercase tracking-[.1em] text-[#c9ec8a]">Tool activity</p>
                        {item.activities.map((activity, i) => (
                          <p key={i} className="mt-2 text-xs leading-5 text-[#d1e1d7]">
                            <span className="font-semibold">{activity.label}</span>
                            <span className="mt-0.5 block text-[#bdd1c4]">{activity.detail}</span>
                          </p>
                        ))}
                      </div>
                    )}
                    {item.notice && <p className="mt-4 border-l-2 border-amber-300/60 pl-3 text-xs leading-6 text-[#eadbac]">{item.notice}</p>}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-3 text-sm text-[#cdded0]" role="status" aria-live="polite">
                  <span className="flex gap-1" aria-hidden="true">
                    <span className="h-1.5 w-1.5 motion-safe:animate-pulse rounded-full bg-[#c9ec8a]" />
                    <span className="h-1.5 w-1.5 motion-safe:animate-pulse rounded-full bg-[#c9ec8a] [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 motion-safe:animate-pulse rounded-full bg-[#c9ec8a] [animation-delay:300ms]" />
                  </span>
                  Theia is typing…
                </div>
              )}
              {error && <div role="alert" className="rounded-lg border border-red-300/25 bg-red-950/30 px-4 py-3 text-xs leading-6 text-[#f3d2d2]">{error}</div>}
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="shrink-0 border-t border-[#30464f] bg-[#0d1e27] px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:p-4">
          <div className="mx-auto w-full max-w-[780px]">
            <label htmlFor="agent-question" className="sr-only">Ask Theia a question</label>
            <span id="theia-composer-hint" className="sr-only">Press Enter to send. Press Shift plus Enter to insert a new line.</span>
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-[#50666b] bg-[#0b1720] p-0.5 transition-[border-color,box-shadow] focus-within:border-[#c9ec8a] focus-within:shadow-[0_0_0_2px_rgba(201,236,138,.15)] motion-reduce:transition-none">
              <textarea
                id="agent-question"
                ref={draftRef}
                value={input}
                onChange={event => setInput(event.target.value.slice(0, 900))}
                onKeyDown={onKeyDown}
                aria-describedby="theia-composer-hint"
                placeholder="Describe what you're working on…"
                rows={1}
                maxLength={900}
                disabled={busy || atLimit}
                className="min-h-[44px] max-h-[164px] min-w-0 flex-1 resize-none overflow-y-hidden bg-transparent px-3 py-2 text-base leading-6 text-[#f0f7ef] outline-none placeholder:text-[#b9cdc7] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy || !input.trim() || atLimit}
                aria-label="Send message"
                className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a] ${
                  canSend
                    ? "border border-[#c9ec8a] bg-[#c9ec8a] text-[#101a1b] hover:bg-[#dcf7af]"
                    : "cursor-not-allowed border border-[#52656a] bg-transparent text-[#c2d1d5]"
                }`}
              >
                {busy ? "Sending…" : "Send"}
                <span aria-hidden="true" className={busy ? "motion-safe:animate-pulse" : ""}>{busy ? "·" : "↑"}</span>
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs leading-5 text-[#c4d3ce]">
              <p>Don't share sensitive information. Messages are processed by a third-party AI model.</p>
              <p aria-live="polite" className={remaining <= 2 ? "shrink-0 font-semibold text-[#ffd08a]" : "shrink-0 text-[#c4d3ce]"}>
                {remaining} {remaining === 1 ? "message" : "messages"} left in this demo
              </p>
              <Link
                href="/contact"
                className="inline-flex min-h-6 items-center rounded-sm font-semibold text-[#c9ec8a] underline underline-offset-2 hover:text-[#e5f8c8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9ec8a]"
              >
                Schedule a call <span aria-hidden="true" className="ml-1">↗</span>
              </Link>
            </div>
            {atLimit && (
              <p className="mt-2 text-xs leading-5 text-[#e3eecf]">
                You've reached the demo limit. Start a new chat to continue, or <Link href="/contact" className="font-semibold text-[#c9ec8a] underline underline-offset-2 hover:text-[#e2f6bd]">contact Metanomic</Link>.
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
