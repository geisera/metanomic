'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {Auth,Account} from './Account';
import Workspace from './Workspace';
import Instructions from './Instructions';
import {call,GuardProvider,useGuard,type User,type Snapshot} from './ui';
import s from './studio.module.css';
export {call} from './ui';
export default function Studio(){return <GuardProvider><StudioContent/></GuardProvider>;}
function StudioContent(){
 const [user,setUser]=useState<User|null>(null),[data,setData]=useState<Snapshot|null>(null),[loading,setLoading]=useState(true),[view,setView]=useState<'agents'|'account'|'help'>('agents'),[error,setError]=useState('');const {leave}=useGuard();
 const load=useCallback(async()=>{try{const d=await call('auth');setUser(d.user);setData(await call('manage'));}catch(e){setUser(null);if((e as Error).message!=='Sign in to continue.')setError((e as Error).message);}finally{setLoading(false);}},[]);
 const refresh=useCallback(async()=>{setData(await call('manage'));},[]);
 useEffect(()=>{queueMicrotask(()=>void load());},[load]);
 function navigate(next:typeof view){if(leave())setView(next);}
 function connect(){if(!leave())return;setView('account');requestAnimationFrame(()=>document.getElementById('api-key')?.scrollIntoView({block:'start'}));}
 async function logout(){if(!leave())return;try{await call('auth',{action:'logout'});setUser(null);setData(null);}catch(e){setError((e as Error).message);}}
 return <main className={s.shell}><div className='container'><header className={s.header}><Link className={s.brand} href='/theia-studio' onClick={e=>{if(!leave())e.preventDefault();}}>Theia <span>Studio</span></Link><nav aria-label='Studio navigation'>{user&&<><button className={s.textButton} aria-pressed={view==='agents'} onClick={()=>navigate('agents')}>Assistants</button><button className={s.textButton} aria-pressed={view==='account'} onClick={()=>navigate('account')}>Account</button><button className={s.textButton} onClick={logout}>Sign out</button></>}<button className={s.textButton} aria-pressed={view==='help'} onClick={()=>navigate(view==='help'?'agents':'help')}>Help</button><Link href='/' onClick={e=>{if(!leave())e.preventDefault();}}>Metanomic →</Link></nav></header>
 {(!user||data?.agents.length===0)&&<div className={s.intro}><h1>Build a chat assistant for your website, trained on your content, powered by your OpenAI key.</h1><p>Connect your key, add your content, and paste one line of code on your site. We host it.</p></div>}
 {error&&<p className={s.alert} role='alert'>{error}</p>}{view==='help'?<section className={'card '+s.guide}><Instructions/></section>:loading?<p role='status'>Checking your account…</p>:!user?<Auth onLogin={load}/>:view==='account'?<Account key={user.id} user={user} onUpdate={load}/>:data?<Workspace data={data} refresh={refresh} onKey={connect}/>:null}
 <footer className={s.footer}>Theia Studio by Metanomic · <Link href='/theia-studio/privacy' onClick={e=>{if(!leave())e.preventDefault();}}>Privacy and data handling</Link> · <Link href='/contact' onClick={e=>{if(!leave())e.preventDefault();}}>Contact our team</Link></footer></div></main>;
}
