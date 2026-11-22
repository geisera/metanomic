import LegalDocument from '@/components/LegalDocument';
export const dynamic='force-dynamic';
export const metadata={title:'Terms of Service'};
export default async function Page({searchParams}:{searchParams:Promise<{version?:string}>}) {return <LegalDocument kind="terms" version={(await searchParams).version}/>;}
