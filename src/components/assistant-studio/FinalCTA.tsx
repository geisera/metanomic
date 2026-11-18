import StudioMock from './StudioMock';
import {Action} from '@/app/assistant-studio/LandingActions';
import {base,copy,heading,primary,section,wrap} from './constants';
export default function FinalCTA(){
  return <section className="overflow-hidden bg-night text-mint">
    <div className={wrap+' '+section+' grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'}>
      <div><h2 className={heading}>{copy.finalTitle}</h2>
        <div className="mt-8 flex flex-wrap gap-4">
          <Action href={base+'/signup'} event="final_cta_click" detail={{variant:'primary'}} className={primary}>{copy.hero.action}</Action>
          <Action href="#demo" event="final_cta_click" detail={{variant:'secondary'}} className="inline-flex min-h-11 items-center rounded-lg px-5 font-semibold text-mint ring-1 ring-inset ring-mint/30 hover:bg-night-2">{copy.hero.demo}</Action>
        </div>
      </div>
      <div className="relative min-w-0"><div aria-hidden="true" className="absolute inset-6 bg-lime/20 blur-3xl"/><div className="relative lg:w-[950px]"><StudioMock decorative/></div></div>
    </div>
  </section>;
}
