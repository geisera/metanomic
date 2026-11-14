"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISS_KEY = "theia-bar-dismissed";
const NAV_HEIGHT = 86;

function sectionVisibleBelowNav(element: Element) {
  const rect = element.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > NAV_HEIGHT;
}

export default function TheiaAnnouncement() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [compact, setCompact] = useState(false);
  const [theiaVisible, setTheiaVisible] = useState(false);

  useEffect(() => {
    // Start visually hidden until storage has been checked; returning visitors
    // never see an announcement they previously dismissed.
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      // Storage can be blocked by browser/privacy settings.
    }

    const hero = document.getElementById("home-hero");
    const theia = document.getElementById("meet-theia");

    function measure() {
      if (hero) setCompact(hero.getBoundingClientRect().bottom <= NAV_HEIGHT);
      if (theia) setTheiaVisible(sectionVisibleBelowNav(theia));
    }

    measure();
    setReady(true);

    if (!("IntersectionObserver" in window)) {
      window.addEventListener("scroll", measure, { passive: true });
      window.addEventListener("resize", measure);
      return () => {
        window.removeEventListener("scroll", measure);
        window.removeEventListener("resize", measure);
      };
    }

    const heroObserver = new IntersectionObserver(
      ([entry]) => setCompact(!entry.isIntersecting && entry.boundingClientRect.bottom <= NAV_HEIGHT),
      { rootMargin: `-${NAV_HEIGHT}px 0px 0px 0px` }
    );
    const theiaObserver = new IntersectionObserver(
      ([entry]) => setTheiaVisible(entry.isIntersecting),
      { rootMargin: `-${NAV_HEIGHT}px 0px 0px 0px` }
    );

    if (hero) heroObserver.observe(hero);
    if (theia) theiaObserver.observe(theia);
    return () => {
      heroObserver.disconnect();
      theiaObserver.disconnect();
    };
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Dismiss for this page even when storage is unavailable.
    }
  }

  const visible = ready && !dismissed && !theiaVisible;

  return (
    <section
      aria-label="Meet Theia announcement"
      aria-hidden={!visible}
      className={`absolute inset-x-0 top-full border-b-2 border-[#c9ec8a] bg-[#142820]/98 shadow-[0_6px_20px_rgba(0,0,0,.20)] backdrop-blur-sm transition-[height,opacity,visibility] duration-200 motion-reduce:transition-none ${
        compact ? "h-[48px] sm:h-[36px]" : "h-[72px] sm:h-[43px]"
      } ${visible ? "visible opacity-100" : "invisible pointer-events-none opacity-0"}`}
    >
      {/* Stretch across the entire announcement, not just the content container. */}
      <Link
        href="/demo"
        aria-label="Open Theia chat"
        tabIndex={visible ? 0 : -1}
        className="absolute inset-0 z-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#c9ec8a]"
      />

      <div className="container relative z-10 flex h-full items-center justify-center">
        <div className="pointer-events-none relative flex min-w-0 items-center justify-center gap-3 sm:gap-3">
          {!compact && (
            <span aria-hidden="true" className="relative hidden h-6 w-6 shrink-0 items-center justify-center rounded border border-[#73936d] bg-[#243c31] text-sm font-semibold text-[#ddf4c5] sm:flex">
              T
              <span className="theia-online-dot absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-[#c9ec8a]" />
            </span>
          )}
          <div className={`flex min-w-0 items-center justify-center sm:flex-row sm:gap-3 ${compact ? "flex-row gap-2" : "flex-col gap-1"}`}>
            <p className={`whitespace-nowrap text-center font-medium text-[#e6f0e7] ${compact ? "hidden text-[11px] sm:block" : "text-[11px] sm:text-[11px] lg:text-xs"}`}>
              <span className="hidden sm:inline">Describe a business challenge. Theia maps the AI solution.</span>
              <span className="sm:hidden">Got a business challenge? Ask Theia.</span>
            </p>
            <Link
              href="/demo"
              tabIndex={visible ? 0 : -1}
              className="pointer-events-auto inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-[#c9ec8a] px-3 text-xs font-bold text-[#101a1b] transition-colors hover:bg-[#dcf7af] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-8"
            >
              Talk with Theia <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>

        <button
          type="button"
          tabIndex={visible ? 0 : -1}
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className={`absolute right-0 z-20 flex h-11 w-11 items-center justify-center rounded-md text-xl leading-none text-[#e6f0e7] transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#c9ec8a] sm:top-1/2 sm:-translate-y-1/2 ${compact ? "top-1/2 -translate-y-1/2" : "bottom-1 sm:bottom-auto"}`}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </section>
  );
}
