'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import PrimaryNav from '@/components/PrimaryNav';
import ThemeControl from '@/components/ThemeControl';
import {Account} from './Account';
import {base} from './content';
import {call,ErrorNotice,type Snapshot,type User} from './ui';
import s from './studio.module.css';

export default function AccountRoute(){
 const router=useRouter();
 const [user,setUser]=useState<User|null>(null),[data,setData]=useState<Snapshot|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async()=>{try{const auth=await call('auth');setUser({...auth.user,impersonating:auth.impersonating,impersonationExpiresAt:auth.impersonationExpiresAt});setData(await call('manage'));}catch(e){setError((e as Error).message);router.replace(base+'/login?next=account');}finally{setLoading(false);}},[router]);
 const refresh=useCallback(async()=>setData(await call('manage')),[]);
 useEffect(()=>{queueMicrotask(()=>void load());},[load]);
 async function exitImpersonation(){try{const response=await fetch('/api/studio-admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'impersonate_stop'})});if(!response.ok)throw new Error('Could not exit View as user.');router.replace('/admin');}catch(e){setError((e as Error).message);}}
 return <div className={s.accountPage}>
  <PrimaryNav studio membershipTier={!loading && user ? data?.tier?.name : undefined}/>
  <main className={s.shell + ' ' + s.accountShell}>
   <div className={'container ' + s.accountFrame}>
    {user?.impersonating&&<div className={s.impersonationBar} role='status'><strong>Admin view</strong><span>Viewing {user.name?.trim()||user.email}. Changes apply to this account.</span><button className={s.textButton} type='button' onClick={exitImpersonation}>Return to operations</button></div>}
    <div className={s.intro}><h1>Account settings</h1><p>Manage your default model key, profile, security, and email preferences.</p></div>
    <ErrorNotice error={error}/>
    {loading ? <p role='status'>Checking your account…</p> : user&&data&&
     <Account key={user.id} user={user} onUpdate={load} keyInfo={data.keys[0]} onKeyUpdate={refresh}>
      <footer className={s.footer + ' ' + s.accountFooter}>
       <span>Assistant Studio by Metanomic · <Link href='/assistant-studio/privacy'>Privacy and data handling</Link> · <Link href='/contact'>Contact our team</Link></span>
       <ThemeControl/>
      </footer>
     </Account>}
   </div>
  </main>
 </div>;
}
