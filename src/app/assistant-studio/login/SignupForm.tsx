'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { track } from '@/lib/navigation-analytics';
import { copy } from '../content';
import { call } from '../ui';
import { Button, Icon, Input } from './form-controls';
import s from './login.module.css';

export default function SignupForm({ email, setEmail, termsVersion, loginHref, onSignIn }: {
  email: string;
  setEmail: (email: string) => void;
  termsVersion?: string;
  loginHref: string;
  onSignIn: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [length, setLength] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);

  useEffect(() => { track('signup_start', {}); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    pending.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await call('auth', {
        action: 'signup',
        email: fields.get('email'),
        password: fields.get('password'),
        ...(termsVersion && { termsVersion, acceptedTerms: fields.get('accept-terms') === 'on' }),
      });
      setNotice(result.message);
      const password = form.elements.namedItem('password') as HTMLInputElement;
      password.value = '';
      setLength(0);
      setShowPassword(false);
    } catch (error) {
      setError(error instanceof Error && !(error instanceof TypeError)
        ? error.message : 'We couldn’t connect. Check your connection and try again.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <>
    <form className={s.form} aria-labelledby="studio-login-title" onSubmit={submit}>
      <label htmlFor="studio-signup-email">Work email</label>
      <Input id="studio-signup-email" name="email" type="email" required maxLength={254}
        autoComplete="email" inputMode="email" autoCapitalize="off" spellCheck={false}
        placeholder="you@company.com" value={email} readOnly={busy}
        onChange={event => setEmail(event.currentTarget.value)} aria-describedby="studio-signup-email-note" />
      <p id="studio-signup-email-note" className={s.signupHint}>We’ll send a verification link here.</p>
      <label htmlFor="studio-signup-password">Password</label>
      <div className={s.passwordRow}>
        <Input id="studio-signup-password" name="password" type={showPassword ? 'text' : 'password'} required
          minLength={12} maxLength={128} autoComplete="new-password" readOnly={busy}
          onChange={event => setLength(event.currentTarget.value.length)} aria-describedby="studio-signup-password-note" />
        <button type="button" className={s.showPassword} aria-controls="studio-signup-password"
          aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>
          <Icon name={showPassword ? 'eyeOff' : 'eye'} />
        </button>
      </div>
      <p id="studio-signup-password-note" className={s.signupHint}>
        {length} / 128 · {length < 12 ? copy.auth.length : length < 16 ? copy.auth.longer : copy.auth.goodLength}
      </p>
      {termsVersion && <div className={s.termsConsent}>
        <input id="studio-signup-terms" name="accept-terms" type="checkbox" required disabled={busy} />
        <label htmlFor="studio-signup-terms">I agree to the <Link href={'/assistant-studio/terms?version=' + encodeURIComponent(termsVersion)}
          target="_blank" rel="noopener noreferrer">Assistant Studio Terms of Service</Link></label>
      </div>}
      <Button type="submit" pending={busy ? 'Creating account…' : undefined}>Create free account</Button>
      {error && <p className={s.error} role="alert">{error}</p>}
      <p className={s.signupNotice} role="status">{notice}</p>
    </form>
    <div className={s.signup}>
      <p>Already have an account? <Link href={loginHref} prefetch={false} onNavigate={event => {
        event.preventDefault();
        if (!pending.current) onSignIn();
      }}>Sign in <span aria-hidden="true">→</span></Link></p>
      <small>No credit card required.</small>
    </div>
  </>;
}
