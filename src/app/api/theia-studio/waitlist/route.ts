import {parseBody,sameOrigin} from '@/lib/knowledge-server';
import {failure,gate,ipOf,rest} from '@/lib/studio/server';
import {StudioError} from '@/lib/studio/core';

export const runtime='nodejs';

export async function POST(request:Request){
  try {
    if(!sameOrigin(request)) throw new StudioError('Request origin not allowed.',403);
    const body=await parseBody(request,1024);
    const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';
    if(body?.plan!=='pro'||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      throw new StudioError('Enter a valid work email.',400);
    }

    await gate('studio-waitlist:'+ipOf(request),5,900);
    await rest('studio_pro_waitlist?on_conflict=email',{
      admin:true,
      body:{email},
      prefer:'resolution=ignore-duplicates,return=minimal',
    });
    return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    return failure(error);
  }
}
