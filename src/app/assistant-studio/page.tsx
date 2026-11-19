import {HeroActions} from '@/components/SiteAccount';
import StudioWidgets from './StudioWidgets';
import Pricing from './Pricing';
import PrimaryNav from '@/components/PrimaryNav';
import type {Metadata} from 'next';
import s from './minimal.module.css';

const title='Assistant Studio: AI Website Chatbot Trained on Your Content | Metanomic';
const description='Train a chatbot on your pages, docs, and FAQs. Add it to your site with one line of code. Free to start.';
const canonical='https://metanomic.ai/assistant-studio';
export const metadata:Metadata={
  title:{absolute:title},description,alternates:{canonical},robots:{index:true,follow:true},
  referrer:'strict-origin',
  openGraph:{title,description,url:canonical,type:'website'},
  twitter:{card:'summary',title,description},
};

const SIGNUP='/assistant-studio/signup';

const messages=[
  {text:'Can I return an unopened order?'},
  {text:'Yes. Unopened items can be returned within 30 days of delivery.',source:'Return policy'},
  {text:'Do you ship to Canada?'},
  {text:'We do. Canadian orders arrive in 5–8 business days.',source:'Shipping FAQ'},
];

const benefits=[
  {title:'No code required',body:'If you can copy and paste, you can install it. No developer, no plugins.',icon:'M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5'},
  {title:'Knows your business',body:'Answers draw on the knowledge you add from your pages, docs, and FAQs.',icon:'M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25'},
  {title:'Live in 10 minutes',body:'Sign up, add your content, paste one line. Your site is answering questions.',icon:'m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z'},
  {title:'Answers 24/7',body:'Customers get answers at night, on weekends, and on holidays.',icon:'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'},
  {title:'Shows its sources',body:'Answers can cite your knowledge documents and link to public source pages you provide.',icon:'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'},
  {title:'No markup on usage',body:'Bring your OpenAI key and pay OpenAI directly, at cost.',icon:'M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'},
];

const features = [
  {
    name: 'Answer from your own content',
    description:
      'Add your FAQs, policies, and product docs so your assistant can answer common customer questions using the information you provide.',
    href: '/assistant-studio/docs',
    icon: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7m-7 4h7',
  },
  {
    name: 'Install with one line of code',
    description:
      'Preview your assistant in Studio, then paste one script tag into a website that supports custom code. Metanomic handles the hosting.',
    href: '/assistant-studio/docs',
    icon: 'm17.25 6.75 5.25 5.25-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5',
  },
  {
    name: 'Bring your own OpenAI key',
    description:
      'Connect your OpenAI API key and pay OpenAI directly for model usage. Metanomic encrypts your saved key and adds no token markup.',
    href: '/assistant-studio/privacy',
    icon: 'M15.75 5.25a4.5 4.5 0 0 0-4.39 5.49L3 19.1V21h3v-2.25h2.25V16.5h2.25l2.76-2.76a4.5 4.5 0 1 0 2.49-8.49Zm2.25 4.5h.008v.008H18V9.75Z',
  },
];



function SampleChat(){
  return <figure className="relative mx-auto w-full min-w-0 max-w-[22rem]">
    <figcaption className="sr-only">Illustration: a store assistant answers questions about returns and shipping and cites its sources.</figcaption>
    <div aria-hidden="true" className={s.glow+' pointer-events-none absolute -inset-6 rounded-full blur-3xl'}/>
    <div aria-hidden="true" className={s.phone+' relative lg:-rotate-2'}>
      <div className={s.screen}>
        <div className={s.bar+' pt-2'}>
          <div className={s.notch+' mx-auto h-1.5 w-14 rounded-full'}/>
          <div className="flex items-center gap-3 px-4 py-3">
            <span className={s.online+' size-2.5 shrink-0 rounded-full'}/>
            <p className="font-semibold">Store assistant</p>
            <p className={s.fg3+' ml-auto text-sm'}>Online</p>
          </div>
        </div>
        <ol className="grid min-h-[19rem] content-start gap-3 p-4">
          {messages.map(m=><li key={m.text} className={s.message+' flex flex-col '+(m.source?'items-start':'items-end')}>
            <p className={(m.source?s.bot+' rounded-bl-sm':s.user+' rounded-br-sm')+' max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-5'}>{m.text}</p>
            {m.source&&<span className={s.source+' mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/></svg>
              {m.source}
            </span>}
          </li>)}
        </ol>
        <div className={s.inputBar+' p-3'}>
          <div className={s.input+' flex items-center gap-2 rounded-xl p-1.5 pl-3'}>
            <span className="grow text-sm">Ask a question…</span>
            <span className={s.send+' grid size-9 shrink-0 place-items-center rounded-lg'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="size-5"><path d="m5 12-2-8 18 8-18 8 2-8Zm0 0h16"/></svg></span>
          </div>
        </div>
      </div>
    </div>
  </figure>;
}

export default function Page(){
  return <div data-studio-landing className={s.page+' min-h-screen font-[family-name:var(--font-geist)]'}>
    <PrimaryNav studio/>

    <main>
      <section className="container relative grid min-h-[min(83vh,820px)] items-center gap-14 py-20 md:py-28 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:py-36">
        <div className="min-w-0">
          <span className="pill">Assistant Studio</span>
          <h1 className="mt-8 max-w-[790px] text-balance text-[clamp(2.75rem,6vw,6rem)] font-semibold leading-[1.02] tracking-[-.075em]">A chatbot that really knows <span className={s.heroAccent}>your business.</span></h1>
          <p className={s.fg2+' mt-8 max-w-[550px] text-[17px] leading-[1.85]'}>Upload your pages, docs, and FAQs. Paste one line of code. Your site answers customer questions 24/7, from your own content.</p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <HeroActions/>
          </div>
          <p className={s.fg3+' mt-4 text-sm'}>Free to start · No credit card required · Live in 10 minutes</p>
        </div>
        <SampleChat/>
      </section>

      <section aria-labelledby="benefits" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <p className={s.eyebrow}>Why Assistant Studio</p>
          <h2 id="benefits" className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Give your customers the answers they need, 24/7.
          </h2>
        </div>
      
        <ul role="list" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {benefits.map(b => (
            <li key={b.title} className={s.card + ' flex gap-4 p-5 sm:block sm:p-7'}>
              <span className={s.icon + ' inline-grid size-11 shrink-0 place-items-center rounded-xl'}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-6">
                  <path d={b.icon} />
                </svg>
              </span>
              <div>
                <h3 className="text-lg font-semibold sm:mt-5">{b.title}</h3>
                <p className={s.fg2 + ' mt-1 leading-7 sm:mt-2'}>{b.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Pricing/>

      <section aria-labelledby="final-cta" className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
        <div className={s.band+' px-6 py-16 text-center sm:px-12 sm:py-20'}>
          <div className="relative">
            <h2 id="final-cta" className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Your AI assistant can be live in 10 minutes.</h2>
            <p className={s.bandSub+' mt-4 text-lg'}>Free to start. No credit card required.</p>
            <a href={SIGNUP} className={s.cta+' mt-8 w-full sm:w-auto'}>Create your free assistant</a>
          </div>
        </div>
      </section>
    </main>

    <footer className={s.footer}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-5 py-4 text-sm sm:px-8">
        <p>© 2026 Metanomic</p>
        <nav aria-label="Legal" className="flex gap-6">
          <a href="/assistant-studio/privacy" className="inline-flex min-h-11 items-center">Privacy</a>
          <a href="/assistant-studio/terms" className="inline-flex min-h-11 items-center">Terms</a>
        </nav>
      </div>
    </footer>
    <StudioWidgets/>
  </div>;
}
