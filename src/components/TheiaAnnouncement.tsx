"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import TheiaAvatar from "./TheiaAvatar";
import TheiaLink from "./TheiaLink";
const DISMISS_KEY = "theia-bar-dismissed";
const messages = [
  "Describe a business challenge. Theia, our AI advisor, maps a pilot in minutes.",
  "Our support queue is backed up.",
  "Intake forms take days to process.",
  "Reps spend hours updating the CRM.",
];
export default function TheiaAnnouncement() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [heroGone, setHeroGone] = useState(false);
  const [obstructed, setObstructed] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    let frame = 0;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReduced(media.matches);
    const measure = () => {
      setHeroGone((document.getElementById("home-hero")?.getBoundingClientRect().bottom ?? Infinity) <= 86);
      const blockers = document.querySelectorAll('footer, [role="dialog"], [aria-modal="true"], [id*="cookie" i], [class*="cookie-banner" i], [id*="consent" i]');
      setObstructed(Array.from(blockers).some(el => {
        const r = el.getBoundingClientRect(); const style = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 && style.visibility !== "hidden" && style.display !== "none";
      }));
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const init = window.setTimeout(() => {
      try { setDismissed(localStorage.getItem(DISMISS_KEY) === "1"); } catch {}
      syncMotion(); measure(); setReady(true);
    }, 0);
    media.addEventListener("change", syncMotion);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "aria-hidden", "open"] });
    return () => { clearTimeout(init); cancelAnimationFrame(frame); media.removeEventListener("change", syncMotion); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); observer.disconnect(); };
  }, []);
  useEffect(() => {
    if (!ready || dismissed || paused || reduced) return;
    const timer = window.setInterval(() => setIndex(i => (i + 1) % messages.length), 6000);
    return () => window.clearInterval(timer);
  }, [ready, dismissed, paused, reduced]);
  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
  }
  const current = reduced ? 0 : index;
  return <>
    <noscript><style>{`.theia-pending { visibility:visible; } .theia-dismiss { display:none; }`}</style></noscript>
    {!dismissed && <section aria-label="Theia announcement" className={`theia-announcement ${ready ? "" : "theia-pending"}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
      <div className="container flex items-center gap-3 py-3 pr-10 sm:justify-center">
        <TheiaAvatar status className="!h-8 !w-8 !text-sm" />
        <TheiaLink source={current ? "bar-example" : "bar"} prompt={current ? messages[current] : undefined} className="theia-bar-link">
          <span>{messages[current]}</span><span className="theia-bar-button">Ask Theia →</span>
        </TheiaLink>
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss announcement" className="theia-dismiss">×</button>
    </section>}
    {ready && (dismissed || heroGone) && !obstructed && window.location.pathname !== "/demo" && createPortal(
      <TheiaLink source="launcher" aria-label="Ask Theia, our AI workflow advisor" className="theia-launcher"><TheiaAvatar status className="!h-8 !w-8 !text-sm" />Ask Theia <span aria-hidden="true">→</span></TheiaLink>, document.body)}
  </>;
}
