import Link from 'next/link';
import {notFound} from 'next/navigation';
import {signupTerms,studioTerms} from '@/lib/studio/terms';

export const metadata = {title:'Assistant Studio Terms'};
export const dynamic='force-dynamic';
const formerMailingAddress = /^(?:Planned business address\n)?812 North Prince Street\nLancaster, PA 17603\nLancaster County\n*/m;

export default async function TermsPage({searchParams}:{searchParams:Promise<{version?:string}>}){
  const {version}=await searchParams;
  const terms=version===undefined?await signupTerms():await studioTerms(version);
  if(version!==undefined&&!terms) notFound();
  const publicBody=terms?.body.replace(formerMailingAddress, '');
  return <main className="container py-16">
    <h1 className="text-4xl font-semibold tracking-tight">Assistant Studio Terms of Service</h1>
    {terms?<article className="mt-4 max-w-3xl">
      <p className="mb-6">Version {terms.version} · <Link href="/contact" className="underline">Contact Metanomic</Link></p>
      {publicBody!==terms.body&&<p className="mb-4">The mailing address was removed from this public copy.</p>}
      <div className="whitespace-pre-wrap wrap-anywhere">{publicBody}</div>
    </article>:<>
      <p className="mt-4">Contact Metanomic to request the current terms for Assistant Studio.</p>
      <Link href="/contact" className="mt-5 inline-block underline">Contact Metanomic</Link>
    </>}
  </main>;
}
