import {AccountMenu} from '@/components/SiteAccount';
import Link from 'next/link';
import Instructions from '../Instructions';
import {base,copy} from '../content';
import s from '../landing.module.css';
export const metadata={title:copy.auth.docs};
export default function Page(){return <main className={s.site}><div className="container"><header className="flex items-center justify-between"><Link href={base}>{copy.brand}</Link><AccountMenu/></header><h1>{copy.auth.docs}</h1><Instructions/></div></main>;}
