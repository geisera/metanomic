"use client";
import type { AnchorHTMLAttributes } from "react";
import { openTheia, type TheiaSource } from "@/lib/theia-entry";
export default function TheiaLink({ prompt, source, onClick, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { prompt?: string; source: TheiaSource }) {
  return <a {...props} href="/demo" data-theia-source={source} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openTheia({ prompt, source });
  }} />;
}
