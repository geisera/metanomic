export type Conversation = { role: "user" | "assistant"; content: string };
const HISTORY_CHARS = 12000;

/** Retain the newest whole messages, always including the current question. */
export function boundConversation(messages: Conversation[]): Conversation[] {
  const kept: Conversation[] = [];
  let chars = 0;
  for (const message of messages.slice(-10).reverse()) {
    if (chars + message.content.length > HISTORY_CHARS) break;
    kept.unshift(message);
    chars += message.content.length;
  }
  return kept;
}

export function validateMessages(value: unknown): Conversation[] | null {
  if (!Array.isArray(value) || !value.length || value.length > 10) return null;
  const messages: Conversation[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    if ((item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string") return null;
    const content = item.content.trim();
    // Assistant replies include the 9,500-character output plus any incomplete notice.
    if (!content || content.length > (item.role === "user" ? 1200 : 10000)) return null;
    messages.push({ role: item.role, content });
  }
  return messages.at(-1)?.role === "user" ? boundConversation(messages) : null;
}
