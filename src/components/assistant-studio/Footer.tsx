import ThemeControl from '@/components/ThemeControl';
import Link from 'next/link';
import {base,wrap} from './constants';
const columns=[
  ['Product',[['Features','#features'],['How it works','#how-it-works'],['Pricing','#pricing']]],
  ['Resources',[['Docs',base+'/docs'],['Help',base+'/docs']]],
  ['Company',[['About Metanomic','/#about']]],
  ['Legal',[['Privacy and data handling',base+'/privacy'],['Terms','']]],
] as const;
export default function Footer(){
  return <footer className="bg-night text-muted-2"><div className={wrap+' border-t border-mint/20 py-12'}>
    <div className="grid grid-cols-2 gap-8 md:grid-cols-4">{columns.map(([label,links])=><div key={label}>
      <h2 className="font-semibold text-mint">{label}</h2>
      <ul className="mt-4 space-y-2">{links.map(([name,href])=><li key={name}>{href?<Link href={href} className="hover:text-mint">{name}</Link>:<span>{name}</span>}</li>)}</ul>
    </div>)}</div>
    <div className="studio-footer-bottom mt-8 flex flex-wrap items-center justify-between gap-4"><p className="text-sm">© 2026 Metanomic.</p><ThemeControl/></div>
  </div></footer>;
}
