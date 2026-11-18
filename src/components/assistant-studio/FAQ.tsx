import {copy,faq,heading,section,wrap} from './constants';
export default function FAQ(){
  return <section className={wrap+' '+section}>
    <h2 className={heading}>{copy.faqTitle}</h2>
    <dl className="mt-10 divide-y divide-line">{faq.map(({id,q,a})=><div key={id} className="py-6 first:pt-0 last:pb-0 lg:grid lg:grid-cols-12 lg:gap-8">
      <dt className="font-semibold lg:col-span-5">{q}</dt><dd className="mt-2 leading-7 text-slate lg:col-span-7 lg:mt-0">{a}</dd>
    </div>)}</dl>
  </section>;
}
