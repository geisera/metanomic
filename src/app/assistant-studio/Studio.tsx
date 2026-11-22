'use client';
import SiteFooter from '@/components/SiteFooter';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {base,copy} from './content';
import PrimaryNav from '@/components/PrimaryNav';
import Workspace from './Workspace';
import StudioWidgets from './StudioWidgets';
import Instructions from './Instructions';
import StarterBilling from './StarterBilling';
import {call,ErrorNotice,GuardProvider,useGuard,type User,type Snapshot} from './ui';
import s from './studio.module.css';
export {call} from './ui';
export default function Studio(){return <GuardProvider><StudioContent/></GuardProvider>;}
function StudioContent(){
 const router=useRouter();
 const [user,setUser]=useState<User|null>(null),[data,setData]=useState<Snapshot|null>(null),[loading,setLoading]=useState(true),[view,setView]=useState<'agents'|'help'>('agents'),[error,setError]=useState('');const {leave}=useGuard();
 const load=useCallback(async()=>{try{const d=await call('auth');setUser({...d.user, impersonating:d.impersonating, impersonationExpiresAt:d.impersonationExpiresAt});setData(await call('manage'));}catch(e){setUser(null);if((e as Error).message==='Sign in to continue.'){try{sessionStorage.setItem('studio-setup-destination',window.location.search);}catch{}router.replace(base+'/login');}else setError((e as Error).message);}finally{setLoading(false);}},[router]);
 const refresh=useCallback(async()=>{setData(await call('manage'));},[]);
 useEffect(()=>{queueMicrotask(()=>{if(new URLSearchParams(window.location.search).get('setup')==='key'||window.location.hash.startsWith('#account')){router.replace(base+'/account'+(window.location.hash.startsWith('#account')?window.location.hash:'#account-default-key'));return;}void load();});},[load,router]);
 function navigate(next:typeof view){
  if(!leave())return;
  if(next!=='help')window.history.replaceState(window.history.state,'',base+'/dashboard');
  setView(next);
 }
 function openDefaultKey(){
  if(!leave())return;
  router.push(base+'/account#account-default-key');
 }
 async function logout(){if(!leave())return;try{await call('auth',{action:'logout'});setUser(null);setData(null);router.replace(base+'/login');}catch(e){setError((e as Error).message);}}
 async function exitImpersonation(){if(!leave())return;try{const response=await fetch('/api/studio-admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'impersonate_stop'})});if(!response.ok)throw new Error('Could not exit View as user.');router.replace('/admin');}catch(e){setError((e as Error).message);}}
 return <><PrimaryNav studio membershipTier={user ? data?.tier?.name : undefined} dashboard={{view,signedIn:Boolean(user),navigate,leave,logout:user?.impersonating?exitImpersonation:logout}}/><main className={s.shell}><div className='container'>{user?.impersonating&&<div className={s.impersonationBar} role='status'><strong>Admin view</strong><span>Viewing {user.name?.trim() || user.email}. Changes apply to this account.</span><button className={s.textButton} type='button' onClick={exitImpersonation}>Return to operations</button></div>}
 {(!user||data?.agents.length===0)&&<div className={s.intro}><h1>{copy.brand}</h1><p>{copy.onboarding.create}</p></div>}
 {view==='agents'&&user&&data?.billing&&<StarterBilling access={data.billing} refresh={refresh} impersonating={user.impersonating}/>}
 <ErrorNotice error={error}/>{view==='help'?<section className={'card '+s.guide}><Instructions/></section>:loading?<p role='status'>Checking your account…</p>:!user?<Link href={base+'/login'}>{copy.signIn}</Link>:data?<Workspace accountId={user.id} startedAt={user.created_at?String(Date.parse(user.created_at)):undefined} data={data} refresh={refresh} onDefaultKey={openDefaultKey}/>:null}
 <SiteFooter leave={leave}/>{user&&data&&<StudioWidgets/>}</div></main></>;
}
