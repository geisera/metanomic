'use client';
import {useEffect,useState,type FormEvent} from 'react';
import s from './operations.module.css';

type Policy={body:string;version:string};
type Props={request:<T>(body:object)=>Promise<T>};
function Editor({kind,request}:{kind:string}&Props){
 const [doc,setDoc]=useState<Policy|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;request<Policy>({action:'site_policy',kind}).then(row=>{if(active)setDoc(row);}).catch(err=>{if(active)setMessage(err.message);});return ()=>{active=false;};},[kind,request]);
 async function publish(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!doc||busy)return;
 const fields=Object.fromEntries(new FormData(e.currentTarget));setBusy(true);
 try{setDoc(await request<Policy>({...fields,kind,version:doc.version,action:'publish_site_policy'}));setMessage('Published to metanomic.ai.');}
 catch(err){setMessage((err as Error).message);}finally{setBusy(false);}}
 return <>{message&&<p role="status">{message}</p>}{doc?<form key={doc.version} onSubmit={publish} className={s.form}>
 <label>Policy text<textarea name="content" rows={20} defaultValue={doc.body} required maxLength={48000}/></label>
 <label>Reason for change<input name="reason" required minLength={3} maxLength={300}/></label>
 <button className="button button-primary" disabled={busy}>Publish {kind==='terms'?'terms':'privacy policy'}</button></form>:!message&&<p>Loading policy…</p>}</>;
}
export default function PolicyEditor({request}:Props){const [kind,setKind]=useState('terms');
 return <section className={s.panel}><h2>Site policies</h2><label>Document<select value={kind} onChange={e=>setKind(e.target.value)}><option value="terms">Terms of Service</option><option value="privacy">Privacy Policy</option></select></label>
 <Editor key={kind} kind={kind} request={request}/></section>;
}
