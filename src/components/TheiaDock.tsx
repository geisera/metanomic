"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import TheiaAvatar from "./TheiaAvatar";
import { useTheiaConversation } from "./TheiaConversation";
import { contextPrompts, defaultPrompts, dockChips, DOCK_KEY, entrySource, theiaEvent, type EntrySource } from "@/lib/theia-dock";
const Drawer = dynamic(() => import("./TheiaDrawer"), { ssr: false });
type UI = { open: (source: string, prompt?: string) => void; drawerOpen: boolean };
const DockContext = createContext<UI | null>(null);
export const useTheiaDock = () => useContext(DockContext);
export default function TheiaDock({ children }: {children:ReactNode}) {
  const pathname = usePathname();
  const marketing = pathname !== "/demo" && !pathname.startsWith("/admin");
  const chat = useTheiaConversation();
  const { setSection } = chat;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [source, setSource] = useState<EntrySource>("typed");
  const [minimized, setMinimized] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const [demoVisible, setDemoVisible] = useState(false);
  const [context, setContext] = useState("");
  const [bottom, setBottom] = useState(16);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [letters, setLetters] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const pill = useRef<HTMLButtonElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const lastScroll = useRef(0);
  const visible = marketing && initialized && !heroVisible && !demoVisible && !drawerOpen;
  const placeholder = contextPrompts[context] || defaultPrompts[rotation];
  function minimize(value: boolean) {
    setMinimized(value);
    try { sessionStorage.setItem(DOCK_KEY, String(value)); } catch {}
  }
  const measure = useEffectEvent(() => {
    const hero = document.getElementById("home-hero")?.getBoundingClientRect();
    const demo = document.getElementById("meet-theia")?.getBoundingClientRect();
    const visibleRect = (r?: DOMRect) => !!r && r.bottom > 86 && r.top < innerHeight;
    setHeroVisible(visibleRect(hero)); setDemoVisible(visibleRect(demo));
    const sections = [...document.querySelectorAll("section[id]")];
    const current = sections.find(el => { const r=el.getBoundingClientRect();return r.top <= innerHeight*.5 && r.bottom > innerHeight*.5; });
    setSection(current?.id || pathname);
    const cards = [...document.querySelectorAll<HTMLElement>("[data-theia-context]")].filter(el => visibleRect(el.getBoundingClientRect()));
    const center = cards.sort((a,b) => Math.abs(a.getBoundingClientRect().top + a.offsetHeight/2 - innerHeight/2) - Math.abs(b.getBoundingClientRect().top + b.offsetHeight/2 - innerHeight/2))[0];
    setContext(center?.dataset.theiaContext || "");
    const footer = document.querySelector("footer")?.getBoundingClientRect();
    setBottom(footer && footer.top < innerHeight && footer.bottom > 0 ? Math.max(16, innerHeight-footer.top+16) : 16);
    const delta=scrollY-lastScroll.current;
    if (Math.abs(delta)>24) {
      if (!dock.current?.contains(document.activeElement) && !drawerOpen) minimize(delta>0);
      lastScroll.current=scrollY;
    }
  });
  useEffect(() => {
    const media=matchMedia("(prefers-reduced-motion: reduce)");
    const motion=()=>setReduced(media.matches);
    const init=setTimeout(()=>{try{setMinimized(sessionStorage.getItem(DOCK_KEY)==="true");}catch{}motion();lastScroll.current=scrollY;measure();setInitialized(true);},0);
    let frame=0;
    const scroll=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>measure());};
    const card=(event:Event)=>{const el=(event.target as HTMLElement).closest<HTMLElement>("[data-theia-context]");if(el){setContext(el.dataset.theiaContext||"");setSection(el.id||"services");}};
    window.addEventListener("scroll",scroll,{passive:true});window.addEventListener("resize",scroll);
    document.addEventListener("pointerover",card);document.addEventListener("focusin",card);media.addEventListener("change",motion);
    return ()=>{clearTimeout(init);cancelAnimationFrame(frame);window.removeEventListener("scroll",scroll);window.removeEventListener("resize",scroll);document.removeEventListener("pointerover",card);document.removeEventListener("focusin",card);media.removeEventListener("change",motion);};
  },[pathname,setSection]);
  useEffect(()=>{
    if (!visible || reduced || focused || context) return;
    const timer=setTimeout(()=>{if(letters>=placeholder.length){setRotation(i=>(i+1)%defaultPrompts.length);setLetters(0);}else setLetters(i=>i+1);},letters>=placeholder.length?3500:60);
    return ()=>clearTimeout(timer);
  },[visible,reduced,focused,context,letters,placeholder]);
  useEffect(()=>{if(visible)theiaEvent("theia_bar_shown",source,chat.section.current);},[visible,source,chat.section]);
  function openDrawer(prompt?:string, origin:EntrySource="typed") {
    setSource(origin);setLoaded(true);setDrawerOpen(true);
    if(prompt?.trim()) {void chat.submit(prompt,origin);setText("");}
  }
  function open(origin:string,prompt?:string) {
    const mapped=entrySource(origin);setSource(mapped);
    if(prompt?.trim()){openDrawer(prompt,mapped);return;}
    const hero=document.getElementById("home-hero")?.getBoundingClientRect();
    const demo=document.getElementById("meet-theia");
    if ((hero && hero.bottom>86 && hero.top<innerHeight) || demoVisible) {
      demo?.scrollIntoView({behavior:reduced?"instant":"smooth",block:"center"});
      document.getElementById("theia-workflow")?.focus({preventScroll:true});return;
    }
    minimize(false);requestAnimationFrame(()=>input.current?.focus({preventScroll:true}));
  }
  function closeDrawer() {
    setDrawerOpen(false);minimize(true);
    requestAnimationFrame(()=>{if(heroVisible||demoVisible)document.getElementById("theia-workflow")?.focus({preventScroll:true});else pill.current?.focus({preventScroll:true});});
  }
  return <DockContext.Provider value={{open,drawerOpen}}>
    {children}
    {marketing && <div className="theia-dock-reserve" aria-hidden="true" />}
    {visible && <div ref={dock} className={`theia-dock ${minimized ? "is-minimized" : ""}`} style={{bottom:`max(${bottom}px, env(safe-area-inset-bottom))`}} onFocus={()=>{setFocused(true);theiaEvent("theia_bar_focus",source,chat.section.current);}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}}>
      {minimized ? <button ref={pill} className="theia-dock-pill" onFocus={event=>{if(event.currentTarget.matches(":focus-visible")){minimize(false);requestAnimationFrame(()=>input.current?.focus({preventScroll:true}));}}} onClick={()=>{if(chat.count)openDrawer();else{minimize(false);requestAnimationFrame(()=>input.current?.focus());}}}>
        <TheiaAvatar status className="!h-8 !w-8 !text-sm" /><span>{chat.count ? "Pick up where you left off with Theia →" : "Got a slow workflow? Theia will map the pilot."}</span>
      </button> : <>
        <div className="theia-dock-chips">{dockChips(context).map(chip=><button key={chip.label} type="button" disabled={chat.busy||chat.atLimit||!chat.ready} onClick={()=>{setText(chip.prompt);theiaEvent("theia_chip_tap","chip",chat.section.current,{chip_label:chip.label});openDrawer(chip.prompt,"chip");}}>{chip.label}</button>)}<button type="button" aria-label="Minimize Theia prompt bar" onClick={()=>{minimize(true);requestAnimationFrame(()=>pill.current?.focus());}}>−</button></div>
        <form onSubmit={event=>{event.preventDefault();if(text.trim())openDrawer(text);}} className="theia-dock-form">
          <TheiaAvatar status className="!h-8 !w-8 !text-sm" />
          <label htmlFor="theia-dock-input" className="sr-only">Describe a workflow to Theia</label>
          <input ref={input} id="theia-dock-input" maxLength={900} value={text} onChange={event=>setText(event.target.value)} placeholder={reduced||context||focused ? placeholder : placeholder.slice(0,letters)} disabled={chat.busy||chat.atLimit||!chat.ready} />
          <button type="submit" className="button button-primary" disabled={!text.trim()||chat.busy||chat.atLimit||!chat.ready}>Map my pilot →</button>
        </form>
        <p className="theia-dock-micro">Free live demo · About 60 seconds · Don&apos;t share sensitive information</p>
        {(chat.count > 0) && <button type="button" className="theia-dock-resume" onClick={()=>openDrawer()}>Pick up where you left off with Theia →</button>}
      </>}
    </div>}
    {loaded && <Drawer open={drawerOpen} onMinimize={closeDrawer} source={source} />}
  </DockContext.Provider>;
}
