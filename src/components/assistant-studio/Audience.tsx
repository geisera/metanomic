import {grid} from './Features';
import {copy,heading,questions,section,wrap} from './constants';

export default function Audience(){
  return <section className={wrap+' '+section}>
    <h2 className={heading}>{copy.audienceTitle}</h2>
    <div className={grid+' mt-10'}>{copy.audiences.map(([title,body],i)=><article key={title} className="rounded-2xl bg-white p-6 ring-1 ring-line">
      <h3 className="font-semibold">{title}</h3><p className="mt-2 leading-7 text-slate">{body}</p><p className="mt-4 text-sm italic text-slate">“{questions[i]}”</p>
    </article>)}</div>
  </section>;
}
