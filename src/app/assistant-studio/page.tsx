import type {Metadata} from 'next';
import Link from 'next/link';
import {base,copy} from './content';
import {Action,Demo,FAQAccordion,Header,SessionRedirect,StepList} from './LandingActions';
import s from './landing.module.css';

const canonical='https://metanomic.ai'+base;
export const metadata:Metadata={
  title:{absolute:copy.title},description:copy.description,alternates:{canonical},robots:{index:true,follow:true},
  openGraph:{title:copy.title,description:copy.description,url:canonical,type:'website'},
  twitter:{card:'summary',title:copy.title,description:copy.description},
};

function Hero(){
  return <section className={s.hero}><div><h1>{copy.hero.headline}</h1><p className={s.lead}>{copy.hero.body}</p>
    <div className={s.actions}><Action href={base+'/signup'} event="hero_cta_click" detail={{variant:'primary'}} className={s.primary}>{copy.hero.action}</Action><Action href="#demo" event="hero_cta_click" detail={{variant:'secondary'}} className={s.secondary}>{copy.hero.demo}</Action></div><small>{copy.free}</small>
  </div><figure className={s.browser}><figcaption><span aria-hidden>● ● ●</span> {copy.mock.site}</figcaption><div className={s.mockChat}><strong>{copy.mock.assistant}</strong><p className={s.question}>{copy.mock.question}</p><p>{copy.mock.answer} <a href="#sample-policy">{copy.mock.source}</a></p></div><p id="sample-policy">{copy.mock.policy}</p></figure></section>;
}

function FeatureCard({title,body}:{title:string;body:string}){return <article className={s.panel}><h3>{title}</h3><p>{body}</p></article>;}

function PricingTable(){
  return <div className={s.tableScroll} tabIndex={0} role="region" aria-label={copy.pricingTitle}><table><thead><tr>{copy.pricingHeaders.map(header=><th scope="col" key={header}>{header}</th>)}</tr></thead><tbody>{copy.tiers.map(([tier,...values],i)=><tr key={tier}><th scope="row">{tier}</th>{values.slice(0,-1).map((value,j)=><td key={j}>{value}</td>)}<td><Action href={i?'/contact':base+'/signup'} event="pricing_cta_click" detail={{tier}} className={i?s.secondary:s.primary}>{values.at(-1)}</Action></td></tr>)}</tbody></table></div>;
}

function CTABand(){return <section className={s.band}><h2>{copy.finalTitle}</h2><Action href={base+'/signup'} event="final_cta_click" className={s.primary}>{copy.hero.action}</Action></section>;}

export default function Page(){
  const faqData={'@context':'https://schema.org','@type':'FAQPage',mainEntity:copy.faq.map(({q,a})=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))};
  return <div className={s.site}><SessionRedirect/><Header/><main className="container">
    <Hero/>
    <section id="demo"><h2>{copy.demo.title}</h2><Demo/></section>
    <section id="how-it-works"><h2>{copy.stepsTitle}</h2><StepList/></section>
    <section id="features"><h2>{copy.featuresTitle}</h2><div className={s.cards}>{copy.features.map(([title,body])=><FeatureCard key={title} title={title} body={body}/>)}</div></section>
    <section><h2>{copy.audienceTitle}</h2><div className={s.cards}>{copy.audiences.map(([title,body])=><FeatureCard key={title} title={title} body={body}/>)}</div></section>
    <section><h2>{copy.keyTitle}</h2><ul>{copy.keyBenefits.map(text=><li key={text}>{text}</li>)}</ul><p>{copy.usage}</p><details><summary>{copy.keyLink}</summary><ol>{copy.keyGuide.map(text=><li key={text}>{text}</li>)}</ol><a href="https://platform.openai.com/api-keys">{copy.openAI}</a></details></section>
    <section id="pricing"><h2>{copy.pricingTitle}</h2><p>{copy.pricingNotice}</p><PricingTable/></section>
    <section id="security"><h2>{copy.trustTitle}</h2><p>{copy.logoPlaceholder}</p><div className={s.cards}>{copy.testimonials.map((text,i)=><blockquote className={s.panel} key={i}>{text}</blockquote>)}</div><ul>{copy.security.map(text=><li key={text}>{text}</li>)}</ul><Link href={base+'/privacy'}>Privacy and data handling</Link></section>
    <section><h2>{copy.faqTitle}</h2><FAQAccordion/></section>
    <CTABand/>
  </main><footer className={'container '+s.footer}>{copy.footer.map(([title,links])=><div key={title}><h2>{title}</h2>{links.map(([label,href])=>href?<Link key={label} href={href}>{label}</Link>:<span key={label}>{label} · {copy.unavailable}</span>)}</div>)}<p>{copy.attribution}</p></footer>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqData).replace(/</g,'\\u003c')}}/>
  </div>;
}
