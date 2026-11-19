import { createHash } from 'node:crypto';
import { sendSupportEmail } from './support-email';
import { accountActions, type Account, type AccountAction, type AccountDirectory } from './admin-contract';
import { requireStaffMfa, verifyStaffMfa, type studioStaff } from './admin';
import { StudioError, text, uuid } from './core';
import { domainName } from './operations';
import { sendAuthLink } from './mail';
import { authFetch, rest } from './server';

type Staff = Awaited<ReturnType<typeof studioStaff>>;

function filter(value: unknown, choices: readonly string[]) {
    return typeof value === 'string' && choices.includes(value) ? value : null;
}

export async function listAccounts(staff: Staff, body: Record<string,unknown>) {
    const actor=staff.session.user.id;
    const page=Number(body.page??1);
    if (!Number.isInteger(page)||page<1||page>4000) throw new StudioError('Choose a valid page.');
    const search=typeof body.query==='string'?body.query.trim().toLowerCase().slice(0,254):'';
    const result=await rest<AccountDirectory|null>('rpc/studio_admin_accounts',{
        admin:true,body:{
            p_actor:actor,p_page:page,
            p_query:(search.startsWith('https://')?domainName(search)||search:search)||null,
            p_tier:filter(body.tier,['starter','pro','enterprise']),
            p_status:filter(body.status,['active','inactive','suspended']),
            p_verified:filter(body.verified,['verified','unverified']),
        },
    });
    if (!result) throw new StudioError('Staff access is required.',403);
    await rest('studio_staff_audit',{admin:true,body:{actor_id:actor,action:'list_accounts',reason:'Account directory'},prefer:'return=minimal'});
    return result;
}

async function getAccount(actor: string, owner: string) {
    const result=await rest<AccountDirectory|null>('rpc/studio_admin_accounts',{admin:true,body:{p_actor:actor,p_owner:owner}});
    const account=result?.accounts[0];
    if (!account) throw new StudioError('Account not found.',404);
    return account;
}

async function audit(actor:string, owner:string, action:string, reason:string, before:unknown, after?:unknown) {
    await rest('studio_staff_audit',{admin:true,body:{
        actor_id:actor,owner_id:owner,action,reason,before_state:before,after_state:after,
    },prefer:'return=minimal'});
}

function boundedInt(value:unknown, max:number, label:string) {
    const result=Number(value);
    if (!Number.isInteger(result)||result<1||result>max) throw new StudioError(label+' must be between 1 and '+max+'.');
    return result;
}

function auditSnapshot(account:Account) {
    return {display_name:account.display_name,email:account.email,verified:!!account.email_confirmed_at,inactive:account.inactive};
}

export async function changeAccount(staff:Staff, action:AccountAction, body:Record<string,unknown>) {
    requireStaffMfa(staff,accountActions[action].role);
    const actor=staff.session.user.id,reason=text(body.reason,300,3);
    if (action==='save_membership_plan'||action==='set_membership') {
        const tier=filter(body.tier,['starter','pro','enterprise']);
        if (!tier) throw new StudioError('Choose a membership plan.');
        const accountId=action==='set_membership'&&uuid(body.ownerId)?body.ownerId:null;
        if (action==='set_membership'&&!accountId) throw new StudioError('Choose an account.');
        const params=accountId?{p_owner:accountId}:{
            p_assistants:boundedInt(body.assistants,10,'Assistants'),
            p_websites:boundedInt(body.websites,10,'Websites per assistant'),
            p_documents:boundedInt(body.documents,20,'Documents per assistant'),
        };
        await verifyStaffMfa(staff,body.factorId,body.code,true);
        await rest('rpc/studio_admin_membership',{admin:true,body:{p_actor:actor,p_reason:reason,p_tier:tier,...params}});
        return accountId?{account:await getAccount(actor,accountId)}:{ok:true};
    }

    if (!uuid(body.ownerId)) throw new StudioError('Choose an account.');
    const owner=body.ownerId;
    const account=await getAccount(actor,owner);
    if (action==='send_account_email') {
        if (body.expectedEmail!==account.email) throw new StudioError('This account’s email changed. Reopen the account before sending.',409);
        const subject=text(body.subject,160,1),message=text(body.message,12000,1);
        if (/[\r\n]/.test(subject)) throw new StudioError('Use a single line for the subject.');
        if (!uuid(body.messageId)) throw new StudioError('Reopen the email composer before sending.');
        if (body.confirmSend!==true) throw new StudioError('Confirm the recipient and message before sending.');
        await verifyStaffMfa(staff,body.factorId,body.code,true);
        const sendId=createHash('sha256').update(actor+':'+owner+':'+body.messageId).digest('hex');
        const details={recipient:account.email,subject,send_id:sendId};
        await audit(actor,owner,'send_account_email_requested',reason,null,details);
        let emailId:string;
        try {
            emailId=await sendSupportEmail(account.email,subject,message,sendId,actor);
        } catch(error) {
            await audit(actor,owner,'send_account_email_unconfirmed',reason,null,details);
            throw error;
        }
        await audit(actor,owner,'send_account_email',reason,null,{...details,email_id:emailId,status:'accepted'});
        return {account};
    }
    if (account.is_staff) throw new StudioError('Use the staff identity tools for changes to a staff account.',403);

    const patch:Record<string,unknown>={};
    let revoke=action==='revoke_account_sessions'||action==='deactivate_account';
    if (action==='update_account') {
        if (body.expectedEmail!==account.email||body.expectedName!==account.display_name)
            throw new StudioError('This profile changed since you opened it. Reopen the account and try again.',409);
        const email=text(body.email,254,3).toLowerCase();
        const name=text(body.displayName,80,0);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new StudioError('Enter a valid email address.');
        if (name!==account.display_name) patch.user_metadata={display_name:name};
        if (email!==account.email) {
            if (body.confirmOwnership!==true) throw new StudioError('Confirm you verified the replacement address with the account owner.');
            patch.email=email;
            patch.email_confirm=true;
            revoke=true;
        }
        if (!Object.keys(patch).length) throw new StudioError('Change the profile before saving.');
    } else if (action==='activate_account'||action==='deactivate_account') {
        patch.ban_duration=action==='deactivate_account'?'876000h':'none';
    } else if (action==='verify_account_email') {
        if (body.confirmOwnership!==true||body.expectedEmail!==account.email)
            throw new StudioError('Confirm ownership of the current email for this account.');
        if (account.email_confirmed_at) throw new StudioError('This email is already verified.');
        patch.email_confirm=true;
    } else if (action==='reset_account_password'&&(account.inactive||!account.email_confirmed_at)) {
        throw new StudioError('Activate the account and verify its email before sending a password reset.');
    }

    await verifyStaffMfa(staff,body.factorId,body.code,true);
    const before=auditSnapshot(account);
    // Auth changes cross service boundaries. Record the request before calling Auth or sending mail.
    await audit(actor,owner,action+'_requested',reason,before);
    let revoked:number|undefined;
    try {
        if (Object.keys(patch).length) {
            const auth=await authFetch('admin/users/'+owner,patch,undefined,true,'PUT');
            if (!auth.ok) {
                const error=await auth.json().catch(()=>null);
                throw error?.error_code==='email_exists' ? new StudioError('That email is already used by another account.',409)
                    : new StudioError('Authentication did not confirm the account change. Refresh the account before retrying.',503);
            }
        }
        if (revoke) {
            revoked=await rest<number>('rpc/studio_admin_revoke_sessions',{admin:true,body:{p_actor:actor,p_owner:owner}})
                .catch(()=>{throw new StudioError('The account change may have applied, but existing sessions could not be revoked. Reopen the account and use Sign out all devices.',503);});
        }
        if (action==='reset_account_password') await sendAuthLink(account.email,'recovery');
    } catch (error) {
        await audit(actor,owner,action+'_incomplete',reason,before).catch(()=>{console.error('Studio account audit completion failed');});
        throw error;
    }
    const updated=await getAccount(actor,owner);
    await audit(actor,owner,action,reason,before,{...auditSnapshot(updated),sessions_revoked:revoked});
    return {account:updated};
}
