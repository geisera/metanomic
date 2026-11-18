import {Check,OutlineIcon} from './ChatWidget';
import {copy,heading,section,wrap} from './constants';
const stats=[['$0','Token markup'],['1 line','Of code to install'],['10 min','To go live'],['24/7','Answers']];

export default function KeyStats(){
  return <section className={'bg-night text-mint '+section}><div className={wrap}>
    <h2 className={heading}>{copy.keyTitle}</h2>
    <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden bg-night-2 sm:grid-cols-4">{stats.map(([value,label])=><div key={label} className="flex flex-col-reverse bg-night px-3 py-5 sm:px-6"><dt className="mt-2 text-base text-muted-2">{label}</dt><dd className="text-5xl font-semibold tracking-tight text-lime">{value}</dd></div>)}</dl>
    <ul className="mt-8 grid gap-5 md:grid-cols-3">{copy.keyBenefits.map(line=><li key={line} className="flex gap-3 text-base"><span className="text-lime"><Check/></span>{line}</li>)}</ul>
    <details className="studio-disclosure group mt-8 rounded-xl bg-night-2 px-5">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-semibold">{copy.keyLink}<OutlineIcon path="m6 9 6 6 6-6" className="size-5 shrink-0 group-open:rotate-180 motion-safe:transition-transform"/></summary>
      <div className="pb-5 text-muted-2"><ol className="my-3 space-y-2">{copy.keyGuide.map(line=><li key={line}>{line}</li>)}</ol><a className="underline" href="https://platform.openai.com/api-keys">{copy.openAI}</a></div>
    </details>
  </div></section>;
}
