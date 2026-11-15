"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./stack.module.css";
type Layer = { id:string; number:string; name:string };
export default function LayerNavigation({layers}:{layers:Layer[]}) {
  const [active,setActive]=useState(layers[0].id);
  const current=useRef(layers[0].id);
  const nav=useRef<HTMLElement>(null);
  useEffect(()=>{
    let frame=0;
    const update=()=>{
      const boundary=nav.current?.getBoundingClientRect().bottom || 160;
      const visible=layers.map(layer=>({id:layer.id,rect:document.getElementById(layer.id)?.getBoundingClientRect()})).filter(item=>item.rect && item.rect.bottom>boundary && item.rect.top<innerHeight);
      if(!visible.length)return;
      visible.sort((a,b)=>Math.abs(a.rect!.top-boundary)-Math.abs(b.rect!.top-boundary));
      // Two-column rows can have two equally visible layers. Preserve the clicked one.
      const row=visible.filter(item=>Math.abs(item.rect!.top-visible[0].rect!.top)<2);
      const chosen=row.find(item=>item.id===location.hash.slice(1))||row.find(item=>item.id===current.current)||visible[0];
      current.current=chosen.id;setActive(chosen.id);
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update);};
    schedule();window.addEventListener("scroll",schedule,{passive:true});window.addEventListener("resize",schedule);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener("scroll",schedule);window.removeEventListener("resize",schedule);};
  },[layers]);
  useEffect(()=>{
    const link=nav.current?.querySelector<HTMLElement>('[aria-current="location"]');
    const row=link?.parentElement;
    if(!link||!row)return;
    // Keep the active chip visible without scrolling the page itself.
    if(link.offsetLeft<row.scrollLeft)row.scrollLeft=link.offsetLeft;
    else if(link.offsetLeft+link.offsetWidth>row.scrollLeft+row.clientWidth)row.scrollLeft=link.offsetLeft+link.offsetWidth-row.clientWidth;
  },[active]);
  return <nav ref={nav} aria-label="Technology layer index" className={styles.index}><div className={styles.chips}>{layers.map(layer=><a key={layer.id} href={`#${layer.id}`} aria-current={active===layer.id?"location":undefined} onClick={()=>{current.current=layer.id;setActive(layer.id);}}>{layer.number} / {layer.name}</a>)}</div></nav>;
}
