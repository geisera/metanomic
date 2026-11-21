'use client';
import Link from 'next/link';
import {useEffect,useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {track} from '@/lib/navigation-analytics';
import {base,copy} from './content';
import FeedbackToast from './FeedbackToast';
import {call} from './ui';
import s from './landing.module.css';

export function Action({href,event,detail,className,children}:{href:string;event:string;detail?:Record<string,string>;className?:string;children:ReactNode}){
  return <Link href={href} className={className} onClick={()=>track(event,detail??{})}>{children}</Link>;
}
export function SessionRedirect(){
  const router=useRouter();
  useEffect(()=>{
    let active=true;
    void call('auth').then(()=>{if(active)router.replace(base+'/dashboard');}).catch(()=>{});
    return ()=>{active=false;};
  },[router]);
  return null;
}
export function Header(){
  const [open,setOpen]=useState(false);
  return <header className={s.header} onKeyDown={e=>{if(e.key==='Escape'&&open){setOpen(false);e.currentTarget.querySelector('button')?.focus();}}}>
    <div className={'container '+s.navRow}>
      <Action href={base} event="nav_click" detail={{label:copy.brand}} className={s.brand}>{copy.brand}</Action>
      <button type="button" className={s.menu} aria-label="Menu" aria-controls="studio-product-nav" aria-expanded={open} onClick={()=>setOpen(!open)}>☰</button>
      <nav id="studio-product-nav" className={s.nav} data-open={open} aria-label="Assistant Studio" onClick={e=>{if((e.target as HTMLElement).closest('a'))setOpen(false);}}>
        {copy.nav.map(([label,href])=><Action key={href} href={href} event="nav_click" detail={{label}}>{label}</Action>)}
        <Action href={base+'/login'} event="nav_click" detail={{label:copy.signIn}}>{copy.signIn}</Action>
        <Action href={base+'/signup'} event="nav_click" detail={{label:copy.start}} className={s.primary}>{copy.start}</Action>
      </nav>
    </div>
  </header>;
}
export function StepList({compact=false}:{compact?:boolean}){
  const [feedback,setFeedback]=useState('');
  async function copySnippet(){try{await navigator.clipboard.writeText(copy.snippet);setFeedback(copy.copied);}catch{setFeedback(copy.copyError);}}
  return <ol className={compact?s.recapSteps:s.cards}>{copy.steps.map(([title,body,icon],index)=><li key={title} className={compact?undefined:s.panel}>
    {!compact&&<span aria-hidden="true" className={s.step}>{index+1} · {icon}</span>}<h3>{title}</h3><p>{body}</p>
    {!compact&&index===2&&<><pre className={s.snippet}><code>{copy.snippet}</code></pre><button className={s.secondary} onClick={copySnippet}>{copy.copyCode}</button><FeedbackToast message={feedback} tone={feedback===copy.copyError?'error':'info'}/></>}
  </li>)}</ol>;
}
export function Demo({marketing=false}:{marketing?:boolean}){
  const [selected,setSelected]=useState<number|null>(null);
  return <div className={marketing?"mt-5":s.panel}>{!marketing&&<p>{copy.demo.notice}</p>}<div className={marketing?"flex flex-wrap gap-3":s.actions}>{copy.demo.questions.map(([question],i)=><button className={marketing?"min-h-11 rounded-full bg-white px-4 py-2 text-sm font-semibold ring-1 ring-lime-ink/20 hover:bg-lime aria-pressed:bg-lime":s.secondary} key={question} aria-pressed={selected===i} onClick={()=>{setSelected(i);track('demo_interaction',{kind:'starter_question',question});}}>{question}</button>)}</div><p className={marketing?"mt-4 max-w-2xl text-slate":undefined} role="status">{selected===null?'':copy.demo.questions[selected][1]}</p></div>;
}
export function FAQAccordion(){
  const [expanded,setExpanded]=useState<string[]>([]);
  return <div>{copy.faq.map(({id,q,a})=>{const open=expanded.includes(id);return <div className={s.faq} key={id}><h3><button aria-expanded={open} aria-controls={'faq-'+id} onClick={()=>{setExpanded(open?expanded.filter(item=>item!==id):[...expanded,id]);if(!open)track('faq_expand',{question_id:id});}}>{q}<span aria-hidden>{open?'−':'+'}</span></button></h3><p id={'faq-'+id} hidden={!open}>{a}</p></div>;})}</div>;
}
