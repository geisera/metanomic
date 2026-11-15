export type EntrySource = "typed" | "chip" | "card_link" | "nav" | "hero" | "footer";
export const CHAT_KEY = "theia:conversation";
export const DOCK_KEY = "theia:dock-minimized";
export const defaultPrompts = ["Our intake forms take three days to process…", "Reps spend hours updating the CRM…", "Support tickets bounce between three teams…"];
export const contextPrompts: Record<string, string> = {
  "Salesforce agents": "Our case queue is backed up in Salesforce…",
  "Sales & intake agents": "Reps spend hours updating the CRM…",
  "Document-processing agents": "We re-key data from PDFs by hand…",
  "Customer service agents": "Support tickets bounce between three teams…",
  "Operations agents": "Recurring reports stall waiting on missing info…",
  "Knowledge & research agents": "Analysts spend days finding and citing sources…",
};
export function dockChips(context: string) {
  const chips = [
    { label: "Intake backlog", prompt: "Our intake forms take three days to process." },
    { label: "CRM updates", prompt: "Reps spend hours updating the CRM." },
    { label: "Case triage", prompt: "Support tickets bounce between three teams." },
    { label: "Document review", prompt: "We re-key data from PDFs by hand." },
  ];
  const index = context === "Sales & intake agents" ? 1 : /Salesforce|Customer service/.test(context) ? 2 : /Document|Knowledge/.test(context) ? 3 : 0;
  if (contextPrompts[context]) chips[index].prompt = contextPrompts[context].replace(/…$/, ".");
  return [chips[index], ...chips.filter((_, i) => i !== index)];
}
export function entrySource(source: string): EntrySource {
  if (source === "card") return "card_link";
  if (source === "section-chip") return "chip";
  if (source.startsWith("nav")) return "nav";
  if (source === "hero") return "hero";
  if (source === "footer" || source === "final-cta") return "footer";
  return "typed";
}
// No analytics provider is installed. Emit local events without message text.
export function theiaEvent(name: string, source: EntrySource, section: string, extra: { chip_label?: string; message_index?: number } = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail: { source, section_id: section, ...extra } }));
}
export type SavedMessage = { id: string; role: "user" | "assistant"; content: string };
export function restoreConversation(raw: string | null): SavedMessage[] | null {
  try {
    const data: unknown = JSON.parse(raw || "null");
    if (!Array.isArray(data) || !data.length || data.length > 15) return null;
    if (!data.every(m => m && typeof m.id === "string" && ["user", "assistant"].includes(m.role) && typeof m.content === "string" && m.content.length <= 10000)) return null;
    if (data.filter(m => m.role === "user").length > 7) return null;
    return data.map(({id, role, content}) => ({id, role, content}));
  } catch { return null; }
}
