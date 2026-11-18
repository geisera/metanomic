import Link from 'next/link';
import {notFound} from 'next/navigation';
import {signupTerms,studioTerms} from '@/lib/studio/terms';

export const metadata = {title:'Assistant Studio Terms'};
export const dynamic='force-dynamic';

export default async function TermsPage({searchParams}:{searchParams:Promise<{version?:string}>}){
  const {version}=await searchParams;
  const terms=version===undefined?await signupTerms():await studioTerms(version);
  if(version!==undefined&&!terms) notFound();
  return <main className="container py-16">
    <h1 className="text-4xl font-semibold tracking-tight">Assistant Studio Terms of Service</h1>
    {terms?<article className="mt-4 max-w-3xl">
      <p className="mb-6">Version {terms.version}</p>
      <div className="whitespace-pre-wrap wrap-anywhere">{terms.body}</div>
    </article>:<>
      <p className="mt-4">Contact Metanomic to request the current terms for Assistant Studio.</p>
      <Link href="/contact" className="mt-5 inline-block underline">Contact Metanomic</Link>
    </>}
  </main>;
}
