"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useTheiaConversation } from "./TheiaConversation";
import { entrySource, type EntrySource } from "@/lib/theia-dock";

const Drawer = dynamic(() => import("./TheiaDrawer"), { ssr: false });
type UI = { open: (source: string, prompt?: string) => void; drawerOpen: boolean };
const DockContext = createContext<UI | null>(null);
export const useTheiaDock = () => useContext(DockContext);

// Shared drawer controller for the nav, homepage form, and contextual links.
export default function TheiaDock({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const chat = useTheiaConversation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [source, setSource] = useState<EntrySource>("typed");
  const trigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try { sessionStorage.removeItem("theia:dock-minimized"); } catch {}
  }, []);

  function open(origin: string, prompt?: string) {
    trigger.current = document.activeElement as HTMLElement;
    const current = [...document.querySelectorAll("section[id]")].find(element => {
      const rect = element.getBoundingClientRect();
      return rect.top <= innerHeight / 2 && rect.bottom > innerHeight / 2;
    });
    chat.setSection(trigger.current?.closest("section[id]")?.id || current?.id || pathname);
    const mapped = entrySource(origin);
    setSource(mapped);
    setLoaded(true);
    setDrawerOpen(true);
    if (prompt?.trim()) void chat.submit(prompt, mapped);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    requestAnimationFrame(() => {
      if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true });
    });
  }

  return <DockContext.Provider value={{ open, drawerOpen }}>
    {children}
    {loaded && <Drawer open={drawerOpen} onClose={closeDrawer} source={source} />}
  </DockContext.Provider>;
}
