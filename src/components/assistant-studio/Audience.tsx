import {copy,heading,questions,section,wrap} from './constants';

export default function Audience(){
  return <section className={wrap+' '+section}>
    <h2 className={heading}>{copy.audienceTitle}</h2>
    <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">{copy.audiences.map(([title,body],i)=><article key={title} className="flex min-w-0 flex-col rounded-2xl border border-line bg-white p-5 hover:border-lime">
      <h3 className="font-semibold">{title}</h3><p className="mt-2 leading-7 text-slate">{body}</p><div className="mt-auto pt-4"><p className="rounded-2xl bg-mint-2 px-4 py-2 text-base text-slate">“{questions[i]}”</p></div>
    </article>)}</div>
  </section>;
}
