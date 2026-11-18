import Image from 'next/image';
import {dashboardImage,heading,section,wrap} from './constants';
const steps=[['Connect','Add your OpenAI API key.'],['Train','Upload or paste your pages, docs, and FAQs.'],['Embed','Paste one line of code on your site.']];

export default function HowItWorks(){
  return <section id="how-it-works" className={'bg-mint-2 '+section}><div className={wrap+' grid items-center gap-12 lg:grid-cols-2'}>
    <div><p className="mb-4 inline-flex rounded-full bg-lime px-3 py-1 text-sm font-semibold text-lime-ink">Live in 10 minutes</p>
      <h2 className={heading}>Three steps. No developer required.</h2>
      <dl className="mt-8 space-y-5">{steps.map(([title,body])=><div key={title}><dt className="font-semibold">{title}</dt><dd className="mt-1 text-slate">{body}</dd></div>)}</dl>
    </div>
    <Image {...dashboardImage} alt={dashboardImage.alt} sizes="(max-width: 1023px) 100vw, 50vw" className="rounded-xl shadow-xl ring-1 ring-line"/>
  </div></section>;
}
