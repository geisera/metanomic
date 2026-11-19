'use client';

import {useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {accountActions,type Account,type AccountAction,type AccountDirectory,type StaffRole} from '@/lib/studio/admin-contract';
import s from './operations.module.css';

type Filters={query:string;tier:string;status:string;verified:string;page:number};
type Request=<T>(body?:object,endpoint?:string)=>Promise<T>;
const initial:Filters={query:'',tier:'',status:'',verified:'',page:1};
const date=(value:string|null)=>value?new Date(value).toLocaleString():'Never';
const pageSize=25;
type Props={
    roles:StaffRole[];
    reauth:ReactNode;
    request:Request;
    onOpenWorkspace:(ownerId:string)=>void;
    clearWorkspace:()=>void;
    workspaceBusy:boolean;
    workspaceRevision:number;
    onSessionChange:()=>Promise<void>;
};

export default function Accounts({roles,reauth,request,onOpenWorkspace,clearWorkspace,workspaceBusy,workspaceRevision,onSessionChange}:Props){
    const [fields,setFields]=useState(initial);
    const [filter,setFilter]=useState(initial);
    const [directory,setDirectory]=useState<AccountDirectory|null>(null);
    const [selected,setSelected]=useState<Account|null>(null);
    const [action,setAction]=useState<AccountAction|null>(null);
    const [messageId,setMessageId]=useState('');
    const [plan,setPlan]=useState('pro');
    const [busy,setBusy]=useState(false);
    const [notice,setNotice]=useState('');
    const [error,setError]=useState('');
    const [revision,refresh]=useState(0);
    const accountHeading=useRef<HTMLHeadingElement>(null);
    const actionHeading=useRef<HTMLHeadingElement>(null);
    const selectedOwner=selected?.owner_id;
    useEffect(()=>{if(selectedOwner)accountHeading.current?.focus();},[selectedOwner]);
    useEffect(()=>{if(action)actionHeading.current?.focus();},[action]);
    const plans=directory?.tiers??[];
    const operations=roles.includes('operations');
    const billing=roles.includes('billing');
    const currentPlan=plans.find(tier=>tier.id===plan);

    useEffect(()=>{
        let current=true;
        void request<AccountDirectory>({action:'accounts',...filter}).then(result=>{
            if(current)setDirectory(result);
        }).catch(async (cause:Error&{status?:number})=>{
            if(!current)return;
            setError(cause.message);
            if(cause.status===401||cause.status===403)await onSessionChange();
        });
        return ()=>{current=false;};
    },[filter,request,revision,workspaceRevision,onSessionChange]);

    function search(event:FormEvent<HTMLFormElement>){
        event.preventDefault();
        setError('');setNotice('');setDirectory(null);
        setFilter({...fields,page:1});
    }
    function move(page:number){
        setDirectory(null);setFilter({...filter,page});
    }
    function show(account:Account){
        clearWorkspace();
        setSelected(account);setAction(null);setNotice('');setError('');
    }
    async function save(event:FormEvent<HTMLFormElement>){
        event.preventDefault();
        if(!action||busy)return;
        const form=event.currentTarget;
        const values=Object.fromEntries(new FormData(form));
        setBusy(true);setError('');setNotice('');
        try{
            const result=await request<{account?:Account}>({
                ...values,action,ownerId:selected?.owner_id,
                expectedEmail:selected?.email,expectedName:selected?.display_name,
                messageId,confirmSend:values.confirmSend==='on',
                confirmOwnership:values.confirmOwnership==='on',
            });
            if(result.account){clearWorkspace();setSelected(result.account);}
            setAction(null);
            setNotice(action==='send_account_email'?'Email accepted for delivery.':action==='reset_account_password'?'Password reset requested.':accountActions[action].label+' completed.');
            refresh(value=>value+1);
        }catch(cause){
            const problem=cause as Error&{status?:number;code?:string};
            setError(problem.message);
            if(problem.status===401||problem.code==='mfa_required')await onSessionChange();
        }finally{
            setBusy(false);
        }
    }

    const activeAccountActions:AccountAction[]=selected&&!selected.is_staff&&operations?[
        'update_account',selected.inactive?'activate_account':'deactivate_account',
        ...(!selected.email_confirmed_at?['verify_account_email'] as const:[]),
        ...(selected.email_confirmed_at&&!selected.inactive?['reset_account_password'] as const:[]),
        'revoke_account_sessions',
    ]:[];
    if(selected&&roles.includes('support'))activeAccountActions.push('send_account_email');
    if(selected&&billing)activeAccountActions.push('set_membership');

    return <section className={s.panel} aria-labelledby="accounts-heading">
        <h2 id="accounts-heading">Accounts</h2>
        <p className={s.meta}>Search and select an account to review its profile, membership, and sign-in status.</p>
        <form onSubmit={search} className={s.form}>
            <label>Search accounts<input value={fields.query} onChange={event=>setFields({...fields,query:event.target.value})} autoComplete="off" maxLength={254} placeholder="Email, name, domain, account ID, or assistant ID"/></label>
            <div className={s.row}>
                <label>Membership<select value={fields.tier} onChange={event=>setFields({...fields,tier:event.target.value})}><option value="">All plans</option>{plans.map(tier=><option key={tier.id} value={tier.id}>{tier.name}</option>)}</select></label>
                <label>Account status<select value={fields.status} onChange={event=>setFields({...fields,status:event.target.value})}><option value="">Any status</option><option value="active">Sign-in active</option><option value="inactive">Sign-in inactive</option><option value="suspended">Workspace suspended</option></select></label>
                <label>Email verification<select value={fields.verified} onChange={event=>setFields({...fields,verified:event.target.value})}><option value="">Any verification status</option><option value="verified">Verified</option><option value="unverified">Unverified</option></select></label>
                <button type="submit" className="button button-primary">Apply filters</button>
                <button type="button" className="button button-outline" disabled={busy||workspaceBusy} onClick={()=>{setFields(initial);setFilter({...initial});setSelected(null);setAction(null);setMessageId('');clearWorkspace();setError('');setNotice('');setDirectory(null);}}>Clear</button>
            </div>
        </form>
        {error&&<p role="alert" className={s.message} data-error="true">{error}</p>}
        {notice&&<p role="status" className={s.message}>{notice}</p>}
        {directory===null&&!error&&<p role="status">Loading accounts…</p>}
        {directory&&<>
            <p className={s.meta} role="status">{directory.count} matching {directory.count===1?'account':'accounts'}</p>
            {directory.accounts.length?<div className={s.tableWrap}><table className={s.table}>
                <thead><tr><th scope="col">Account</th><th scope="col">Membership</th><th scope="col">Status</th><th scope="col">Last sign-in</th><th scope="col">Select</th></tr></thead>
                <tbody>{directory.accounts.map(account=><tr key={account.owner_id}>
                    <td><strong>{account.display_name||account.email}</strong>{account.display_name&&<><br/>{account.email}</>}<br/><span className={s.meta}>{account.email_confirmed_at?'Verified email':'Email unverified'}</span></td>
                    <td>{plans.find(tier=>tier.id===account.tier_id)?.name||account.tier_id}{account.effective_tier!==account.tier_id&&<><br/><span className={s.meta}>Effective plan {account.effective_tier}</span></>}</td>
                    <td>{account.inactive?'Inactive':'Active'}{account.suspended&&<><br/>Workspace suspended</>}{account.is_staff&&<><br/>Staff</>}</td>
                    <td>{date(account.last_sign_in_at)}</td>
                    <td><button className="button button-outline" type="button" aria-label={'Select '+account.email} aria-pressed={selected?.owner_id===account.owner_id} disabled={workspaceBusy||busy} onClick={()=>show(account)}>Select</button></td>
                </tr>)}</tbody>
            </table></div>:<p>{directory.count?'No accounts on this page.':'No accounts match these filters.'}</p>}
            {(filter.page>1||directory.count>pageSize)&&<div className={s.row}>
                <button className="button button-outline" type="button" disabled={filter.page<=1} onClick={()=>move(filter.page-1)}>Previous</button>
                <p className={s.meta}>Page {filter.page} of {Math.max(1,Math.ceil(directory.count/pageSize))}</p>
                <button className="button button-outline" type="button" disabled={filter.page*pageSize>=directory.count} onClick={()=>move(filter.page+1)}>Next</button>
            </div>}
        </>}
        {billing&&<div><button type="button" className="button button-outline" onClick={()=>{setError('');setAction('save_membership_plan');}}>Configure membership plans</button></div>}
        {selected&&<section className={s.panel} aria-labelledby="selected-account">
            <h3 id="selected-account" ref={accountHeading} tabIndex={-1}>{selected.display_name||selected.email}</h3>
            <dl className={s.facts}>
                <div><dt>Email</dt><dd>{selected.email}</dd></div>
                <div><dt>Account ID</dt><dd>{selected.owner_id}</dd></div>
                <div><dt>Created</dt><dd>{date(selected.created_at)}</dd></div>
                <div><dt>Email verified</dt><dd>{date(selected.email_confirmed_at)}</dd></div>
                <div><dt>Sign-in</dt><dd>{selected.inactive?'Inactive':'Active'}</dd></div>
                <div><dt>Membership</dt><dd>{plans.find(tier=>tier.id===selected.tier_id)?.name||selected.tier_id}</dd></div>
            </dl>
            {selected.is_staff&&<p className={s.meta}>Staff sign-in and identity are managed separately.</p>}
            <div className={s.row}>
                {activeAccountActions.map(id=><button type="button" className="button button-outline" key={id} disabled={busy} onClick={()=>{setError('');if(id==='send_account_email')setMessageId(crypto.randomUUID());setAction(id);}}>{accountActions[id].label}</button>)}
                <button type="button" className="button button-outline" disabled={workspaceBusy||busy} onClick={()=>onOpenWorkspace(selected.owner_id)}>Open workspace</button>
            </div>
        </section>}
        {action&&<section className={s.panel} aria-labelledby="account-action">
            <h3 id="account-action" ref={actionHeading} tabIndex={-1}>{accountActions[action].label}</h3>
            {action==='deactivate_account'&&<p>Blocks sign-in and ends existing sessions. To stop published embeds, suspend the workspace separately.</p>}
            {action==='reset_account_password'&&<p>Sends a reset link to {selected?.email}.</p>}
            {action==='revoke_account_sessions'&&<p>Ends existing sessions. The account holder can sign in again.</p>}
            <form key={action+selected?.owner_id} onSubmit={save} className={s.form}>
                {action==='send_account_email'&&selected&&<>
                    <p>To <strong>{selected.email}</strong></p>
                    <label>Subject<input name="subject" maxLength={160} required/></label>
                    <label>Message<textarea name="message" rows={10} maxLength={12000} required/></label>
                    <label className={s.check}><input name="confirmSend" type="checkbox" required/>I reviewed the recipient and message and am ready to send.</label>
                </>}
                {action==='update_account'&&selected&&<>
                    <label>Display name<input name="displayName" defaultValue={selected.display_name} maxLength={80}/></label>
                    <label>Email address<input name="email" type="email" defaultValue={selected.email} maxLength={254} required/></label>
                </>}
                {(action==='update_account'||action==='verify_account_email')&&<label className={s.check}><input name="confirmOwnership" type="checkbox" required={action==='verify_account_email'}/> {action==='update_account'?'If I changed the address, I verified the replacement address with the account owner.':'I verified this address with the account owner.'}</label>}
                {action==='set_membership'&&selected&&<><label>Membership<select name="tier" defaultValue={selected.tier_id} required>{plans.map(tier=><option key={tier.id} value={tier.id}>{tier.name}</option>)}</select></label><p className={s.meta}>Sets the base membership. An active override still applies until it expires or is cleared.</p></>}
                {action==='save_membership_plan'&&<>
                    <p>These limits apply to all accounts on the selected plan. A plan becomes selectable as soon as you save its limits.</p>
                    <label>Plan<select name="tier" value={plan} onChange={event=>setPlan(event.target.value)}><option value="starter">Starter</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select></label>
                    <div key={plan} className={s.row}><label>Assistants<input type="number" name="assistants" min={1} max={10} defaultValue={currentPlan?.assistants} required/></label><label>Websites per assistant<input type="number" name="websites" min={1} max={10} defaultValue={currentPlan?.websites} required/></label><label>Documents per assistant<input type="number" name="documents" min={1} max={20} defaultValue={currentPlan?.documents} required/></label></div>
                </>}
                <label>Reason or case reference<textarea name="reason" minLength={3} maxLength={300} required/></label>
                {reauth}
                <div className={s.row}><button type="submit" className="button button-primary" disabled={busy}>{action==='send_account_email'?'Send email':'Confirm change'}</button><button type="button" className="button button-outline" disabled={busy} onClick={()=>setAction(null)}>Cancel</button></div>
            </form>
        </section>}
    </section>;
}
