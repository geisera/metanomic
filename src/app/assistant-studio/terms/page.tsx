import Link from 'next/link';

export const metadata = {title:'Assistant Studio Terms'};

export default function TermsPage(){
  return <main className="container py-16">
    <h1 className="text-4xl font-semibold tracking-tight">Assistant Studio Terms</h1>
    <p className="mt-4">Contact Metanomic to request the current terms for Assistant Studio.</p>
    <Link href="/contact" className="mt-5 inline-block underline">Contact Metanomic</Link>
  </main>;
}
