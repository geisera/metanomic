'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { actions, accountActions, type AccountAction, type AdminAction, type StaffRole, type Workspace } from '@/lib/studio/admin-contract';
import Accounts from './Accounts';
import PolicyEditor from './PolicyEditor';
import EmailTemplates from './EmailTemplates';
import Stats from './Stats';
import ScopeConfiguration from './ScopeConfiguration';
import s from './operations.module.css';

type Staff = { accountLabel: string; roles: StaffRole[]; verified: boolean; factors: { id: string; name?: string }[] };
type Change = { action: AdminAction; agentId?: string; blockId?: string };
const date = (value: string | null) => value ? new Date(value).toLocaleString() : 'None recorded';
const keyLabels = {
    shared:'Shared key connected',override:'Separate key connected',missing:'No key connected',
    override_invalid:'Separate key needs replacement',upgrade_required:'Separate key requires an eligible plan',
};
const commonErrors:Record<string,string>={
    invalid_key:'OpenAI rejected the connected key',assistant_key_invalid:'OpenAI rejected the separate key',
    model_access:'The connected key cannot access this model',insufficient_credit:'OpenAI billing or credit needs attention',
    origin_not_approved:'A request came from a website that is no longer approved',
};
const operationLabel = (value: string) => Object.hasOwn(actions,value) ? actions[value as AdminAction].label : Object.hasOwn(accountActions,value) ? accountActions[value as AccountAction].label : value.replaceAll('_',' ');

async function submit<T>(body?: object, endpoint = '/api/studio-admin'): Promise<T> {
    const response = await fetch(endpoint, body ? {
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',
    } : {cache:'no-store'});
    const data = await response.json().catch(()=>({}));
    if (!response.ok) throw Object.assign(new Error(data.error || 'The request could not be completed.'),{status:response.status,code:data.code});
    return data as T;
}

type View = 'accounts'|'membership'|'stats'|'scope'|'emails'|'legal';
type ViewItem = {id:View;label:string;icon:string;role?:StaffRole};
const viewGroups:{name:string;items:ViewItem[]}[]=[
    {name:'Workspace',items:[
        {id:'accounts',label:'Accounts',icon:'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M17 4a4 4 0 0 1 0 7 M18 15a4 4 0 0 1 3 4'},
        {id:'stats',label:'Stats',icon:'M3 3v18h18 M7 17v-6 M12 17V7 M17 17v-9'}]},
    {name:'Configuration',items:[
        {id:'membership',label:'Membership',role:'billing',icon:'M3 5h18v14H3z M3 10h18 M7 15h4'},
        {id:'scope',label:'Prompt Guard',role:'operations',icon:'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z M8 12l3 3 5-6'}]},
    {name:'Publishing',items:[
        {id:'emails',label:'Email templates',role:'operations',icon:'M3 5h18v14H3z M3 6l9 7 9-7'},
        {id:'legal',label:'Site policies',role:'operations',icon:'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6'}]},
];

export default function Operations() {
    const [view,setView] = useState<View>('accounts');
    const [staff,setStaff] = useState<Staff|null>(null);
    const [state,setState] = useState<'loading'|'sign-in'|'blocked'|'ready'>('loading');
    const [busy,setBusy] = useState(false);
    const [error,setError] = useState('');
    const [notice,setNotice] = useState('');
    const [enrollment,setEnrollment] = useState<{factorId:string;secret:string;qrImage:string|null}|null>(null);
    const [workspaceRevision,setWorkspaceRevision] = useState(0);
    const [workspace,setWorkspace] = useState<Workspace|null>(null);
    const [change,setChange] = useState<Change|null>(null);
    const [impersonateOwner,setImpersonateOwner] = useState<string|null>(null);
    const changeHeading=useRef<HTMLHeadingElement>(null);
    const load=useCallback(async()=>{
        try {
            setStaff(await submit<Staff>());
            setState('ready');
        } catch (e) {
            const problem=e as Error & {status?:number};
            setStaff(null);
            setEnrollment(null);
            setWorkspace(null);
            setChange(null);
            setState(problem.status===401?'sign-in':'blocked');
            if(problem.status!==401)setError(problem.message);
        }
    },[]);
    useEffect(()=>{queueMicrotask(()=>void load());},[load]);
    useEffect(()=>{if(change)changeHeading.current?.focus();},[change]);

    async function run(operation:()=>Promise<void>){
        if(busy)return;
        setBusy(true);
        setError('');
        setNotice('');
        try{await operation();}
        catch(e){
            const problem=e as Error & {status?:number;code?:string};
            if(problem.status===401||problem.code==='mfa_required'||(problem.status===403&&staff?.verified&&problem.code!=='invalid_mfa_code')){
                setWorkspace(null);setChange(null);setImpersonateOwner(null);await load();
            }
            setError(problem.message);
        }
        finally{setBusy(false);}
    }

    function signIn(event:FormEvent<HTMLFormElement>){
        event.preventDefault();
        const form=event.currentTarget;
        const fields=Object.fromEntries(new FormData(form));
        void run(async()=>{
            await submit({action:'login',email:fields.email,password:fields.password},'/api/theia-studio/auth');
            form.reset();
            await load();
        });
    }
    function verify(event:FormEvent<HTMLFormElement>){
        event.preventDefault();
        const fields=Object.fromEntries(new FormData(event.currentTarget));
        void run(async()=>{
            await submit({action:'verify',factorId:fields.factorId,code:fields.code});
            setEnrollment(null);
            await load();
        });
    }
    function open(ownerId:string){
        void run(async()=>{
            setWorkspace(null);setChange(null);
            setWorkspace((await submit<{workspace:Workspace}>({action:'workspace',ownerId})).workspace);
        });
    }
    function beginImpersonation(ownerId:string){ setImpersonateOwner(ownerId); setChange(null); }
    function confirmImpersonation(event:FormEvent<HTMLFormElement>){
        event.preventDefault();
        if(!impersonateOwner)return;
        const fields=Object.fromEntries(new FormData(event.currentTarget));
        void run(async()=>{
            const result=await submit<{redirectUrl:string}>({action:'impersonate_start',ownerId:impersonateOwner,reason:fields.reason,factorId:fields.factorId,code:fields.code});
            window.location.assign(result.redirectUrl);
            setNotice('View as user opened.');
            setImpersonateOwner(null);
        });
    }
    function applyChange(event:FormEvent<HTMLFormElement>){
        event.preventDefault();
        if(!change||!workspace)return;
        const fields=Object.fromEntries(new FormData(event.currentTarget));
        void run(async()=>{
            const result=await submit<{workspace:Workspace}>({...fields,...change,ownerId:workspace.owner_id});
            setWorkspace(result.workspace);setWorkspaceRevision(value=>value+1);setChange(null);setNotice(actions[change.action].label+' completed.');
        });
    }

    const operations=staff?.roles.includes('operations');
    const billing=staff?.roles.includes('billing');
    const ownerContext=workspace?.assistants.find(agent=>agent.id===change?.agentId)?.name||workspace?.email;

    return <main className={s.shell}><div className={s.container}>
        <header className={s.header}><div><p className={s.eyebrow}>Metanomic · Internal</p><h1>Studio operations</h1></div><div className={s.row}>{staff&&<span className={s.meta} style={{overflowWrap:"anywhere"}}>Signed in as {staff.accountLabel}</span>}<Link href="/assistant-studio/dashboard">Assistant Studio</Link>{staff&&<button type="button" className="button button-outline" disabled={busy} onClick={()=>void run(async()=>{
            await submit({action:'logout'},'/api/theia-studio/auth');setStaff(null);setEnrollment(null);setWorkspace(null);setChange(null);setView('accounts');setState('sign-in');
        })}>Sign out</button>}</div></header>
        {error&&<p className={s.message} data-error="true" role="alert">{error}</p>}
        {notice&&<p className={s.message} role="status">{notice}</p>}
        {state==='loading'&&<p role="status">Checking staff access…</p>}
        {state==='sign-in'&&<section className={s.panel+' '+s.authPanel}><h2>Staff sign-in</h2><form className={s.form} onSubmit={signIn}>
            <label>Email<input name="email" type="email" autoComplete="username" required/></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" required/></label>
            <button className="button button-primary" disabled={busy}>Sign in</button>
        </form><Link href="/assistant-studio/login">Use an Assistant Studio sign-in link</Link></section>}
        {state==='blocked'&&<section className={s.panel+' '+s.authPanel}><h2>Staff access required</h2><p>Sign in with a Metanomic account that has Studio operations access.</p><Link href="/assistant-studio/login">Go to sign-in</Link></section>}
        {staff&&!staff.verified&&<section className={s.panel+' '+s.authPanel}><h2>Verify your authenticator</h2>
            {!staff.factors.length&&!enrollment&&<><p>Set up an authenticator app to access customer records and operations.</p><button className="button button-primary" disabled={busy} onClick={()=>void run(async()=>setEnrollment(await submit({action:'enroll'})))}>Set up authenticator</button></>}
            {enrollment&&<>{enrollment.qrImage&&<>
                <p>Scan this QR code with your authenticator app, then enter the six-digit code it generates.</p>
                <Image src={enrollment.qrImage} alt="QR code for Metanomic staff MFA setup" className={s.mfaQr} width={208} height={208} unoptimized/>
            </>}
            {!enrollment.qrImage&&<p>Add a time-based account called Metanomic to your authenticator app, then enter the six-digit code it generates.</p>}
            <details open={enrollment.qrImage?undefined:true}><summary>{enrollment.qrImage?'Can’t scan? Use the setup key':'Manual setup key'}</summary>
                <code>{enrollment.secret}</code>
            </details>
            <p className={s.meta}>Keep the QR code and setup key private.</p></>}
            {(staff.factors.length>0||enrollment)&&<form className={s.form} onSubmit={verify}>
                {enrollment?<input type="hidden" name="factorId" value={enrollment.factorId}/>:<FactorSelect staff={staff}/>}
                <AuthenticatorCode/><button className="button button-primary" disabled={busy}>Verify code</button>
            </form>}
        </section>}
        {staff?.verified&&<>
            <div className={s.layout}>
            <nav className={s.rail} aria-label="Operations views">
                {viewGroups.map(group=>{
                    const items=group.items.filter(item=>!item.role||staff.roles.includes(item.role));
                    return items.length>0&&<div key={group.name}><h2>{group.name}</h2>{items.map(item=>
                        <button type="button" key={item.id} aria-pressed={view===item.id} onClick={()=>setView(item.id)}>
                            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                            {item.label}{item.id==='scope'&&<span className={s.betaBadge}>Beta</span>}
                        </button>)}</div>;
                })}
            </nav>
            <div className={s.content}>
            {operations&&view==='legal'&&<PolicyEditor request={submit}/>}
            {view==='emails'&&operations&&<EmailTemplates request={submit}/>}
            {view==='scope'&&operations&&<ScopeConfiguration request={submit} onSessionChange={load}/>}
            {view==='stats'&&<Stats request={submit} onSessionChange={load}/>}
            <div className={s.adminView} hidden={view==='legal'||view==='stats'||view==='scope'||view==='emails'}>
            <Accounts membershipView={view==='membership'} roles={staff.roles} request={submit} onOpenWorkspace={open} onSessionChange={load}
                workspaceBusy={busy} workspaceRevision={workspaceRevision} onImpersonate={beginImpersonation} clearWorkspace={()=>{setWorkspace(null);setChange(null);setImpersonateOwner(null);}}
                reauth={<><p className={s.meta}>Enter a fresh authenticator code to authorize this change.</p><FactorSelect staff={staff}/><AuthenticatorCode/></>}/>
<div className={s.adminView} hidden={view!=='accounts'}>
            {impersonateOwner&&<section className={s.panel+' '+s.confirm} aria-labelledby="impersonate-heading"><h2 id="impersonate-heading">View as user</h2><p>This opens the selected account’s Assistant Studio for 15 minutes. Changes made in Studio apply to the selected account and are recorded as staff activity. Account security, billing, and deletion actions remain blocked.</p><form className={s.form} onSubmit={confirmImpersonation}><label>Reason or case reference<textarea name="reason" minLength={3} maxLength={300} required/></label><p className={s.meta}>Enter a fresh authenticator code to authorize impersonation.</p><FactorSelect staff={staff}/><AuthenticatorCode/><div className={s.row}><button className="button button-primary" disabled={busy}>Open Studio as user</button><button type="button" className="button button-outline" disabled={busy} onClick={()=>setImpersonateOwner(null)}>Cancel</button></div></form></section>}
            {workspace&&<>
                <section className={s.panel} aria-labelledby="workspace-heading"><h2 id="workspace-heading">{workspace.email}</h2><span className={s.status}>{workspace.suspended?'Suspended':'Active'}</span>
                    <dl className={s.facts}>
                        <Fact label="Workspace ID">{workspace.owner_id}</Fact><Fact label="Email verified">{date(workspace.email_confirmed_at)}</Fact>
                        <Fact label="Base plan">{workspace.base_tier}</Fact><Fact label="Effective plan">{workspace.effective_tier.name}</Fact>
                        <Fact label="Plan limits">{workspace.effective_tier.assistants} assistants · {workspace.effective_tier.websites} websites · {workspace.effective_tier.documents} documents per assistant</Fact>
                        {workspace.plan_override&&<Fact label="Plan override expires">{date(workspace.plan_override.expires_at)}</Fact>}
                    </dl>
                    <div className={s.row}>
                        {operations&&<Action action={workspace.suspended?'restore_workspace':'suspend_workspace'} choose={setChange}/>}
                        {billing&&workspace.tiers.length>1&&<Action action="set_plan" choose={setChange}/>}
                        {billing&&workspace.plan_override&&<Action action="clear_plan" choose={setChange}/>}
                    </div>
                    {billing&&workspace.tiers.length===1&&<p className={s.meta}>Plan overrides become available when another plan is configured.</p>}
                </section>
                <section className={s.section} aria-labelledby="assistants-heading"><h2 id="assistants-heading">Assistants</h2>
                    {!workspace.assistants.length&&<p>No assistants created.</p>}
                    <div className={s.grid}>{workspace.assistants.map(agent=>{
                        const today=agent.usage.find(day=>day.day===new Date().toISOString().slice(0,10));
                        const lastError=workspace.errors.find(item=>item.agent_id===agent.id&&commonErrors[item.code]);
                        const recentProblem=lastError&&(!agent.last_answer_at||Date.parse(lastError.created_at)>Date.parse(agent.last_answer_at))?commonErrors[lastError.code]:null;
                        const blocker=workspace.suspended?'Workspace suspended':agent.embed_disabled?'Embed disabled by staff':!agent.published?'Unpublished':!agent.origins.length?'No approved domains':
                            ['missing','override_invalid','upgrade_required'].includes(agent.key_status)?keyLabels[agent.key_status]:
                            (today?.requests||0)>=agent.message_limit?'Daily limit reached':recentProblem||'Live configuration is available';
                        return <article key={agent.id} className={s.panel}><h3>{agent.name}</h3><span className={s.status}>{blocker}</span>
                            <dl className={s.facts}>
                                <Fact label="Assistant ID">{agent.id}</Fact><Fact label="Model">{agent.model}</Fact><Fact label="OpenAI key">{keyLabels[agent.key_status]}</Fact>
                                <Fact label="Approved domains">{agent.origins.join(', ')||'None'}</Fact>
                                <Fact label="Today (UTC)">{today?.requests||0} of {agent.message_limit} messages · {today?.failed||0} failed</Fact>
                                <Fact label="Last 7 days">{agent.usage.reduce((n,day)=>n+day.requests,0)} messages · {agent.usage.reduce((n,day)=>n+day.failed,0)} failed</Fact>
                                {agent.limit_expires_at&&<Fact label="Limit override">Base {agent.configured_limit} · expires {date(agent.limit_expires_at)}</Fact>}
                                <Fact label="First embed">{date(agent.first_embed_at)}</Fact><Fact label="Last answer">{date(agent.last_answer_at)}</Fact>
                            </dl><div className={s.row}>{operations&&<Action action={agent.embed_disabled?'enable_embed':'disable_embed'} agentId={agent.id} choose={setChange}/>}
                            {billing&&<Action action="set_message_limit" agentId={agent.id} choose={setChange}/>}
                            {billing&&agent.limit_expires_at&&<Action action="clear_message_limit" agentId={agent.id} choose={setChange}/>}</div>
                        </article>;
                    })}</div>
                </section>
                <section className={s.panel}><h2>Onboarding email history</h2>{workspace.emails.length?<ul>{workspace.emails.map(mail=><li key={mail.kind}><strong>{mail.kind==='welcome'?'Welcome':'Setup reminder'}</strong> · {date(mail.created_at)} · {mail.status}{mail.reason&&' · '+mail.reason}<br/>{mail.sender||'Sender unrecorded'} → {mail.recipient||'Recipient unrecorded'} {mail.provider_id&&<a href={'https://resend.com/emails/'+mail.provider_id}>View in Resend</a>}</li>)}</ul>:<p>No onboarding emails recorded.</p>}</section>
                <section className={s.panel}><h2>Access blocks</h2><p className={s.meta}>Blocks apply only to this workspace’s published embeds.</p>
                    {workspace.blocks.length===0?<p>No active blocks.</p>:<ul className={s.results}>{workspace.blocks.map(block=><li key={block.id} className={s.row}>
                        <span>{block.label} · Expires {date(block.expires_at)}</span>{operations&&<button className="button button-outline" type="button" onClick={()=>setChange({action:'remove_block',blockId:block.id})}>Remove block</button>}
                    </li>)}</ul>}
                    {operations&&<div className={s.row}><Action action="block_domain" choose={setChange}/><Action action="block_ip" choose={setChange}/></div>}
                </section>
                <div className={s.grid}><section className={s.panel}><h2>Recent errors</h2>
                    {!workspace.errors.length?<p>No errors recorded in the last 30 days.</p>:<div className={s.tableWrap}><table className={s.table}><thead><tr><th scope="col">Time and request ID</th><th scope="col">Assistant</th><th scope="col">Error</th></tr></thead><tbody>
                    {workspace.errors.map(item=><tr key={item.request_id}><td>{date(item.created_at)}<br/><code>{item.request_id}</code></td><td>{item.assistant}<br/>{item.mode}</td><td>{operationLabel(item.code)}</td></tr>)}</tbody></table></div>}
                </section><section className={s.panel}><h2>Staff audit</h2>
                    {!workspace.audit.length?<p>No staff activity recorded.</p>:<div className={s.tableWrap}><table className={s.table}><thead><tr><th scope="col">Time and staff member</th><th scope="col">Action</th></tr></thead><tbody>
                    {workspace.audit.map((item,index)=><tr key={item.created_at+index}><td>{date(item.created_at)}<br/>{item.actor||'Staff account removed'}</td><td><strong>{operationLabel(item.action)}</strong><br/>{item.reason}
                    {item.before_state!==null||item.after_state!==null?<details><summary>Before and after</summary><pre>{JSON.stringify({before:item.before_state,after:item.after_state},null,2)}</pre></details>:null}</td></tr>)}</tbody></table></div>}
                </section></div>
                {change&&<section className={s.panel+' '+s.confirm} aria-labelledby="change-heading">
                    <h2 ref={changeHeading} tabIndex={-1} id="change-heading">{actions[change.action].label}</h2><p>{ownerContext}</p>
                    <form className={s.form} onSubmit={applyChange}>
                        {change.action==='set_plan'&&<label>Plan<select name="value" required>{workspace.tiers.map(tier=><option key={tier.id} value={tier.id}>{tier.name}</option>)}</select></label>}
                        {change.action==='set_message_limit'&&<label>Daily messages<input name="value" type="number" min={1} max={1000} required/></label>}
                        {change.action.startsWith('block_')&&<label>{change.action==='block_domain'?'Exact domain':'IP address'}<input name="value" required maxLength={253}/></label>}
                        {(['set_plan','set_message_limit','block_domain','block_ip'] as AdminAction[]).includes(change.action)&&<label>Expires in days<input type="number" name="days" min={1} max={365} defaultValue={7} required/></label>}
                        <label>Reason or case reference<textarea name="reason" minLength={3} maxLength={300} required/></label>
                        {actions[change.action].stepUp&&<><p className={s.meta}>Enter a fresh code to authorize this change.</p><FactorSelect staff={staff}/><AuthenticatorCode/></>}
                        <div className={s.row}><button className="button button-primary" disabled={busy}>Confirm change</button><button type="button" className="button button-outline" disabled={busy} onClick={()=>setChange(null)}>Cancel</button></div>
                    </form>
                </section>}
            </>}
            </div></div>
            </div></div>
        </>}
    </div></main>;
}

function Fact({label,children}:{label:string;children:React.ReactNode}){
    return <div><dt>{label}</dt><dd>{children}</dd></div>;
}
function Action({action,agentId,choose}:{action:AdminAction;agentId?:string;choose:(change:Change)=>void}){
    return <button type="button" className="button button-outline" onClick={()=>choose({action,agentId})}>{actions[action].label}</button>;
}
function FactorSelect({staff}:{staff:Staff}){
    if(staff.factors.length===1)return <input type="hidden" name="factorId" value={staff.factors[0].id}/>;
    return <label>Authenticator<select name="factorId" required>{staff.factors.map(factor=><option key={factor.id} value={factor.id}>{factor.name||'Authenticator'}</option>)}</select></label>;
}
function AuthenticatorCode(){
    return <label>Six-digit code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/></label>;
}
