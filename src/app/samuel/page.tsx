import type { Metadata } from 'next';
import Link from 'next/link';
import SamuelWorkspace from './SamuelWorkspace';
import styles from './samuel.module.css';
export const metadata:Metadata={title:'Samuel | Federal Opportunity Research',description:'Metanomic’s private SAM.gov opportunity research workspace.',robots:{index:false,follow:false},alternates:{canonical:'/samuel'}};
export default function SamuelPage(){return <main className={styles.page}>
 <header className={'container '+styles.header}><Link href='/' className={styles.brand}>metanomic<span>.</span></Link><Link href='/' className='navlink'>← Home</Link></header>
 <section className={'container '+styles.intro}><div><p className='eyebrow'>Metanomic / Federal opportunity research</p><h1>Meet <span>Samuel.</span></h1><p className='muted'>Find the opportunity. Understand the fit. Decide what comes next.</p></div><span className={styles.badge}>Private workspace</span></section>
 <SamuelWorkspace/>
 <footer className={'container '+styles.footer}>Independent research tool by Metanomic. Not affiliated with SAM.gov or the U.S. government. Verify requirements and deadlines on the original notice.</footer>
 </main>}
