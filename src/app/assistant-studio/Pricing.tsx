'use client';

import {STARTER_MONTHLY_CENTS,STARTER_TRIAL_DAYS} from '@/lib/studio/starter-plan';
import FeedbackToast from './FeedbackToast';
import {useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {track} from '@/lib/navigation-analytics';
import s from './minimal.module.css';

const secondary = 'inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-current px-4 py-3 text-center font-semibold hover:underline';

function Plan({name, description, price, action, featured=false, children}: {
  name: string;
  description: string;
  price: ReactNode;
  action: ReactNode;
  featured?: boolean;
  children: ReactNode;
}) {
  return <article className={s.pricingPlan} data-featured={featured || undefined} aria-label={name}>
    <div className={s.pricingPlanHeader}>
      <h3>{name}</h3>
      <p>{description}</p>
    </div>
    <div className={s.pricingPrice}>{price}</div>
    <div className={s.pricingAction}>{action}</div>
    <ul className={s.pricingFeatures}>{children}</ul>
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
      const response=await fetch('/api/theia-studio/waitlist',{
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

  return <div className="mt-3">
    {status!=='success'&&<form onSubmit={submit} aria-busy={status==='pending'}>
      <input type="hidden" name="plan" value="pro"/>
      <label htmlFor="pro-waitlist-email" className="block text-sm font-semibold">Work email</label>
      <input id="pro-waitlist-email" type="email" name="email" required autoComplete="email" maxLength={254}
        aria-describedby="pro-waitlist-note"
        className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-[var(--fg-3)] bg-[var(--surface-solid)] px-3 focus-visible:outline-2 focus-visible:outline-offset-2"/>
      <button type="submit" aria-disabled={status==='pending'||undefined} className={s.fg2+' mt-3 focus-visible:outline-2 focus-visible:outline-offset-2 '+secondary}>{status==='pending'?'Joining…':'Join waitlist'}</button>
    </form>}
    <FeedbackToast message={message} tone={status==='error'?'error':'info'}/>
    <p id="pro-waitlist-note" className={s.fg3+' mt-2 text-xs'}>{status==='success'?'You’re on the list.':'One email when Pro launches.'}</p>
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
    <header className={s.pricingHeader}>
      <h2 id="pricing-heading">Assistant Studio pricing</h2>
      <p>Start with a chatbot for your website. Add more control and support as your needs grow.</p>
    </header>

    <div className={s.pricingPlans}>
      <Plan name="Starter" description="For launching your first website assistant." featured
        price={<><p><strong>{'$' + STARTER_MONTHLY_CENTS / 100}</strong> <span>/ month after trial</span></p>
          <p>{STARTER_TRIAL_DAYS}-day free trial. No card required.</p></>}
        action={<a href="/assistant-studio/signup" className={s.cta+' w-full'} onClick={()=>track('pricing_cta_click',{plan:'starter'})}>Start free</a>}>
        <Feature>1 AI assistant</Feature>
        <Feature>1 knowledge document (text or Markdown)</Feature>
        <Feature>Embed on up to 2 websites</Feature>
      </Plan>

      <Plan name="Pro" description="For businesses that want more control over visitor conversations."
        price={<><p><strong>Early-access pricing</strong></p><p>Join the waitlist for pricing details.</p></>}
        action={<details className={s.pricingWaitlist}>
          <summary className={secondary}>Get early access</summary>
          <Waitlist/>
        </details>}>
        <Feature><strong>Call to Action</strong> adds a booking, product, or contact button.</Feature>
        <Feature><strong>Scope Control (Beta)</strong> keeps replies focused on your business topics.</Feature>
        <Feature><strong>Prompt injection protection</strong> screens visitor messages and matching knowledge.</Feature>
        <Feature>Customer insights and human handoff</Feature>
        <Feature>Remove Metanomic branding</Feature>
      </Plan>

      <Plan name="Enterprise" description="For teams and organizations with multiple websites."
        price={<><p><strong>Custom pricing</strong></p><p>Talk to us about your requirements.</p></>}
        action={<a href="/contact" className={secondary} onClick={()=>track('enterprise_contact_click',{})}>Talk to us</a>}>
        <Feature>Unlimited assistants</Feature>
        <Feature>Expanded knowledge and website limits</Feature>
        <Feature>Shared workspace with role-based access</Feature>
        <Feature>Prompt injection protection</Feature>
        <Feature>Dedicated onboarding and priority support</Feature>
      </Plan>
    </div>
    <p className={s.pricingBilling}>Starter uses your OpenAI API key. OpenAI bills model usage separately.{' '}
      <a href="/assistant-studio/docs" onClick={()=>track('byok_docs_click',{})}>How to connect your key</a>
    </p>
  </section>;
}
