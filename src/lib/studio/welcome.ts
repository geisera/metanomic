import {rest} from './server';
import {sendLifecycle} from './lifecycle';
export async function sendStudioWelcome(accountId:string,email:string) {
 const mode=process.env.STUDIO_WELCOME_MODE;
 if(mode!=='enabled' && !(mode==='test' && email===process.env.STUDIO_WELCOME_TEST_EMAIL)) return;
 const claims=await rest<unknown[]>('studio_welcome_emails?on_conflict=account_id',{admin:true,body:{account_id:accountId},prefer:'resolution=ignore-duplicates,return=representation'});
 if(claims.length) await sendLifecycle(accountId,email,'welcome');
}
