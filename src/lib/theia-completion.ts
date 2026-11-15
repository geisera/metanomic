/**
 * Theia output finalization. Chat Completion may return useful partial text
 * when finish_reason is "length". Never present that as a finished answer.
 */
export type CompletionFinish = "stop" | "length" | "tool_calls" | "content_filter" | string | null | undefined;
export const CONTINUATION_LIMIT = 1;
export const RESPONSE_CHAR_LIMIT = 9500;

export function isTokenLimited(reason: CompletionFinish): boolean {
  return reason === "length";
}

/** Trim repeated prefixes when the model restarts its last sentence. */
export function joinContinuation(previous: string, next: string): string {
  const left = previous.trimEnd();
  const right = next.trimStart();
  if (!left) return right;
  if (!right) return left;
  if (left.endsWith(right)) return left;
  const limit = Math.min(left.length, right.length, 280);
  for (let length = limit; length >= 12; length--) {
    if (left.slice(-length) === right.slice(0, length)) {
      return left + right.slice(length);
    }
  }
  if (/\s$/.test(previous) || /^[,.;:!?)]/.test(right)) return left + " " + right;
  return left + (/^(?:[-*] |\\d+[.)] )/.test(right) ? "\n" : " ") + right;
}

export function finalizeAnswer(answer: string, complete: boolean): { answer: string; incomplete: boolean } {
  let text = answer.trim();
  if (text.length > RESPONSE_CHAR_LIMIT) {
    const cut = text.lastIndexOf("\n", RESPONSE_CHAR_LIMIT);
    text = text.slice(0, cut > RESPONSE_CHAR_LIMIT * .75 ? cut : RESPONSE_CHAR_LIMIT).trimEnd();
    complete = false;
  }
  if (!complete) text += "\n\n[Response incomplete — please ask me to continue.]";
  return { answer: text, incomplete: !complete };
}
