'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import PrimaryNav from '@/components/PrimaryNav';
import {Account} from './Account';
import {base} from './content';
import {call,type Snapshot,type User} from './ui';
import s from './studio.module.css';

export default function AccountRoute(){
 const router=useRouter();
 const [user,setUser]=useState<User|null>(null),[data,setData]=useState<Snapshot|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async()=>{try{const auth=await call('auth');setUser({...auth.user,impersonating:auth.impersonating,impersonationExpiresAt:auth.impersonationExpiresAt});setData(await call('manage'));}catch(e){setError((e as Error).message);router.replace(base+'/login?next=account');}finally{setLoading(false);}},[router]);
 const refresh=useCallback(async()=>setData(await call('manage')),[]);
 useEffect(()=>{queueMicrotask(()=>void load());},[load]);
 async function exitImpersonation(){try{const response=await fetch('/api/studio-admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'impersonate_stop'})});if(!response.ok)throw new Error('Could not exit View as user.');router.replace('/admin');}catch(e){setError((e as Error).message);}}
 return <><PrimaryNav studio membershipTier={!loading && user ? data?.tier?.name : undefined}/><main className={s.shell}><div className='container'>{user?.impersonating&&<div className={s.impersonationBar} role='status'><strong>Admin view</strong><span>Viewing {user.name?.trim()||user.email}. Changes apply to this account.</span><button className={s.textButton} type='button' onClick={exitImpersonation}>Return to operations</button></div>}<div className={s.intro}><h1>Account settings</h1><p>Manage your default model key, profile, security, and email preferences.</p></div>{error&&<p className={s.alert} role='alert'>{error}</p>}{loading?<p role='status'>Checking your account…</p>:user&&data?<Account key={user.id} user={user} onUpdate={load} keyInfo={data.keys[0]} onKeyUpdate={refresh}/>:null}<footer className={s.footer}>Assistant Studio by Metanomic · <Link href='/assistant-studio/privacy'>Privacy and data handling</Link> · <Link href='/contact'>Contact our team</Link></footer></div></main></>;
}
