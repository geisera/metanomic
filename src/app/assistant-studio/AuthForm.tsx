'use client';
import Link from 'next/link';
import {useState,useEffect,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {track} from '@/lib/navigation-analytics';
import {base,copy} from './content';
import {StepList,SessionRedirect} from './LandingActions';
import {call} from './ui';
import s from './landing.module.css';

export default function AuthForm({signup=false,termsVersion}:{signup?:boolean;termsVersion?:string}){
  const router=useRouter(), a=copy.auth;
  const [recover,setRecover]=useState(false),[show,setShow]=useState(false),[length,setLength]=useState(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const mode=signup?'signup':recover?'recover':'login';
  useEffect(()=>{if(signup)track('signup_start',{});},[signup]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const fields=new FormData(event.currentTarget);
    setBusy(true);setError('');setNotice('');
    try{
      const result=await call('auth',{action:mode,email:fields.get('email'),password:fields.get('password'),...(termsVersion?{termsVersion,acceptedTerms:fields.get('accept-terms')==='on'}:{})});
      if(mode==='login'){track('signin_complete',{});router.replace(base+'/dashboard');}
      else setNotice(result.message);
    }catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  return <div className={s.site}>{!recover&&<SessionRedirect/>}<header className={s.header}><div className={'container '+s.navRow}><Link className={s.brand} href={base}>{copy.brand}</Link></div></header>
    <main className={'container '+(signup?s.authSplit:s.authSingle)}>
      {signup&&<aside className={s.panel}><h2>{a.recap}</h2><StepList compact/><ul>{[copy.features[0][0],copy.features[2][0]].map(text=><li key={text}>{text}</li>)}</ul></aside>}
      <section className={s.panel}><h1>{a[mode]}</h1><form className={s.authForm} onSubmit={submit}>
        <label htmlFor="auth-email">{signup?a.workEmail:a.email}</label>
        <input id="auth-email" type="email" name="email" autoComplete="email" required maxLength={254} aria-describedby={signup?'verification-note':undefined}/>
        {signup&&<small id="verification-note">{a.verification}</small>}
        {!recover&&<><div className={s.passwordLabel}><label htmlFor="auth-password">{a.password}</label>{!signup&&<button type="button" disabled={busy} onClick={()=>{setRecover(true);setError('');setNotice('');}}>{a.forgot}</button>}</div>
          <div className={s.passwordRow}><input id="auth-password" type={show?'text':'password'} name="password" autoComplete={signup?'new-password':'current-password'} required minLength={signup?12:1} maxLength={128} onChange={e=>setLength(e.target.value.length)} aria-describedby={signup?'password-length':undefined}/><button type="button" className={s.secondary} aria-pressed={show} onClick={()=>setShow(!show)}>{show?a.hide:a.show}</button></div>
          {signup&&<small id="password-length" role="status">{length} / 128 · {length<12?a.length:length<16?a.longer:a.goodLength}</small>}</>}
        {signup&&termsVersion&&<><div className={s.termsConsent}>
          <input id="studio-accept-terms" name="accept-terms" type="checkbox" required/>
          <label htmlFor="studio-accept-terms">I agree to the <Link href={base+'/terms?version='+encodeURIComponent(termsVersion)} target="_blank" rel="noopener">Assistant Studio Terms of Service</Link></label>
        </div><small><Link href={base+'/privacy'} target="_blank" rel="noopener">Privacy and data handling</Link></small></>}
        <button className={s.primary} disabled={busy}>{busy?a.busy:signup?a.create:recover?a.reset:copy.signIn}</button>
        <div aria-live="polite">{error&&<p>{error}</p>}{notice&&<p>{notice}</p>}</div>
      </form>
      {signup?<><small>{copy.free}</small><p>{a.existing} <Link href={base+'/login'}>{a.existingLink}</Link></p></>:recover?<button type="button" className={s.secondary} disabled={busy} onClick={()=>{setRecover(false);setError('');setNotice('');}}>{copy.signIn}</button>:<p>{a.newHere} <Link href={base+'/signup'}>{a.newAccount}</Link></p>}
      </section>
    </main></div>;
}
