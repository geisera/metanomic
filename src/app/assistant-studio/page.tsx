import type {Metadata} from 'next';
import {SessionRedirect} from './LandingActions';
import Audience from '@/components/assistant-studio/Audience';
import DemoSection from '@/components/assistant-studio/DemoSection';
import FAQ from '@/components/assistant-studio/FAQ';
import Features from '@/components/assistant-studio/Features';
import FinalCTA from '@/components/assistant-studio/FinalCTA';
import Footer from '@/components/assistant-studio/Footer';
import Header from '@/components/assistant-studio/Header';
import Hero from '@/components/assistant-studio/Hero';
import HowItWorks from '@/components/assistant-studio/HowItWorks';
import KeyStats from '@/components/assistant-studio/KeyStats';
import Pricing from '@/components/assistant-studio/Pricing';
import Security from '@/components/assistant-studio/Security';
import {base,copy,faq} from '@/components/assistant-studio/constants';

const canonical='https://metanomic.ai'+base;
export const metadata:Metadata={
  title:{absolute:copy.title},description:copy.description,alternates:{canonical},robots:{index:true,follow:true},
  openGraph:{title:copy.title,description:copy.description,url:canonical,type:'website'},
  twitter:{card:'summary',title:copy.title,description:copy.description},
};

export default function Page(){
  const faqData={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(({q,a})=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))};
  return <div data-studio-landing className="min-h-screen bg-mint font-[family-name:var(--font-geist)] text-ink [&_:is(a,button,input,summary):focus-visible]:outline-2 [&_:is(a,button,input,summary):focus-visible]:outline-offset-2 [&_:is(a,button,input,summary):focus-visible]:outline-current">
    <SessionRedirect/>
    <Header/>
    <main>
      <Hero/>
      <DemoSection/>
      <HowItWorks/>
      <Features/>
      <Audience/>
      <KeyStats/>
      <Security/>
      <Pricing/>
      <FAQ/>
      <FinalCTA/>
    </main>
    <Footer/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqData).replace(/</g,'\\u003c')}}/>
  </div>;
}
