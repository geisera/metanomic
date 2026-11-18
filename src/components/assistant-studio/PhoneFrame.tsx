import ChatWidget,{type ChatMessage} from './ChatWidget';
import {copy} from './constants';

export const storefrontMessages:ChatMessage[]=[
  {role:'user',text:copy.mock.question},
  {role:'assistant',text:copy.mock.answer,source:{label:copy.mock.source,href:'#sample-policy'}},
];

export default function PhoneFrame(){
  return <figure aria-label="Example storefront chat" className="relative mx-auto w-full max-w-[23rem]">
    <div aria-hidden="true" className="absolute inset-x-3 inset-y-12 rounded-full bg-lime/30 blur-3xl"/>
    <div className="relative rounded-[2.5rem] bg-night p-3 shadow-2xl sm:-rotate-3">
      <div className="relative isolate overflow-hidden rounded-[1.9rem] bg-mint-2 pb-4 pt-8">
        <div aria-hidden="true" className="absolute left-1/2 top-2 z-10 h-3 w-24 -translate-x-1/2 rounded-full bg-night"/>
        <div className="px-5 pb-19 pt-3">
          <figcaption className="font-semibold">{copy.mock.site}</figcaption>
          <div aria-hidden="true" className="mt-3 grid grid-cols-3 gap-2 blur-[2px]">{[0,1,2].map(n=><div key={n} className="h-20 rounded-xl bg-white ring-1 ring-line"><div className="mx-auto mt-2 h-10 w-3/4 rounded bg-lime/40"/><div className="mx-auto mt-2 h-1 w-1/2 rounded bg-line"/></div>)}</div>
        </div>
        <div className="relative -mt-14 ml-auto mr-3 w-[calc(100%-1.75rem)]"><ChatWidget title={copy.mock.assistant} messages={storefrontMessages}/></div>
      </div>
    </div>
    <p id="sample-policy" className="relative mt-6 scroll-mt-24 text-sm leading-6 text-slate">{copy.mock.policy}</p>
  </figure>;
}
