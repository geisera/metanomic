import {copy,heading,section,wrap} from './constants';
const stats=[['$0','Token markup'],['1 line','Of code to install'],['10 min','To go live'],['24/7','Answers']];

export default function KeyStats(){
  return <section className={'bg-mint-2 '+section}><div className={wrap}>
    <h2 className={heading}>{copy.keyTitle}</h2>
    <dl className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4">{stats.map(([value,label])=><div key={label} className="flex flex-col-reverse rounded-xl bg-white p-4 ring-1 ring-line sm:p-6"><dt className="mt-2 text-sm text-slate">{label}</dt><dd className="text-3xl font-semibold tracking-tight sm:text-4xl">{value}</dd></div>)}</dl>
    <ul className="mt-8 list-disc space-y-2 pl-5 text-slate">{copy.keyBenefits.map(line=><li key={line}>{line}</li>)}</ul>
    {/* Add a verified monthly usage range here when available. */}
    <details className="mt-6"><summary className="cursor-pointer font-semibold">{copy.keyLink}</summary><ol className="my-3 list-decimal space-y-1 pl-5 text-slate">{copy.keyGuide.map(line=><li key={line}>{line}</li>)}</ol><a className="underline" href="https://platform.openai.com/api-keys">{copy.openAI}</a></details>
  </div></section>;
}
