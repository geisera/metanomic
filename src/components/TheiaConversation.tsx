"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AvailabilityResult } from "@/lib/calendly";
import { boundConversation } from "@/lib/theia-conversation";
import { CHAT_KEY, restoreConversation, theiaEvent, type EntrySource } from "@/lib/theia-dock";
type Activity = { tool: string; label: string; detail: string };
type KnowledgeSource = { number: number; documentId: string; title: string; revision: number; category: string; sourceUrl: string; excerpt: string };
type ChatItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: "live" | "guided";
  notice?: string;
  appointmentInvitation?: string;
  activities?: Activity[];
  sources?: KnowledgeSource[];
  booking?: AvailabilityResult;
};

const intro = "Tell me what you're working on and I'll map out how AI can help. Or ask how I'm built—model, tools, architecture, safeguards.";


function useConversationState() {
  const [items, setItems] = useState<ChatItem[]>([{ id: "intro", role: "assistant", content: intro }]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastMode, setLastMode] = useState<"live" | "guided" | null>(null);
  const [isKnowledgeAdmin, setIsKnowledgeAdmin] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const sending = useRef(false);
  const section = useRef("home-hero");
  const setSection = useCallback((value: string) => { section.current = value; }, []);
  const count = items.filter(item => item.role === "user").length;
  const atLimit = count >= 7;
  useEffect(() => {
    const timer = setTimeout(() => {
      // Retire the previous promotion preference; it no longer controls any UI.
      try { localStorage.removeItem("theia-bar-dismissed"); } catch {}
      try { const saved = restoreConversation(sessionStorage.getItem(CHAT_KEY)); if (saved) setItems(saved); } catch {}
      setReady(true);
    }, 0);
    const controller = new AbortController();
    void fetch("/api/knowledge/session", {cache:"no-store", signal:controller.signal}).then(r => { if(r.ok) setIsKnowledgeAdmin(true); }).catch(() => {});
    return () => { clearTimeout(timer); controller.abort(); };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      if (items.every(item => item.id === "intro")) sessionStorage.removeItem(CHAT_KEY);
      else sessionStorage.setItem(CHAT_KEY, JSON.stringify(items.map(({id,role,content}) => ({id,role,content}))));
    } catch {}
  }, [items, ready]);
  async function submit(text: string, source: EntrySource = "typed") {
    const prompt = text.trim();
    if (!ready || !prompt || sending.current || atLimit || prompt.length > 900) return false;
    sending.current = true;
    const userItem: ChatItem = { id: "u-" + Date.now(), role: "user", content: prompt };
    const next = [...items, userItem];
    setItems(next);
    theiaEvent("theia_message_sent", source, section.current, { message_index: count + 1 });
    setError("");
    setBusy(true);
    setLastMode(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 58000);
    try {
      const messages = boundConversation(next.filter(item => item.id !== "intro").slice(-10).map(item => ({
        role: item.role,
        content: item.content,
      })));
      const response = await fetch("/api/agent-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, ...(isKnowledgeAdmin && showDiagnostics ? { debug: true } : {}) }),
        signal: controller.signal,
      });
      const data: {
        answer?: string;
        error?: string;
        mode?: "live" | "guided";
        notice?: string;
  appointmentInvitation?: string;
        activities?: Activity[];
        sources?: KnowledgeSource[];
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
        appointmentInvitation: data.appointmentInvitation,
        activities: data.activities,
        sources: data.sources,
        booking: data.booking,
      }]);
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "AbortError" ? cause.message : "The agent request timed out. Please try again.");
    } finally {
      window.clearTimeout(timeout);
      sending.current = false;
      setBusy(false);

    }
    return true;
  }


  function reset() { if (sending.current) return; try { sessionStorage.removeItem(CHAT_KEY); } catch {} setItems([{id:"intro",role:"assistant",content:intro}]); setError("");setLastMode(null); }
  return { items, ready, busy, error, lastMode, count, atLimit, isKnowledgeAdmin, showDiagnostics, setShowDiagnostics, submit, reset, section, setSection };
}
const Conversation = createContext<ReturnType<typeof useConversationState> | null>(null);
export function TheiaConversationProvider({children}:{children:ReactNode}) { const value=useConversationState();return <Conversation.Provider value={value}>{children}</Conversation.Provider>; }
export function useTheiaConversation() { const value=useContext(Conversation);if(!value) throw new Error("Theia conversation provider missing");return value; }
