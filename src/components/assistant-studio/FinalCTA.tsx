import Image from 'next/image';
import {Action} from '@/app/assistant-studio/LandingActions';
import {base,copy,dashboardImage,heading,primary,section,wrap} from './constants';
export default function FinalCTA(){
  return <section className="overflow-hidden bg-night text-mint">
    <div className={wrap+' '+section+' grid items-center gap-10 lg:grid-cols-2'}>
      <div><h2 className={heading}>{copy.finalTitle}</h2>
        <div className="mt-8 flex flex-wrap gap-4">
          <Action href={base+'/signup'} event="final_cta_click" detail={{variant:'primary'}} className={primary}>{copy.hero.action}</Action>
          <Action href="#demo" event="final_cta_click" detail={{variant:'secondary'}} className="inline-flex min-h-11 items-center rounded-lg px-5 font-semibold text-mint ring-1 ring-inset ring-mint/30 hover:bg-night-2">{copy.hero.demo}</Action>
        </div>
      </div>
      <Image {...dashboardImage} alt={dashboardImage.alt} sizes="(max-width: 1023px) 100vw, 65vw" className="rounded-xl ring-1 ring-mint/30 lg:w-[145%] lg:max-w-none"/>
    </div>
  </section>;
}
