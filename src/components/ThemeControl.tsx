'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
type Mode='dark'|'system'|'light';
export default function ThemeControl({icon,className='theme-control'}:{icon?:ReactNode;className?:string}={}){
 const [mode,setMode]=useState<Mode|null>(null);
 useEffect(()=>{
  let active=true;
  queueMicrotask(()=>{
   if(!active)return;
   try{const saved=localStorage.getItem('metanomic:theme');setMode(saved==='dark'||saved==='light'?saved:'system');}
   catch{setMode('system');}
  });
  return()=>{active=false;};
 },[]);
 useEffect(()=>{if(!mode)return;const media=matchMedia('(prefers-color-scheme: dark)');const apply=()=>{document.documentElement.dataset.theme=mode==='system'?(media.matches?'dark':'light'):mode;};apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);},[mode]);
 return <label className={className}>{icon ? <span aria-hidden="true">{icon}</span> : 'Appearance'}<select aria-label='Color theme' value={mode||'system'} onChange={e=>{const next=e.target.value as Mode;setMode(next);try{localStorage.setItem('metanomic:theme',next);}catch{}}}><option value='dark'>Dark</option><option value='system'>System</option><option value='light'>Light</option></select></label>;
}

export function GlobalThemeControl(){
 const path=usePathname();
 return ['/assistant-studio/login', '/assistant-studio/signup'].includes(path)?null:<div className='theme-footer container'><ThemeControl/></div>;
}
