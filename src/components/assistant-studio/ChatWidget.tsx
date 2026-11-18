import type {FormEvent, ReactNode} from 'react';
export type ChatMessage={role:'user'|'assistant';text:string;source?:{label:string;href:string}};
export function OutlineIcon({path,className='size-6'}:{path:string;className?:string}){
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={path}/></svg>;
}
export function Check(){return <OutlineIcon path="m4.5 12.75 6 6 9-13.5" className="size-5 shrink-0"/>;}
export default function ChatWidget({messages,title,typing=false,onSubmit,height='',logRef}:{messages:ChatMessage[];title:string;typing?:boolean;onSubmit?:(text:string)=>void;height?:string;logRef?:React.Ref<HTMLDivElement>}){
  const send=<OutlineIcon path="M6 12 3 3l18 9-18 9 3-9Zm0 0h15" className="size-5"/>;
  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const text=String(new FormData(e.currentTarget).get('message')??'').trim();
    if(!text||typing)return;
    onSubmit?.(text);
    e.currentTarget.reset();
  }
  function composer(button:ReactNode){return <div className="flex items-center gap-2 rounded-xl bg-mint-2 p-2">{onSubmit?<input name="message" aria-label="Message" placeholder="Ask a question…" className="min-w-0 grow bg-transparent px-2 py-2 text-base placeholder:text-slate" maxLength={400}/>:<span className="grow px-2 text-base text-slate">Ask a question…</span>}{button}</div>;}
  return <div className={'flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-line '+height}>
    <header className="flex items-center gap-3 border-b border-line px-4 py-3">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-night text-lime"><OutlineIcon path="M4 5h16v11H8l-4 4V5Z"/></span>
      <div><p className="font-semibold">{title}</p><p className="flex items-center gap-2 text-sm text-slate"><span aria-hidden="true" className="size-2 rounded-full bg-lime ring-1 ring-slate"/>Online</p></div>
    </header>
    <div ref={logRef} role={onSubmit?'log':undefined} aria-label={onSubmit?'Demo conversation':undefined} tabIndex={onSubmit?0:undefined} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-mint-2 p-4">
      {messages.map((message,i)=>message.role==='user'?<p key={i} className="max-w-[90%] self-end rounded-2xl rounded-br-sm bg-ink px-4 py-2 text-base text-mint">{message.text}</p>:<div key={i} className="max-w-[95%] self-start"><p className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-base text-slate ring-1 ring-line">{message.text}</p>{message.source&&<a className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-medium underline decoration-line underline-offset-2 ring-1 ring-line" href={message.source.href}>{message.source.label}</a>}</div>)}
      {typing&&<span className="self-start rounded-full bg-white px-3 py-1 text-sm text-slate motion-safe:animate-pulse">Typing…</span>}
    </div>
    <div className="p-3">{onSubmit?<form onSubmit={submit}>{composer(<button type="submit" aria-label="Send message" disabled={typing} className="grid size-10 shrink-0 place-items-center rounded-lg bg-lime text-lime-ink disabled:opacity-60">{send}</button>)}</form>:composer(<span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg bg-lime text-lime-ink">{send}</span>)}</div>
  </div>;
}
