'use client';
import {useRef,useState} from 'react';
import {Action} from '@/app/assistant-studio/LandingActions';
import {base,copy,primary,wrap} from './constants';

const links=[['Features','#features'],['How it works','#how-it-works'],['Pricing','#pricing'],['Docs',base+'/docs'],[copy.signIn,base+'/login']];

function MenuLinks(){
  return <>
    {links.map(([label,href])=><Action key={href} href={href} event="nav_click" detail={{label}} className="py-2 text-sm font-semibold hover:underline">{label}</Action>)}
    <Action href={base+'/signup'} event="nav_click" detail={{label:copy.start}} className={primary}>{copy.start}</Action>
  </>;
}

export default function Header(){
  const [open,setOpen]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  return <header className="sticky top-0 z-30 border-b border-line bg-mint">
    <div className={wrap+' flex min-h-16 items-center justify-between gap-4'}>
      <Action href={base} event="nav_click" detail={{label:copy.brand}} className="text-xl font-bold tracking-tight">{copy.brand}</Action>
      <button type="button" className="min-h-11 px-2 md:hidden" aria-haspopup="dialog" aria-controls="studio-nav" aria-expanded={open} onClick={()=>{dialog.current?.showModal();setOpen(true);}}>Menu</button>
      <nav aria-label="Assistant Studio" className="hidden items-center gap-5 md:flex"><MenuLinks/></nav>
      <dialog ref={dialog} id="studio-nav" aria-label="Assistant Studio menu" onClose={()=>setOpen(false)} className="ml-auto mr-0 h-dvh max-h-none w-full max-w-sm bg-mint p-6 text-ink shadow-xl backdrop:bg-night/65">
        <div className="mb-6 flex items-center justify-between"><span className="font-bold">{copy.brand}</span><button type="button" className="min-h-11 px-2" onClick={()=>dialog.current?.close()}>Close menu</button></div>
        <nav aria-label="Assistant Studio mobile" className="grid gap-3" onClick={e=>{if((e.target as HTMLElement).closest('a'))dialog.current?.close();}}><MenuLinks/></nav>
      </dialog>
    </div>
  </header>;
}
