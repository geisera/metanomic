"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import AgentExperience from "@/app/demo/AgentExperience";
import { useTheiaConversation } from "./TheiaConversation";
import { theiaEvent, type EntrySource } from "@/lib/theia-dock";
export default function TheiaDrawer({open,onClose,source}:{open:boolean;onClose:()=>void;source:EntrySource}) {
  const ref=useRef<HTMLDialogElement>(null);
  const chat=useTheiaConversation();
  const answered=chat.items.some(item=>item.role==="assistant"&&item.id!=="intro");
  useEffect(()=>{
    const dialog=ref.current;
    if(!dialog)return;
    if(!open){dialog.close();return;}
    const previous=document.documentElement.style.overflow;
    document.documentElement.style.overflow="hidden";
    dialog.showModal();
    return ()=>{dialog.close();document.documentElement.style.overflow=previous;};
  },[open]);
  return createPortal(<dialog ref={ref} className="theia-drawer" aria-labelledby="theia-drawer-title" onCancel={event=>{event.preventDefault();onClose();}}>
    <div className="theia-drawer-heading"><h2 id="theia-drawer-title">Theia · AI workflow advisor</h2><button type="button" autoFocus onClick={onClose} aria-label="Close Theia drawer">×</button></div>
    {open && <AgentExperience embedded instance="drawer" />}
    {answered && <a href="/contact" className="theia-handoff" onClick={()=>theiaEvent("theia_handoff_click",source,chat.section.current)}>Want this scoped for your team? Talk with us →</a>}
  </dialog>,document.body);
}
