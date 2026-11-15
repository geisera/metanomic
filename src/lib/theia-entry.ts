export type TheiaSource = "nav" | "nav-popover" | "hero" | "card" | "section-input" | "section-chip" | "final-cta" | "footer";
export const PREFILL_KEY = "theia:prefill";
export function openTheia({ prompt, source }: { prompt?: string; source: TheiaSource }) {
  // Source is represented by data-theia-source. No analytics provider is installed.
  void source;
  try {
    const text = prompt?.trim();
    if (text) window.sessionStorage.setItem(PREFILL_KEY, text.slice(0, 900));
    else window.sessionStorage.removeItem(PREFILL_KEY);
  } catch { /* Navigation still works when browser storage is unavailable. */ }
  // A full same-tab navigation guarantees a fresh demo mount for one-shot consumption.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/demo");
}
export function consumeTheiaPrefill(storage: Pick<Storage, "getItem" | "removeItem">): string | null {
  try {
    const text = storage.getItem(PREFILL_KEY);
    storage.removeItem(PREFILL_KEY);
    return text?.trim().slice(0, 900) || null;
  } catch { return null; }
}
