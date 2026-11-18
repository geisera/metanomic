'use client';
import {useEffect,useRef,useState} from 'react';
import {track} from '@/lib/navigation-analytics';
import ChatWidget,{type ChatMessage} from './ChatWidget';
import {copy,heading,section,wrap} from './constants';

const sources=[{label:'Assistant Studio pricing',href:'#pricing'},{label:'Supported content types',href:'#faq-formats'},{label:'Installation guide',href:'#how-it-works'}];
function exchange(index:number):ChatMessage[]{
  const [question,answer]=copy.demo.questions[index];
  return [{role:'user',text:question},{role:'assistant',text:answer,source:sources[index]}];
}
export default function DemoSection(){
  const [messages,setMessages]=useState(()=>exchange(0));
  const [typing,setTyping]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const log=useRef<HTMLDivElement>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  useEffect(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight;},[messages,typing]);

  function ask(question:string,index:number,starter=false){
    if(timer.current)return;
    track('demo_interaction',{kind:starter?'starter_question':'message_sent',...(starter?{question}:{})});
    setMessages(prev=>[...prev,{role:'user',text:question}]);
    setTyping(true);
    timer.current=setTimeout(()=>{
      const answer:ChatMessage=index>=0?exchange(index)[1]:{role:'assistant',text:'This sample demo answers the suggested questions. See the FAQ for more about Assistant Studio.',source:{label:'Frequently asked questions',href:'#studio-faq'}};
      setMessages(prev=>[...prev,answer]);setTyping(false);timer.current=null;
    },600);
  }

  return <section id="demo" className={'bg-white '+section}><div className={wrap+' grid min-w-0 items-center gap-10 lg:grid-cols-2'}>
    <div><h2 className={heading}>{copy.demo.title}</h2><p className="mt-4 text-base leading-7 text-slate">Choose a starter question to see a sample answer and its source.</p>
      <div className="mt-6 grid gap-3">{copy.demo.questions.map(([question],i)=><button type="button" key={question} disabled={typing} onClick={()=>ask(question,i,true)} className="min-h-14 rounded-xl bg-mint-2 px-4 py-3 text-left text-base font-semibold ring-1 ring-line hover:ring-lime disabled:opacity-70">{question} <span className="float-right" aria-hidden="true">→</span></button>)}</div>
    </div>
    <ChatWidget title={copy.brand} messages={messages} typing={typing} logRef={log} height="h-[480px]" onSubmit={text=>ask(text,copy.demo.questions.findIndex(([q])=>q.toLowerCase().replace(/[?!.]+$/,'')===text.toLowerCase().replace(/[?!.]+$/,'')))}/>
  </div></section>;
}
