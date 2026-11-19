import { fingerprint } from '@/lib/studio/crypto';
import { uuid } from '@/lib/studio/core';
import { rest,session } from '@/lib/studio/server';
import { redirect } from 'next/navigation';
type Params={account?:string;signature?:string;saved?:string};
async function owner(params:Params){
 if(params.account && uuid(params.account) && fingerprint('email-preferences:'+params.account)===params.signature)return params.account;
 return (await session()).user.id;
}
async function save(params:Params,form:FormData){
 'use server';
 const account_id=await owner(params);
 await rest('studio_email_preferences?on_conflict=account_id',{admin:true,body:{account_id,setup_tips:form.has('tips'),product_updates:form.has('products')},prefer:'resolution=merge-duplicates,return=minimal'});
 const query=new URLSearchParams({saved:'1'});
 if(params.account && params.signature){query.set('account',params.account);query.set('signature',params.signature);}
 redirect('/assistant-studio/email-preferences?'+query);
}
export default async function Page({searchParams}:{searchParams:Promise<Params>}){
 const params=await searchParams;
 const id=await owner(params);
 const [prefs]=await rest<{setup_tips:boolean;product_updates:boolean}[]>('studio_email_preferences?account_id=eq.'+id,{admin:true});
 return <main className="mx-auto max-w-xl p-8"><h1>Email preferences</h1><form action={save.bind(null,params)} className="grid gap-4 py-6"><label><input type="checkbox" name="tips" defaultChecked={prefs?.setup_tips??true}/> Assistant setup tips</label><label><input type="checkbox" name="products" defaultChecked={prefs?.product_updates??false}/> Product news and upgrades</label><button className="button button-primary">Save preferences</button>{params.saved&&<p role="status">Preferences saved.</p>}</form></main>;
}
