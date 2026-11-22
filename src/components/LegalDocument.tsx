import Link from 'next/link';
import {notFound} from 'next/navigation';
import {currentPolicy,studioTerms,type PolicyKind} from '@/lib/studio/terms';

export default async function LegalDocument({kind,version}:{kind:PolicyKind;version?:string}) {
 const doc=kind==='terms'&&version!==undefined?await studioTerms(version):await currentPolicy(kind);
 if(!doc)notFound();
 const body=doc.body.replace(/^(?:Planned business address\n)?812 North Prince Street\nLancaster, PA 17603\nLancaster County\n*/m,'');
 const title=kind==='terms'?'Terms of Service':'Privacy Policy';
 return <main className="container py-12"><article className="mx-auto max-w-3xl rounded-2xl border border-current/15 bg-[var(--background)]/85 p-6 leading-relaxed backdrop-blur-sm sm:p-10">
 <Link href="/" className="navlink">← Metanomic home</Link><h1 className="my-5 text-4xl font-semibold">{title}</h1>
 <p className="muted text-sm">{'published_at' in doc?'Published '+new Date(String(doc.published_at)).toLocaleDateString('en-US',{timeZone:'America/New_York',dateStyle:'long'}):'Version '+doc.version}</p>
 {body.split(/\n\s*\n/).map((paragraph,i)=>/^\d+\. [^\n]+$/.test(paragraph)?<h2 className="mt-8 text-xl font-semibold" key={i}>{paragraph}</h2>:<p className="mt-4 whitespace-pre-line break-words" key={i}>{paragraph.split(/(https?:\/\/[^\s)]+|\/contact\b)/g).map((part,j)=>part==='/contact'||/^https?:/.test(part)?<a key={j} className="underline" href={part}>{part}</a>:part)}</p>)}
 <Link href="/contact" className="mt-8 inline-block underline">Contact Metanomic</Link></article></main>;
}
