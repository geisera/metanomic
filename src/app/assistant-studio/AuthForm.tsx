'use client';
import Link from 'next/link';
import {signupEmailKey} from '@/lib/studio/login-destination';
import {setupDestination} from '@/lib/studio/setup-link';
import {useState,useEffect,useRef,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {track} from '@/lib/navigation-analytics';
import {base,copy} from './content';
import {SessionRedirect} from './LandingActions';
import {call} from './ui';
import s from './landing.module.css';

export default function AuthForm({signup=false,termsVersion}:{signup?:boolean;termsVersion?:string}){
  const router=useRouter(), a=copy.auth;
  const [signInMode,setSignInMode]=useState<'magiclink'|'login'|'recover'>('magiclink'),[show,setShow]=useState(false),[length,setLength]=useState(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const mode=signup?'signup':signInMode;
  const recover=mode==='recover';
  const emailField=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    if(!signup)return;
    try{
      const saved=sessionStorage.getItem(signupEmailKey);
      sessionStorage.removeItem(signupEmailKey);
      if(saved&&emailField.current&&!emailField.current.value)emailField.current.value=saved;
    }catch{}
  },[signup]);
  function changeSignInMode(next:typeof signInMode){setSignInMode(next);setError('');setNotice('');setShow(false);}
  useEffect(()=>{if(signup)track('signup_start',{});if(new URLSearchParams(window.location.search).get('next')==='account'){try{sessionStorage.setItem('studio-setup-destination','setup=account');}catch{}}},[signup]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const fields=new FormData(event.currentTarget);
    setBusy(true);setError('');setNotice('');
    try{
      const result=await call('auth',{action:mode,email:fields.get('email'),password:fields.get('password'),...(termsVersion?{termsVersion,acceptedTerms:fields.get('accept-terms')==='on'}:{})});
      if(mode==='login'){track('signin_complete',{});router.replace(setupDestination());}
      else setNotice(result.message);
    }catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  return <div className={s.site}>{!recover&&<SessionRedirect/>}<header className={s.header}><div className={'container '+s.navRow}><Link className={s.brand} href={base}><span>Assistant Studio</span><small>by Metanomic.ai</small></Link></div></header>
    <main className={'container '+s.authSingle}>
      <section className={s.panel}><h1>{mode==='magiclink'?a.login:a[mode]}</h1>{mode==='magiclink'&&<p>Enter your email and we’ll send you a one-time sign-in link.</p>}<form className={s.authForm} onSubmit={submit}>
        <label htmlFor="auth-email">{signup?a.workEmail:a.email}</label>
        <input ref={emailField} id="auth-email" type="email" name="email" autoComplete="email" required maxLength={254} aria-describedby={signup?'verification-note':undefined}/>
        {signup&&<small id="verification-note">{a.verification}</small>}
        {(signup||mode==='login')&&<><div className={s.passwordLabel}><label htmlFor="auth-password">{a.password}</label>{!signup&&<button type="button" disabled={busy} onClick={()=>changeSignInMode('recover')}>{a.forgot}</button>}</div>
          <div className={s.passwordRow}><input id="auth-password" type={show?'text':'password'} name="password" autoComplete={signup?'new-password':'current-password'} required minLength={signup?12:1} maxLength={128} onChange={e=>setLength(e.target.value.length)} aria-describedby={signup?'password-length':undefined}/><button type="button" className={s.passwordToggle} aria-label={show?'Hide password':'Show password'} aria-pressed={show} title={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={show?'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8':'M2.1 12s3.6-6 9.9-6 9.9 6 9.9 6-3.6 6-9.9 6-9.9-6-9.9-6Z'}/>{!show&&<circle cx="12" cy="12" r="2"/>}</svg></button></div>
          {signup&&<small id="password-length" role="status">{length} / 128 · {length<12?a.length:length<16?a.longer:a.goodLength}</small>}</>}
        {signup&&termsVersion&&<><div className={s.termsConsent}>
          <input id="studio-accept-terms" name="accept-terms" type="checkbox" required/>
          <label htmlFor="studio-accept-terms">I agree to the <Link href={base+'/terms?version='+encodeURIComponent(termsVersion)} target="_blank" rel="noopener">Assistant Studio Terms of Service</Link></label>
        </div><small><Link href={base+'/privacy'} target="_blank" rel="noopener">Privacy and data handling</Link></small></>}
        <button className={s.primary} disabled={busy}>{busy?a.busy:signup?a.create:recover?a.reset:mode==='magiclink'?'Email me a sign-in link':copy.signIn}</button>
        <div aria-live="polite">{error&&<p>{error}</p>}{notice&&<p>{notice}</p>}</div>
      </form>
      {signup?<><small>{copy.free}</small><p>{a.existing} <Link href={base+'/login'}>{a.existingLink}</Link></p></>: <><button type="button" className={s.secondary} disabled={busy} onClick={()=>changeSignInMode(mode==='magiclink'?'login':'magiclink')}>{mode==='magiclink'?'Sign in with a password':'Sign in with an email link'}</button><p>{a.newHere} <Link href={base+'/signup'}>{a.newAccount}</Link></p></>}
      </section>
    </main></div>;
}
