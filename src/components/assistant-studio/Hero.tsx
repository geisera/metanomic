import PhoneFrame from './PhoneFrame';
import {Action} from '@/app/assistant-studio/LandingActions';
import {base,copy,primary,section,wrap} from './constants';

export default function Hero(){
  return <section className={wrap+' '+section+' grid items-center gap-12 lg:grid-cols-2'}>
    <div className="text-left">
      <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">{copy.hero.headline}</h1>
      <p className="mt-8 max-w-2xl text-pretty text-lg leading-8 text-slate sm:text-xl">{copy.hero.body}</p>
      <div className="mt-8 flex flex-wrap items-center gap-5">
        <Action href={base+'/signup'} event="hero_cta_click" detail={{variant:'primary'}} className={primary}>{copy.hero.action}</Action>
        <Action href="#demo" event="hero_cta_click" detail={{variant:'secondary'}} className="font-semibold underline-offset-4 hover:underline">{copy.hero.demo} →</Action>
      </div>
      <p className="mt-4 text-sm text-slate">{copy.free}</p>
    </div>
    <PhoneFrame/>
  </section>;
}
