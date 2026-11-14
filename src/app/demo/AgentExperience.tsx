"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

type Activity = { tool: string; label: string; detail: string };
type ChatItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: "live" | "guided";
  notice?: string;
  activities?: Activity[];
};

const intro = "I'm Theia. Curious what makes me work? Ask about my stack—my model, tools, architecture, or safeguards. Or tell me what you're working on, and we'll explore it together.";

const suggestions = [
  { label: "What's your stack?", prompt: "What technology stack are you built on, and how do the parts fit together?" },
  { label: "What tools can you use?", prompt: "Which server-side tools can you use, and what are their limits?" },
  { label: "How is my data handled?", prompt: "How do you handle my messages, and what safeguards and limitations does this demo have?" },
  { label: "Explore a use case", prompt: "How would you design a human-supervised AI pilot for repetitive customer support requests?" },
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
    <section id="try-agent" aria-label="Talk with Theia" className="container flex min-h-0 flex-1 flex-col pb-3 sm:pb-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#385250] bg-[#0c1a23]/95 backdrop-blur-lg">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#30464f] px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#b3db98]/35 bg-[#223a32] text-xl font-semibold text-[#d9f5b8]">
              T
              <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-[#f56667] shadow-[0_0_9px_#f56667]" />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold leading-tight tracking-[-.025em] text-[#edf5e9]">Theia</h1>
              <p className="mt-0.5 text-xs text-[#a2b4b7]">Metanomic AI guide</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <span aria-label={lastMode === "live" ? "Live model connected" : lastMode === "guided" ? "Rule-based guided preview" : "Demo ready"} className="flex items-center gap-2 text-[11px] text-[#b2c7bb]">
              <span className={lastMode === "guided" ? "h-2 w-2 shrink-0 rounded-full bg-amber-300" : "h-2 w-2 shrink-0 rounded-full bg-[#c9ec8a]"} />
              <span className="hidden sm:inline">{lastMode === "guided" ? "Guided mode" : lastMode === "live" ? "Live model" : "Ready"}</span>
            </span>
            <button type="button" onClick={reset} disabled={busy} className="rounded-md border border-[#405963] px-3 py-1.5 text-xs text-[#c5d5d1] hover:bg-[#20333c] disabled:opacity-50">
              New chat
            </button>
          </div>
        </div>

        <div ref={conversationRef} role="log" aria-label="Conversation with Theia" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8 sm:py-7">
          {count === 0 && (
            <div className="mx-auto flex min-h-full max-w-[700px] flex-col items-center justify-center py-5 text-center">
              <div aria-hidden="true" className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] border border-[#67836b]/55 bg-[#182f32]/90 text-[43px] font-light text-[#d8efc4] shadow-[0_0_42px_rgba(126,191,147,.11)] sm:h-24 sm:w-24">
                T
                <span className="absolute bottom-3 right-3 h-2.5 w-2.5 rounded-full bg-[#f56667] shadow-[0_0_12px_#f56667]" />
              </div>
              <h2 className="text-[clamp(1.65rem,4vw,2.65rem)] font-semibold tracking-[-.055em] text-[#edf5e9]">I'm Theia.</h2>
              <p className="muted mt-3 max-w-[570px] text-sm leading-7 sm:text-base sm:leading-8">
                Ask me about the technology behind me—my model, tools, architecture, or safeguards.
                Or tell me what you're working on.
              </p>
              <div className="mt-7 flex max-w-[640px] flex-wrap justify-center gap-2.5" aria-label="Suggested questions">
                {suggestions.map(suggestion => (
                  <button
                    type="button"
                    key={suggestion.label}
                    disabled={busy || atLimit}
                    onClick={() => void submit(suggestion.prompt)}
                    className="rounded-full border border-[#3c5757] bg-[#152b33]/90 px-4 py-2.5 text-sm text-[#d3e6dc] transition-colors hover:border-[#a0d6a1] hover:bg-[#213c42] hover:text-white disabled:opacity-50"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {count > 0 && (
            <div className="mx-auto max-w-[820px] space-y-6">
              {items.filter(item => item.id !== "intro").map(item => (
                <div key={item.id} className={item.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={item.role === "user"
                    ? "max-w-[94%] rounded-2xl rounded-tr-sm border border-[#49664e] bg-[#253f37]/85 px-4 py-3 text-sm leading-7 text-[#f0f6ef] sm:max-w-[85%]"
                    : "max-w-[97%] text-sm leading-7 text-[#dce8e3] sm:max-w-[90%]"}>
                    {item.role === "assistant" && <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.13em] text-[#c9ec8a]">Theia</p>}
                    <div className="space-y-0.5">{formattedText(item.content)}</div>
                    {item.activities && item.activities.length > 0 && (
                      <div className="mt-5 rounded-lg border border-[#385044] bg-[#112620]/75 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#c9ec8a]">Tool activity</p>
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
              {busy && <div className="flex items-center gap-3 text-sm text-[#bed0bf]" role="status">
                <span className="flex gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c9ec8a]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c9ec8a] [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c9ec8a] [animation-delay:300ms]" />
                </span>
                Theia is thinking…
              </div>}
              {error && <div role="alert" className="rounded-lg border border-red-300/25 bg-red-950/30 px-4 py-3 text-xs leading-6 text-[#f3c9c9]">{error}</div>}
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="shrink-0 border-t border-[#30464f] bg-[#0d1e27]/95 px-3 py-3 sm:px-7 sm:py-4">
          <div className="mx-auto max-w-[820px]">
            <label htmlFor="agent-question" className="sr-only">Ask Theia a question</label>
            <div className="flex items-end gap-3 rounded-xl border border-[#425860] bg-[#0b1720] p-2 focus-within:border-[#b7e294]">
              <textarea
                id="agent-question"
                ref={draftRef}
                value={input}
                onChange={event => setInput(event.target.value.slice(0, 900))}
                onKeyDown={onKeyDown}
                placeholder={atLimit ? "Session limit reached. Start a new chat." : "Ask me about my stack, tools, or your idea…"}
                rows={2}
                maxLength={900}
                disabled={busy || atLimit}
                className="min-h-[46px] max-h-[100px] w-full resize-y bg-transparent px-2 py-2 text-sm leading-6 text-[#f0f7ef] outline-none placeholder:text-[#81939d] disabled:opacity-50"
              />
              <button type="submit" disabled={busy || !input.trim() || atLimit} className="button button-primary !min-h-[42px] !px-4 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message">
                Send <span aria-hidden="true">↗</span>
              </button>
            </div>
            <div className="muted mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[11px]">
              <span>Please don't share sensitive information. Live chats use an external AI model.</span>
              <span>{count}/7 messages</span>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
