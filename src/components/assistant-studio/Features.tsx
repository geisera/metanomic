import {features,heading,section,wrap} from './constants';
export const grid='grid gap-x-8 gap-y-8 md:grid-cols-2 lg:grid-cols-3';

export default function Features(){
  return <section id="features" className={'bg-white '+section}><div className={wrap}>
    <h2 className={heading+' max-w-2xl'}>Everything your site&apos;s support desk needs</h2>
    <dl className={grid+' mt-10'}>{features.map(([title,body,icon])=><div key={title} className="relative pl-17">
      <dt className="font-semibold"><span aria-hidden="true" className="absolute left-0 top-0 grid size-12 place-items-center rounded-xl bg-lime text-lime-ink"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-6"><path d={icon}/></svg></span>{title}</dt>
      <dd className="mt-2 leading-7 text-slate">{body}</dd>
    </div>)}</dl>
  </div></section>;
}
