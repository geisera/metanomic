import Link from 'next/link';
import {base,copy,heading,section,wrap} from './constants';

const policy = [
  'OpenAI API keys are encrypted before storage.',
  'Chat requests send recent messages, assistant instructions, and selected published knowledge passages to OpenAI.',
  'Owners can unpublish assistants, remove documents, replace or delete keys, and delete their account.',
];

export default function Security(){
  return <section id="security" className={wrap+' '+section}>
    <div className="mx-auto w-full max-w-2xl">
      <h2 className={heading}>{copy.trustTitle}</h2>
      <ul className="mt-6 space-y-4">{policy.map(line=><li key={line} className="flex gap-3 text-slate"><span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-lime text-lime-ink">✓</span>{line}</li>)}</ul>
      <Link href={base+'/privacy'} className="mt-6 inline-block font-semibold underline">Privacy and data handling →</Link>
    </div>
  </section>;
}
