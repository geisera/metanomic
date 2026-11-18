import Link from 'next/link';
import {base,copy,heading,section,wrap} from './constants';

export default function Security({testimonial}:{testimonial?:{quote:string;attribution:string}}){
  return <section id="security" className={wrap+' '+section+' grid items-center gap-8 '+(testimonial?'md:grid-cols-2':'')}>
    {/* Reserved for approved customer logos and additional testimonials. */}
    {testimonial&&<figure className="rounded-2xl bg-mint-2 p-8 ring-1 ring-line"><blockquote className="text-xl">{testimonial.quote}</blockquote><figcaption className="mt-4 text-slate">{testimonial.attribution}</figcaption></figure>}
    <div className={testimonial?'':'mx-auto w-full max-w-2xl'}>
      <h2 className={heading}>{copy.trustTitle}</h2>
      <ul className="mt-6 space-y-4">{copy.security.map(line=><li key={line} className="flex gap-3 text-slate"><span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-lime text-lime-ink">✓</span>{line}</li>)}</ul>
      <Link href={base+'/privacy'} className="mt-6 inline-block font-semibold underline">Privacy and data handling →</Link>
    </div>
  </section>;
}
