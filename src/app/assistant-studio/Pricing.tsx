'use client';

import {useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {track} from '@/lib/navigation-analytics';
import s from './minimal.module.css';

const config:{
  WAITLIST_ENDPOINT:string;
  CONTACT_URL:string;
  DOCS_URL:string;
  PRO_PRICE?:string;
  PRO_LIMITS?:{assistants:number;documents:number;websites:number};
  USAGE_ESTIMATE?:string;
  SHOW_SOCIAL_PROOF:boolean;
  SOCIAL_PROOF?:{quote:string;attribution:string};
}={
  WAITLIST_ENDPOINT:'/api/theia-studio/waitlist',
  CONTACT_URL:'/contact',
  // TODO: Replace with a dedicated key setup URL when one is available.
  DOCS_URL:'/assistant-studio/docs',
  // TODO: Set PRO_PRICE and PRO_LIMITS after approval.
  // TODO: Set USAGE_ESTIMATE only when supported by actual usage data.
  // TODO: Set SOCIAL_PROOF and enable the flag after approval.
  SHOW_SOCIAL_PROOF:false,
};

const secondary='inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-current px-4 py-3 text-center font-semibold hover:underline';

function Plan({name,audience,price,starter=false,subtitle,children}:{name:string;audience:string;price:ReactNode;starter?:boolean;subtitle?:string;children:ReactNode}){
  return <article className={s.card+' flex min-w-0 flex-col p-6 sm:p-7'+(starter?' '+s.starterPlan:'')}>
    <span className={'mb-3 self-end rounded-full px-2.5 py-1 text-xs font-semibold '+(starter?'bg-lime text-lime-ink':s.fg2+' border border-current')}>{starter?'Available now':'Coming soon'}</span>
    <h3 className="text-xl font-semibold">{name}</h3>
    <p className={s.fg3+' mt-1 text-sm'}>{audience}</p>
    {subtitle&&<p className={s.fg2+' mt-2 text-sm'}>{subtitle}</p>}
    <p className="mt-4 text-2xl font-semibold">{price}</p>
    <hr className="my-5 border-[var(--border)]"/>
    {children}
  </article>;
}

function Feature({children}:{children:ReactNode}){
  return <li className="flex gap-2">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 size-5 shrink-0 text-[var(--chip-fg)]"><path d="m4.5 12.75 6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    <span>{children}</span>
  </li>;
}

function Waitlist(){
  const [status,setStatus]=useState<'idle'|'pending'|'success'|'error'>('idle');
  const [message,setMessage]=useState('');
  const pending=useRef(false);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(pending.current)return;
    const data=new FormData(event.currentTarget);
    pending.current=true;
    setStatus('pending');
    setMessage('Submitting…');

    try {
      const response=await fetch(config.WAITLIST_ENDPOINT,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:data.get('email'),plan:data.get('plan')}),
      });
      if(!response.ok)throw new Error('We couldn’t save your email. Please try again.');
      setStatus('success');
      setMessage('You’re on the list. We’ll email you before launch.');
      track('waitlist_submit',{plan:'pro',status:'success'});
    } catch {
      setStatus('error');
      setMessage('We couldn’t save your email. Please try again.');
      track('waitlist_submit',{plan:'pro',status:'error'});
    } finally {
      pending.current=false;
    }
  }

  return <div className="mt-auto pt-6">
    {status!=='success'&&<form onSubmit={submit} aria-busy={status==='pending'}>
      <input type="hidden" name="plan" value="pro"/>
      <label htmlFor="pro-waitlist-email" className="block text-sm font-semibold">Work email</label>
      <input id="pro-waitlist-email" type="email" name="email" required autoComplete="email" maxLength={254}
        aria-describedby="pro-waitlist-note pro-waitlist-status"
        className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-[var(--fg-3)] bg-[var(--surface-solid)] px-3 focus-visible:outline-2 focus-visible:outline-offset-2"/>
      <button type="submit" aria-disabled={status==='pending'||undefined} className={s.fg2+' mt-3 focus-visible:outline-2 focus-visible:outline-offset-2 '+secondary}>Get early access</button>
    </form>}
    <p id="pro-waitlist-status" aria-live="polite" className={message?s.fg2+' mt-2 text-sm':undefined}>{message}</p>
    <p id="pro-waitlist-note" className={s.fg3+' mt-2 text-xs'}>No spam. One email when Pro launches.</p>
  </div>;
}

export default function Pricing(){
  const section=useRef<HTMLElement>(null);
  const viewed=useRef(false);
  useEffect(()=>{
    const element=section.current;
    if(!element||!('IntersectionObserver' in window))return;
    const observer=new IntersectionObserver(entries=>{
      if(!viewed.current&&entries.some(entry=>entry.isIntersecting)){
        viewed.current=true;
        track('pricing_view',{});
        observer.disconnect();
      }
    });
    observer.observe(element);
    return ()=>observer.disconnect();
  },[]);

  return <section ref={section} id="pricing" aria-labelledby="pricing-heading" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-16 sm:px-8 sm:pb-24">
    <h2 id="pricing-heading" className="text-3xl font-semibold tracking-tight sm:text-5xl">Start free. Upgrade when you’re ready.</h2>
    <p className={s.fg2+' mt-3 max-w-2xl'}>Launch an AI assistant trained on your content in minutes. No credit card, no contract.</p>
    <div className="mt-8 grid gap-5 md:grid-cols-3">
      <Plan name="Starter" audience="For trying it on your site" starter price={<><span className="text-4xl">Free</span> <span className={s.fg3+' text-base font-normal'}>forever</span></>}>
        <ul className={s.fg2+' space-y-2'}>
          <Feature>1 AI assistant trained on your content</Feature>
          <Feature>1 knowledge document (text or Markdown)</Feature>
          <Feature>Embed on up to 2 websites</Feature>
        </ul>
        <p className={s.fg2+' mt-5 text-sm'}>Uses your own OpenAI API key, so you pay OpenAI directly at cost with no markup. <a href={config.DOCS_URL} className="font-semibold underline underline-offset-4" onClick={()=>track('byok_docs_click',{})}>How to get a key →</a></p>
        {config.USAGE_ESTIMATE&&<p className={s.fg3+' mt-2 text-sm'}>{config.USAGE_ESTIMATE}</p>}
        <div className="mt-auto pt-6">
          <a href="/assistant-studio/signup" className={s.cta+' w-full text-center'} onClick={()=>track('pricing_cta_click',{plan:'starter'})}>Create your free assistant</a>
          <p className={s.fg3+' mt-2 text-center text-xs'}>No credit card required · Live in about 10 minutes</p>
        </div>
      </Plan>
      <Plan name="Pro" audience="For businesses turning conversations into customers" subtitle="Join the waitlist for early-access pricing." price={config.PRO_PRICE??'Early-access pricing'}>
        <ul className={s.fg2+' space-y-2'}>
          <Feature><strong>Customer insights:</strong> see what visitors ask, how they feel, and which questions went unanswered</Feature>
          <Feature><strong>Human handoff:</strong> route visitors to your support email or contact form</Feature>
          <Feature><strong>Call to Action:</strong> add a widget button that links to your booking, product, or support page</Feature>
          {config.PRO_LIMITS&&<Feature>Up to {config.PRO_LIMITS.assistants} assistants, {config.PRO_LIMITS.documents} documents each, {config.PRO_LIMITS.websites} websites</Feature>}
          <Feature><strong>Scope Control (Beta)</strong> keeps the assistant focused on your business topics.</Feature>
          <Feature><strong>Prompt injection protection</strong> screens requests and matching knowledge passages before the assistant answers.</Feature>
          <Feature>Remove Metanomic branding</Feature>
        </ul>
        <Waitlist/>
      </Plan>
      <Plan name="Enterprise" audience="For teams and multi-site organizations" price="Custom pricing">
        <ul className={s.fg2+' space-y-2'}>
          <Feature>Unlimited assistants</Feature>
          <Feature>Expanded knowledge and website limits</Feature>
          <Feature>Shared workspace with role-based access</Feature>
          <Feature>Prompt injection protection</Feature>
          <Feature>Dedicated onboarding and priority support</Feature>
        </ul>
        <div className="mt-auto pt-6">
          <a href={config.CONTACT_URL} className={s.fg2+' '+secondary} onClick={()=>track('enterprise_contact_click',{})}>Talk to us</a>
          <p className={s.fg3+' mt-2 text-xs'}>Tell us about your team and we’ll reach out before launch.</p>
        </div>
      </Plan>
    </div>
    {config.SHOW_SOCIAL_PROOF&&config.SOCIAL_PROOF&&<figure className={s.card+' mt-8 p-5'}>
      <blockquote>{config.SOCIAL_PROOF.quote}</blockquote><figcaption className={s.fg3+' mt-2'}>{config.SOCIAL_PROOF.attribution}</figcaption>
    </figure>}
  </section>;
}
