import ChatWidget from './ChatWidget';
import {storefrontMessages} from './PhoneFrame';
import {copy} from './constants';

const tabs=['Assistants','Knowledge','Appearance','Embed','Usage'];
export default function StudioMock({decorative=false}:{decorative?:boolean}){
  return <div className="overflow-hidden rounded-2xl bg-white text-ink shadow-2xl ring-1 ring-line" inert={decorative} aria-hidden={decorative||undefined}>
    <div className="flex items-center gap-3 border-b border-line bg-mint-2 px-4 py-3">
      <div aria-hidden="true" className="flex gap-1.5">{[0,1,2].map(i=><span key={i} className="size-2 rounded-full bg-slate opacity-40"/>)}</div>
      <p className="mx-auto truncate rounded-md bg-white px-4 py-1 text-sm text-slate ring-1 ring-line">studio.metanomic.ai</p>
    </div>
    <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,.9fr)] lg:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]">
      <ul aria-label="Illustrated Studio navigation" className="col-span-full flex flex-wrap gap-2 border-b border-line bg-mint-2 p-3 lg:col-span-1 lg:block lg:space-y-2 lg:border-b-0 lg:border-r">
        {tabs.map(tab=><li key={tab} className={'rounded-lg px-2.5 py-1.5 text-base '+(tab==='Knowledge'?'bg-lime font-semibold text-lime-ink':'text-slate')}>{tab}</li>)}
      </ul>
      <div className="min-w-0 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">Knowledge document</p><span className="rounded-full bg-lime px-2.5 py-1 text-sm font-semibold text-lime-ink">Published</span></div>
        <div className="mt-4 min-h-36 rounded-xl bg-mint-2 p-4 text-base leading-7 text-slate ring-1 ring-line">
          <p className="font-semibold">Sample store policy</p><p className="mt-2">{copy.mock.policy}</p><p className="mt-2">Shipping options and delivery estimates appear at checkout.</p>
        </div>
      </div>
      <div className="min-w-0 border-t border-line bg-mint-2 p-4 md:border-l md:border-t-0">
        <p className="mb-3 font-semibold">Live preview</p><ChatWidget title={copy.mock.assistant} messages={storefrontMessages}/>
      </div>
    </div>
  </div>;
}
