'use client';
import {track} from '@/lib/navigation-analytics';

export function readMilestone(key:string){
  try{return localStorage.getItem('assistant-studio:'+key);}catch{return null;}
}

export function recordMilestone(key:string,event?:string,start?:string){
  if(readMilestone(key))return;
  const now=Date.now();
  try{localStorage.setItem('assistant-studio:'+key,String(now));}catch{}
  if(event&&start){
    const since=Number(start);
    if(Number.isFinite(since)&&since>0&&since<=now)track(event,{elapsed_ms:String(now-since)});
  }
}
