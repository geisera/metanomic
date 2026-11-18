'use client';
import {useState} from 'react';
import {Action} from '@/app/assistant-studio/LandingActions';
import {base,copy,primary,wrap} from './constants';

export default function Header(){
  const [open,setOpen]=useState(false);
  const links=[['Features','#features'],['How it works','#how-it-works'],['Pricing','#pricing'],['Docs',base+'/docs'],[copy.signIn,base+'/login']];
  return <header className="sticky top-0 z-30 border-b border-line bg-mint">
    <div className={wrap+' relative flex min-h-16 items-center justify-between gap-4'}>
      <Action href={base} event="nav_click" detail={{label:copy.brand}} className="text-xl font-bold tracking-tight">{copy.brand}</Action>
      <button className="min-h-11 px-2 md:hidden" aria-controls="studio-nav" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Close menu':'Menu'}</button>
      <nav id="studio-nav" aria-label="Assistant Studio" className={(open?'grid':'hidden')+' absolute inset-x-0 top-full gap-3 border-b border-line bg-mint p-5 md:static md:flex md:items-center md:gap-5 md:border-0 md:p-0'} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.currentTarget.parentElement?.querySelector('button')?.focus();}}} onClick={e=>{if((e.target as HTMLElement).closest('a'))setOpen(false);}}>
        {links.map(([label,href])=><Action key={href} href={href} event="nav_click" detail={{label}} className="py-2 text-sm font-semibold hover:underline">{label}</Action>)}
        <Action href={base+'/signup'} event="nav_click" detail={{label:copy.start}} className={primary}>{copy.start}</Action>
      </nav>
    </div>
  </header>;
}
