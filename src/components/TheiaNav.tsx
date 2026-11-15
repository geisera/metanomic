"use client";
import { useState } from "react";
import TheiaAvatar from "./TheiaAvatar";
import TheiaLink from "./TheiaLink";
export default function TheiaNav() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  return <div className="theia-nav relative" onMouseEnter={() => { setDismissed(false); setOpen(window.matchMedia("(min-width: 1024px)").matches); }} onMouseLeave={() => setOpen(false)}
    onFocus={() => { if (!dismissed) setOpen(window.matchMedia("(min-width: 1024px)").matches); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setDismissed(false); } }}
    onKeyDown={event => { if (event.key === "Escape") { setOpen(false); setDismissed(true); } }}>
    <TheiaLink source="nav" className="navlink inline-flex items-center gap-2 rounded" aria-expanded={open && !dismissed} aria-controls="theia-nav-preview">Try Theia <span className="rounded border border-[#506c53] px-1.5 py-0.5 text-[10px] text-[#c9ec8a]">Live AI</span></TheiaLink>
    <div id="theia-nav-preview" className={`absolute right-0 top-full hidden w-72 pt-3 lg:block ${open && !dismissed ? "visible" : "invisible"}`}>
      <div className="rounded-lg border border-[#506c53] bg-[#0c1a23] p-5 shadow-xl">
        <TheiaAvatar status /><p className="my-4 text-sm leading-6">Our AI workflow advisor. Describe a challenge, get a pilot outline.</p>
        <TheiaLink source="nav-popover" className="button button-primary" tabIndex={open && !dismissed ? 0 : -1}>Ask Theia →</TheiaLink>
      </div>
    </div>
  </div>;
}
