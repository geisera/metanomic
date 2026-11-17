import {runtimeAgent,failure} from '@/lib/studio/server';
import {launcherConfig} from '@/lib/studio/launcher';
import {StudioError} from '@/lib/studio/core';
export const runtime='nodejs';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;const agent=await runtimeAgent(id);
  let origin=req.headers.get('origin')||'';
  if(!origin){try{origin=new URL(req.headers.get('referer')||'').origin;}catch{}}
  if(!agent.origins.includes(origin))throw new StudioError('Embed this assistant on an approved website.',403);
  return Response.json(launcherConfig(agent),{headers:{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Cache-Control':'private, max-age=60','X-Content-Type-Options':'nosniff'}});
 }catch(e){const response=failure(e);response.headers.set('Cache-Control','no-store');return response;}
}
