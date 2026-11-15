"use client";
import type { AnchorHTMLAttributes } from "react";
import { useTheiaDock } from "./TheiaDock";
import { openTheia, type TheiaSource } from "@/lib/theia-entry";
export default function TheiaLink({ prompt, source, onClick, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { prompt?: string; source: TheiaSource }) {
  const dock = useTheiaDock();
  return <a {...props} href="/demo" data-theia-source={source} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (dock) dock.open(source, prompt);
    else openTheia({ prompt, source });
  }} />;
}
