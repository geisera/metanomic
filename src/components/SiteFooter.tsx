'use client';
import TheiaLink from '@/components/TheiaLink';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import type {ReactNode} from 'react';

const embeddedFooters=['/assistant-studio/login','/assistant-studio/signup','/signup','/assistant-studio/account','/assistant-studio/dashboard'];
export default function SiteFooter({global=false,className='',children,leave}:{global?:boolean;className?:string;children?:ReactNode;leave?:()=>boolean}){
 const path=usePathname();
 if(global&&embeddedFooters.includes(path))return null;
 const links=[['/','Metanomic home'],['/assistant-studio','Assistant Studio'],['/terms','Terms'],['/privacy','Privacy'],['/contact','Contact']];
 if(path.startsWith('/admin/'))links.unshift(['/admin','Operations']);
 return <footer className={'siteFooter '+className}><span>© {new Date().getFullYear()} Metanomic</span><nav aria-label="Footer navigation">{(path==='/'||path==='/enterprise-ai-stack')&&<><Link href="/#services">Services</Link><TheiaLink source="footer">Try Theia</TheiaLink></>}{links.map(([href,label])=><Link key={href} href={href} onClick={e=>{if(leave&&!leave())e.preventDefault();}}>{label}</Link>)}</nav>{children}</footer>;
}
