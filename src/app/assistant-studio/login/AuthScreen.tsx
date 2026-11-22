import SiteFooter from '@/components/SiteFooter';
import {signupTerms} from '@/lib/studio/terms';
import Link from 'next/link';
import { headers } from 'next/headers';
import {starterBillingConfig} from '@/lib/studio/starter-billing';
import { loginDestinationName, loginRedirect } from '@/lib/studio/login-destination';
import { Icon } from './form-controls';
import LoginForm from './LoginForm';
import s from './login.module.css';

const benefits = [
  'Answer customer questions around the clock.',
  'Use your own FAQs, policies, and product docs.',
  'Give visitors links to the sources behind answers.',
];

export default async function AuthScreen({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [query, requestHeaders] = await Promise.all([searchParams, headers()]);
  const host = requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') === 'http' ? 'http:' : 'https:';
  const origin = host ? protocol + '//' + host : 'https://metanomic.ai';
  const redirect = loginRedirect(query.redirect, origin);
  const minutes = Number(process.env.STUDIO_MAGIC_LINK_TTL_MINUTES);
  const expiresIn = Number.isInteger(minutes) && minutes > 0 ? minutes : 60;

  return <div className={s.page}>
    <header className={s.header}>
      <div className={s.headerInner}>
        <Link className={s.brand} href="/assistant-studio">
          <span>Assistant Studio</span><small>by Metanomic.ai</small>
        </Link>
      </div>
    </header>
    <main className={s.main}>
      <LoginForm redirect={redirect} destination={redirect ? loginDestinationName(redirect) : null}
        setupAccount={query.next === 'account'} expiresIn={expiresIn}
        termsVersion={(await signupTerms()).version}
        starterTrial={Boolean(starterBillingConfig())}
        showOAuthPlaceholders={process.env.STUDIO_OAUTH_PLACEHOLDERS === 'true'} />
      <aside className={s.value} aria-labelledby="studio-login-value">
        <h2 id="studio-login-value">An AI chatbot for your website</h2>
        <ul>
          {benefits.map(benefit => <li key={benefit}><span className={s.check}><Icon name="check" size={15} /></span>{benefit}</li>)}
        </ul>
      </aside>
    </main>
    <SiteFooter className={s.footer}/>
  </div>;
}
