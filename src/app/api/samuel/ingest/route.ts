import {timingSafeEqual} from 'node:crypto';
import {ingestExtract} from '@/lib/samuel/extract-ingest';
// Scheduled refresh of the SAM.gov extract store. Invoked by Vercel Cron (see vercel.json),
// which sends "Authorization: Bearer $CRON_SECRET". Add ?force=1 to reload an unchanged
// file or to accept a file that the shrink guard rejected.
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
function authorized(request:Request){
 const secret=process.env.CRON_SECRET?.trim();
 if(!secret)return null;
 const given=Buffer.from(request.headers.get('authorization')||''),expected=Buffer.from('Bearer '+secret);
 return given.length===expected.length&&timingSafeEqual(given,expected);
}
export async function GET(request:Request){
 const ok=authorized(request);
 if(ok===null)return json({error:'CRON_SECRET is not configured.'},503);
 if(!ok)return json({error:'Unauthorized.'},401);
 const started=Date.now();
 try{
  const result=await ingestExtract({force:new URL(request.url).searchParams.get('force')==='1',deadline:started+235000});
  console.info('Samuel extract ingest',JSON.stringify(result));
  return json(result);
 }catch(e){
  const error=e instanceof Error?e.message:'Unknown error';
  console.error('Samuel extract ingest failed',JSON.stringify({error,durationMs:Date.now()-started}));
  return json({status:'failed',error},500);
 }
}
