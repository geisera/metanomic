import {HeroActions} from '@/components/SiteAccount';
import {BoltIcon,BookOpenIcon,CheckCircleIcon,ClockIcon,CodeBracketIcon,CurrencyDollarIcon,DocumentIcon,DocumentTextIcon,KeyIcon,PaperAirplaneIcon} from '@heroicons/react/24/outline';
import StudioWidgets from './StudioWidgets';
import {starterBillingConfig} from '@/lib/studio/starter-billing';
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
  {title:'No code required',body:'If you can copy and paste, you can install it. No developer, no plugins.',icon: CodeBracketIcon},
  {title:'Knows your business',body:'Answers draw on the knowledge you add from your pages, docs, and FAQs.',icon: BookOpenIcon},
  {title:'Live in 10 minutes',body:'Sign up, add your content, paste one line. Your site is answering questions.',icon: BoltIcon},
  {title:'Answers 24/7',body:'Customers get answers at night, on weekends, and on holidays.',icon: ClockIcon},
  {title:'Shows its sources',body:'Answers can cite your knowledge documents and link to public source pages you provide.',icon: CheckCircleIcon},
  {title:'No markup on usage',body:'Bring your OpenAI key and pay OpenAI directly, at cost.',icon: CurrencyDollarIcon},
];

const features = [
  {
    name: 'Answer from your own content',
    description:
      'Add your FAQs, policies, and product docs so your assistant can answer common customer questions using the information you provide.',
    href: '/assistant-studio/docs',
    icon: DocumentTextIcon,
  },
  {
    name: 'Install with one line of code',
    description:
      'Preview your assistant in Studio, then paste one script tag into a website that supports custom code. Metanomic handles the hosting.',
    href: '/assistant-studio/docs',
    icon: CodeBracketIcon,
  },
  {
    name: 'Bring your own OpenAI key',
    description:
      'Connect your OpenAI API key and pay OpenAI directly for model usage. Metanomic encrypts your saved key and adds no token markup.',
    href: '/assistant-studio/privacy',
    icon: KeyIcon,
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
            <p className={(m.source?s.bot+' rounded-bl-sm':s.user+' rounded-br-sm')+' max-w-[88%] rounded-2xl px-3.5 py-2.5 text-lg leading-7'}>{m.text}</p>
            {m.source&&<span className={s.source+' mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium'}>
              <DocumentIcon className="size-3.5"/>
              {m.source}
            </span>}
          </li>)}
        </ol>
        <div className={s.inputBar+' p-3'}>
          <div className={s.input+' flex items-center gap-2 rounded-xl p-1.5 pl-3'}>
            <span className="grow text-lg">Ask a question…</span>
            <span className={s.send+' grid size-9 shrink-0 place-items-center rounded-lg'}><PaperAirplaneIcon className="size-5"/></span>
          </div>
        </div>
      </div>
    </div>
  </figure>;
}

export default function Page(){
  const starterTrial=Boolean(starterBillingConfig());
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
                <b.icon className="size-6"/>
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
            <a href={SIGNUP} className={s.cta+' mt-8 w-full sm:w-auto'}>{starterTrial?'Start free trial':'Create your free assistant'}</a>
          </div>
        </div>
      </section>
    </main>


    <StudioWidgets/>
  </div>;
}
