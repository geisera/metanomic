import type {Metadata} from 'next';
import s from './minimal.module.css';

const title='Assistant Studio: AI Website Chatbot Trained on Your Content | Metanomic';
const description='Train a chatbot on your pages, docs, and FAQs. Add it to your site with one line of code. Free to start.';
const canonical='https://metanomic.ai/assistant-studio';
export const metadata:Metadata={
  title:{absolute:title},description,alternates:{canonical},robots:{index:true,follow:true},
  openGraph:{title,description,url:canonical,type:'website'},
  twitter:{card:'summary',title,description},
};

const messages=[
  {text:'Can I return an unopened order?'},
  {text:'Yes. Unopened items can be returned within 30 days of delivery.',source:'Return policy'},
  {text:'Do you ship to Canada?'},
  {text:'We do. Canadian orders arrive in 5–8 business days.',source:'Shipping FAQ'},
];

function Signup({className=''}:{className?:string}){
  return <a href="/signup" className={'inline-flex min-h-11 items-center justify-center rounded-lg bg-lime px-6 py-3.5 text-center text-base font-semibold text-lime-ink hover:brightness-95 '+className}>Create your assistant</a>;
}

function SampleChat(){
  return <figure className="relative mx-auto w-full min-w-0 max-w-sm">
    <figcaption className="sr-only">Illustration of a store assistant answering questions about returns and shipping, with sources.</figcaption>
    <div aria-hidden="true" className="pointer-events-none absolute inset-5 rounded-full bg-lime/30 blur-3xl"/>
    <div aria-hidden="true" className="relative rounded-[2.5rem] bg-night p-3 shadow-2xl lg:-rotate-2">
      <div className="overflow-hidden rounded-[1.85rem] bg-mint text-ink">
        <div className="bg-white pt-2">
          <div className="mx-auto h-1.5 w-14 rounded-full bg-night"/>
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className="size-2.5 shrink-0 rounded-full bg-lime ring-1 ring-ink/30"/>
            <p className="font-semibold">Store assistant</p>
            <p className={s.caption+' ml-auto text-sm'}>Online</p>
          </div>
        </div>
        <ol className="grid gap-3 p-4">
          {messages.map(message=><li key={message.text} className={s.message+' flex flex-col '+(message.source?'items-start':'items-end')}>
            <p className={'max-w-[94%] rounded-2xl px-3 py-2 text-sm leading-5 '+(message.source?'rounded-bl-sm bg-white text-ink ring-1 ring-line':'rounded-br-sm bg-ink text-mint')}>{message.text}</p>
            {message.source&&<span className="mt-1.5 rounded-full bg-mint-2 px-2 py-1 text-xs text-slate">📄 {message.source}</span>}
          </li>)}
        </ol>
        <div className="border-t border-line bg-white p-3">
          <div className="flex items-center gap-2 rounded-xl bg-mint-2 p-2">
            <span className={s.caption+' grow px-2 text-sm'}>Ask a question…</span>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-lime text-lime-ink"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" className="size-5"><path d="m5 12-2-8 18 8-18 8 2-8Zm0 0h16"/></svg></span>
          </div>
        </div>
      </div>
    </div>
  </figure>;
}

export default function Page(){
  return <div data-studio-landing className={s.page+' min-h-screen bg-mint font-[family-name:var(--font-geist)] text-ink'}>
    <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-4 sm:px-8">
      <span className="font-semibold">Assistant Studio</span>
      <nav aria-label="Account" className="flex flex-wrap items-center gap-3 sm:gap-5">
        <a href="/assistant-studio/login" className="inline-flex min-h-11 items-center font-medium text-slate hover:underline">Sign in</a>
        <Signup className="!px-3 !py-2 !text-sm sm:!px-4"/>
      </nav>
    </header>
    <main>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 sm:py-16 lg:min-h-[90vh] lg:grid-cols-2 lg:gap-16">
        <div>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-6xl lg:text-7xl">A website chatbot that actually knows your business.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate sm:text-xl">Upload your pages, docs, and FAQs. Paste one line of code. Your site answers customer questions 24/7, from your own content.</p>
          <Signup className="mt-8 w-full sm:w-auto"/>
          <p className={s.caption+' mt-4 text-sm'}>Free to start · No credit card required · Live in 10 minutes</p>
        </div>
        <SampleChat/>
      </section>
      <section className="bg-night px-5 py-20 text-center text-mint sm:py-24">
        <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Your assistant can be live in 10 minutes.</h2>
        <p className="mt-5 text-lg text-muted">Free to start. No credit card required.</p>
        <Signup className="mt-7"/>
      </section>
    </main>
    <footer className="border-t border-night-2 bg-night text-muted">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 px-5 py-4 sm:px-8">
        <p>© 2026 Metanomic</p>
        <nav aria-label="Legal" className="flex gap-5">
          <a href="/assistant-studio/privacy" className="inline-flex min-h-11 items-center hover:text-mint">Privacy</a>
          <a href="/assistant-studio/terms" className="inline-flex min-h-11 items-center hover:text-mint">Terms</a>
        </nav>
      </div>
    </footer>
  </div>;
}
