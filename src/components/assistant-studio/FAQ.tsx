'use client';
import {track} from '@/lib/navigation-analytics';
import {copy,faq,heading,section,wrap} from './constants';

export default function FAQ(){
  return <section className={wrap+' '+section}>
    <h2 className={heading}>{copy.faqTitle}</h2>
    <div className="mt-10 grid gap-x-10 lg:grid-cols-2">{faq.map(({id,q,a})=><details key={id} className="group border-b border-line py-4" onToggle={e=>{if(e.currentTarget.open)track('faq_expand',{question_id:id});}}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded font-semibold">
        {q}<span aria-hidden="true" className="group-open:hidden">+</span><span aria-hidden="true" className="hidden group-open:inline">−</span>
      </summary>
      <p className="pb-3 pt-2 leading-7 text-slate">{a}</p>
    </details>)}</div>
  </section>;
}
