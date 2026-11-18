import {heading,section,wrap} from './constants';
const steps=[['Connect','Add your OpenAI API key.'],['Train','Upload or paste your pages, docs, and FAQs.'],['Embed','Paste one line of code on your site.']];

export default function HowItWorks(){
  return <section id="how-it-works" className={'bg-mint-2 '+section}><div className={wrap+''}>
    <div className="mx-auto max-w-2xl text-center"><p className="mb-4 inline-flex rounded-full bg-lime px-3 py-1 text-sm font-semibold text-lime-ink">Live in 10 minutes</p>
      <h2 className={heading}>Three steps. No developer required.</h2></div>
      <dl className="mt-10 grid gap-8 md:grid-cols-3">{steps.map(([title,body],i)=><div className="relative pl-14" key={title}><dt className="font-semibold"><span aria-hidden="true" className="absolute left-0 top-0 grid size-10 place-items-center rounded-lg bg-lime text-lime-ink">{i+1}</span>{title}</dt><dd className="mt-1 text-slate">{body}</dd></div>)}</dl>
  </div></section>;
}
