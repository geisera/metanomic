'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { emailSteps, type EmailTemplate, type Step } from '@/lib/studio/email-template';
import s from './operations.module.css';

type Request = <T>(body: object) => Promise<T>;

export default function EmailTemplates({request}:{request:Request}) {
    const [templates,setTemplates] = useState<EmailTemplate[]>([]);
    const [step,setStep] = useState<Step>('welcome');
    const [error,setError] = useState('');
    const [notice,setNotice] = useState('');
    const [saving,setSaving] = useState(false);
    useEffect(()=>{
        let active=true;
        request<EmailTemplate[]>({action:'email_templates'}).then(rows=>{
            if(active)setTemplates(rows);
        }).catch(e=>{if(active)setError(e.message);});
        return ()=>{active=false;};
    },[request]);
    const template=templates.find(t=>t.step===step);
    async function save(event:FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if(!template || saving)return;
        setError(''); setNotice(''); setSaving(true);
        const fields=new FormData(event.currentTarget);
        const value=(name:string)=>String(fields.get(name)??'').trim();
        const edits={subject:value('subject'),body:value('body'),label:value('label')};
        try {
            const {version}=await request<{version:number}>({action:'save_email_template',step,version:template.version,...edits,reason:value('reason')});
            setTemplates(rows=>rows.map(t=>t.step===step?{...t,...edits,version}:t));
            setNotice('Template saved for future sends.');
        } catch(e){setError((e as Error).message);}
        finally{setSaving(false);}
    }
    return <section className={s.panel}><h2>Email templates</h2>
        <p>Edit the welcome email and the five versions of the 48-hour setup reminder.</p>
        {error&&<p className={s.message} data-error="true" role="alert">{error}</p>}
        {notice&&<p className={s.message} role="status">{notice}</p>}
        <div className={s.form}><label>Template<select disabled={saving||!templates.length} value={step} onChange={e=>{setStep(e.target.value as Step);setNotice('');setError('');}}>
            {Object.entries(emailSteps).map(([id,name])=><option key={id} value={id}>{name}</option>)}
        </select></label></div>
        {template?<form key={step+template.version} className={s.form} onSubmit={save}>
            <label>Subject and heading<input required maxLength={150} name="subject" defaultValue={template.subject}/></label>
            <label>Message<textarea required rows={6} maxLength={4000} name="body" defaultValue={template.body}/></label>
            <label>Button label<input required maxLength={80} name="label" defaultValue={template.label}/></label>
            <label>Reason for change<input required minLength={3} maxLength={300} name="reason"/></label>
            <button className="button button-primary" disabled={saving}>{saving?'Saving…':'Save template'}</button>
        </form>:!error&&<p role="status">Loading templates…</p>}
    </section>;
}
