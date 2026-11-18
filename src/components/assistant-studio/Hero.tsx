import {Action} from '@/app/assistant-studio/LandingActions';
import {base,copy,primary,section,wrap} from './constants';

export default function Hero(){
  return <section className={wrap+' '+section+' space-y-12'}>
    <div className="mx-auto max-w-3xl text-center">
      <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-tight sm:text-7xl">{copy.hero.headline}</h1>
      <p className="mx-auto mt-8 max-w-2xl text-pretty text-lg leading-8 text-slate">{copy.hero.body}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
        <Action href={base+'/signup'} event="hero_cta_click" detail={{variant:'primary'}} className={primary}>{copy.hero.action}</Action>
        <Action href="#demo" event="hero_cta_click" detail={{variant:'secondary'}} className="font-semibold underline-offset-4 hover:underline">{copy.hero.demo} →</Action>
      </div>
      <p className="mt-4 text-sm text-slate">{copy.free}</p>
    </div>
    <figure aria-label="Example storefront chat showing a return-policy answer and its source" className="mx-auto w-full max-w-5xl rounded-2xl bg-night p-2.5 shadow-xl ring-1 ring-line sm:p-4">
      <div className="rounded-xl bg-white px-5 pb-7 pt-4">
        <div aria-hidden="true" className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-line"/>
        <figcaption className="border-b border-line pb-4 text-sm font-semibold text-slate">{copy.mock.site}</figcaption>
        <div className="mx-auto mt-6 max-w-xl rounded-2xl bg-mint-2 p-4">
          <strong>{copy.mock.assistant}</strong>
          <p className="ml-4 mt-4 rounded-xl bg-night-2 p-3 text-sm text-mint">{copy.mock.question}</p>
          <p className="mt-3 rounded-xl bg-white p-3 text-sm leading-6 text-slate">{copy.mock.answer}</p>
          <a href="#sample-policy" className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-sm font-semibold underline ring-1 ring-line">{copy.mock.source}</a>
        </div>
        <p id="sample-policy" className="mx-auto mt-4 max-w-xl scroll-mt-24 text-sm leading-5 text-slate">{copy.mock.policy}</p>
      </div>
    </figure>
  </section>;
}
