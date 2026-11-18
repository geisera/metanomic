import {Check,OutlineIcon} from './ChatWidget';
import Link from 'next/link';
import {base,copy,heading,section,wrap} from './constants';

const policy = [
  'OpenAI API keys are encrypted before storage.',
  'Chat requests send recent messages, assistant instructions, and selected published knowledge passages to OpenAI.',
  'Owners can unpublish assistants, remove documents, replace or delete keys, and delete their account.',
];

export default function Security(){
  return <section id="security" className={wrap+' '+section+' grid items-center gap-8 lg:grid-cols-2'}>
    <div>
      <h2 className={heading}>{copy.trustTitle}</h2>
      <p className="mt-4 max-w-xl text-base text-slate">See how Assistant Studio handles your content, API key, and account data.</p>
      <Link href={base+'/privacy'} className="mt-6 inline-block font-semibold underline">Privacy and data handling →</Link>
    </div>
    <div className="rounded-2xl bg-white p-8 ring-1 ring-line"><OutlineIcon className="size-8" path="M12 3 4 6v5c0 5 3 8 8 10 5-2 8-5 8-10V6l-8-3Zm-3 9 2 2 4-4"/>
      <ul className="mt-6 space-y-4">{policy.map(line=><li key={line} className="flex gap-3 text-slate"><span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-lime text-lime-ink"><Check/></span>{line}</li>)}</ul>
    </div>
  </section>;
}
