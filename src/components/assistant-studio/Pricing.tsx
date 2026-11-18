'use client';
import {useState} from 'react';
import {Action} from '@/app/assistant-studio/LandingActions';
import {base,heading,primary,section,wrap} from './constants';

// Connect this handler to the notification service when subscriptions are supported.
async function onNotify(email:string){void email;return false;}

export default function Pricing(){
  const [feedback,setFeedback]=useState('');
  return <section id="pricing" className={wrap+' '+section}>
    <p aria-hidden="true" className="mb-3 text-sm font-semibold text-slate">Pricing</p>
    <h2 className={heading}>Pricing</h2>
    <div className="mt-10 grid gap-4 md:grid-cols-2">
      <article className="flex flex-col items-start rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8">
        <h3 className="font-semibold">Free (Starter)</h3>
        <p className="mt-3 text-3xl font-semibold">Free to start</p>
        <ul className="mb-8 mt-6 space-y-3 text-slate">
          {['1 assistant','1 content document','Up to 1,000 messages/day, configurable'].map(item=><li key={item}><span aria-hidden="true">✓ </span>{item}</li>)}
        </ul>
        <Action href={base+'/signup'} event="pricing_cta_click" detail={{tier:'starter'}} className={primary+' mt-auto'}>Start free</Action>
      </article>
      <article className="rounded-3xl bg-night p-6 text-mint sm:p-8">
        <h3 className="font-semibold">Pro &amp; Business</h3>
        <p className="mt-3 inline-flex rounded-full bg-night-2 px-3 py-1 text-sm font-semibold ring-1 ring-mint/30">Coming soon</p>
        <p className="mt-6 text-muted-2">Higher limits, more content sources, and branding removal.</p>
        <form className="mt-6" onSubmit={async e=>{
          e.preventDefault();
          const email=String(new FormData(e.currentTarget).get('email')).trim();
          const subscribed=await onNotify(email);
          setFeedback(subscribed?'You’re on the list.':'Email notifications aren’t available yet.');
        }}>
          <label htmlFor="studio-notify" className="text-sm font-semibold">Email address</label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input id="studio-notify" name="email" type="email" required autoComplete="email" className="min-h-11 min-w-0 flex-1 basis-40 rounded-lg border border-muted bg-night-2 px-3 text-mint"/>
            <button className={primary} type="submit">Notify me</button>
          </div>
          <p className="mt-2 text-sm text-muted-2" role="status">{feedback}</p>
        </form>
      </article>
    </div>
  </section>;
}
