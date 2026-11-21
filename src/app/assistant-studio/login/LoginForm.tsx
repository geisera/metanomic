'use client';

import Link from 'next/link';
import FeedbackToast from '../FeedbackToast';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import SignupForm from './SignupForm';
import { trackLogin, type LoginErrorCode, type LoginMethod } from '@/lib/studio/login-events';
import { setupDestination } from '@/lib/studio/setup-link';
import { Button, Divider, Icon, Input, OAuthButton } from './form-controls';
import s from './login.module.css';

const methodKey = 'studio:login-method';
const cooldown = 60;
const signup = '/assistant-studio/signup';
const login = '/assistant-studio/login';
const typoDomains: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmal.com': 'gmail.com',
  'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com', 'gmai.com': 'gmail.com',
  'outlok.com': 'outlook.com', 'outllook.com': 'outlook.com', 'outlook.con': 'outlook.com',
  'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'yaho.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com', 'iclod.com': 'icloud.com', 'icloud.con': 'icloud.com',
};
type Mode = 'magic' | 'password' | 'recover';
type Confirmation = 'magic' | 'recover';
type Issue = { code: LoginErrorCode; message: string; retryAfter?: number };

function inbox(email: string) {
  const domain = email.split('@').at(-1)?.toLowerCase();
  if (domain === 'gmail.com' || domain === 'googlemail.com')
    return { label: 'Open Gmail', href: 'https://mail.google.com/' };
  if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain || ''))
    return { label: 'Open Outlook', href: 'https://outlook.live.com/mail/' };
  return null;
}

async function requestAuth(action: string, email: string, password: string, redirect: string | null): Promise<Issue | null> {
  try {
    const response = await fetch('/api/theia-studio/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, email, ...(action === 'login' && { password }), ...(action === 'magiclink' && redirect && { redirect }) }),
    });
    if (response.ok) return null;
    const body = await response.json().catch(() => ({}));
    if (response.status === 429) {
      const retryAfter = Math.max(0, Number(response.headers.get('Retry-After')) || 0);
      const minutes = Math.ceil(retryAfter / 60);
      return {
        code: 'rate_limited', retryAfter,
        message: minutes ? `Too many requests. Try again in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.` : 'Too many requests. Wait a minute and try again.',
      };
    }
    if (action === 'login' && response.status === 401)
      return { code: 'invalid_credentials', message: 'We couldn’t sign you in. Check your email and password or request a reset.' };
    if (body?.code === 'email_delivery_unknown')
      return { code: 'email_delivery_unknown', message: 'We couldn’t confirm delivery. Check your inbox and spam folder before requesting another link.' };
    if (body?.code === 'email_delivery_failed')
      return { code: 'email_delivery_failed', message: 'We couldn’t send the email. Try again in a moment.' };
    return { code: 'unavailable', message: 'Sign-in is temporarily unavailable. Please try again.' };
  } catch {
    return { code: 'network', message: 'We couldn’t connect. Check your internet connection and try again.' };
  }
}

function validateEmail(field: HTMLInputElement) {
  if (!field.value.trim()) return 'Enter your email address.';
  if (!field.validity.valid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim()))
    return 'Enter a valid email address.';
  return '';
}

export default function LoginForm({ redirect, destination, setupAccount, expiresIn, termsVersion, showOAuthPlaceholders, starterTrial }: {
  redirect: string | null;
  destination: string | null;
  setupAccount: boolean;
  expiresIn: number;
  termsVersion?: string;
  starterTrial?: boolean;
  showOAuthPlaceholders: boolean;
}) {
  const router = useRouter();
  const isSignup = usePathname() === signup;
  const signupView = useRef(isSignup);
  const query = new URLSearchParams();
  if (redirect) query.set('redirect', redirect);
  if (setupAccount) query.set('next', 'account');
  const suffix = query.size ? '?' + query : '';
  const [mode, setMode] = useState<Mode>('magic');
  const [email, setEmail] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [issue, setIssue] = useState<Issue | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [resendAt, setResendAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const emailField = useRef<HTMLInputElement>(null);
  const passwordField = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const pending = useRef(false);
  const reviewedTypo = useRef('');
  const viewed = useRef(false);
  const linkRequests = useRef(new Map<string, number>());
  const focusNext = useRef<'heading' | 'email' | 'password' | null>(null);
  const method: LoginMethod = mode === 'magic' ? 'magic' : 'password';

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let restored: Mode = 'magic';
    try {
      if (localStorage.getItem(methodKey) === 'password') restored = 'password';
      if (setupAccount) sessionStorage.setItem('studio-setup-destination', 'setup=account');
    } catch {}
    if (!viewed.current && !signupView.current) {
      viewed.current = true;
      trackLogin('login_view', restored === 'password' ? 'password' : 'magic');
    }
    queueMicrotask(() => {
      if (!active) return;
      setMode(restored);
      if (!signupView.current && matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches &&
          (document.activeElement === document.body || !document.activeElement)) {
        emailField.current?.focus({ preventScroll: true });
      }
    });
    void fetch('/api/theia-studio/auth', { cache: 'no-store', signal: controller.signal }).then(response => {
      if (active && response.ok && !pending.current) router.replace(redirect || setupDestination());
    }).catch(() => {});
    return () => { active = false; controller.abort(); };
  }, [redirect, router, setupAccount]);

  useEffect(() => {
    const next = focusNext.current;
    if (!next) return;
    focusNext.current = null;
    const target = next === 'heading' ? heading.current : next === 'password' ? passwordField.current : emailField.current;
    target?.focus({ preventScroll: true });
  }, [mode, confirmation]);

  useEffect(() => {
    if (!resendAt) return;
    function update() {
      const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) {
        setResendAt(0);
        setAnnouncement('You can resend the link now.');
      }
    }
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [resendAt]);

  function showCooldown(until: number) {
    setResendAt(until);
    setSeconds(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
  }

  function startCooldown(key: string, delay = cooldown) {
    const now = Date.now();
    for (const [address, expiry] of linkRequests.current) {
      if (expiry <= now) linkRequests.current.delete(address);
    }
    const until = now + delay * 1000;
    linkRequests.current.set(key, until);
    showCooldown(until);
  }

  function changeMode(next: Mode) {
    if (pending.current) return;
    setIssue(null);
    setEmailError('');
    setPasswordError('');
    setSubmitted(false);
    setSuggestion('');
    setAnnouncement('');
    setShowPassword(false);
    if (passwordField.current) passwordField.current.value = '';
    focusNext.current = next === 'recover' || mode === 'recover' ? 'heading' : next === 'password' ? 'password' : 'email';
    setMode(next);
    if (next === 'recover') {
      trackLogin('forgot_password_click', 'password');
      return;
    }
    if (mode !== 'recover') trackLogin('login_method_selected', next);
    try { localStorage.setItem(methodKey, next); } catch {}
  }

  function checkEmail(field: HTMLInputElement) {
    const error = validateEmail(field);
    setEmailError(error);
    const domain = field.value.trim().split('@').at(-1)?.toLowerCase() || '';
    const correction = !error && Object.hasOwn(typoDomains, domain) ? typoDomains[domain] : '';
    setSuggestion(correction);
    return { error, correction };
  }

  function acceptSuggestion() {
    setEmail(email.slice(0, email.lastIndexOf('@') + 1) + suggestion);
    setSuggestion('');
    emailField.current?.focus();
  }

  async function send(address: string, password = '', resend = false) {
    if (pending.current || (resend && resendAt > Date.now())) return;
    const key = mode + ':' + address.toLowerCase();
    const lastRequest = linkRequests.current.get(key) || 0;
    if (!resend && mode !== 'password' && lastRequest > Date.now()) {
      showCooldown(lastRequest);
      setEmail(address);
      focusNext.current = 'heading';
      setConfirmation(mode);
      return;
    }
    pending.current = true;
    setBusy(true);
    setIssue(null);
    setAnnouncement(mode === 'password' ? 'Signing in…' : 'Sending link…');
    trackLogin(resend && mode === 'magic' ? 'magic_link_resend' : 'login_submit', method);
    const action = mode === 'magic' ? 'magiclink' : mode === 'password' ? 'login' : 'recover';
    let signingIn = false;
    try {
      const error = await requestAuth(action, address, password, redirect);
      if (error) {
        setIssue(error);
        setAnnouncement('');
        trackLogin('login_error', method, error.code);
        if (resend && error.code === 'rate_limited') startCooldown(key, error.retryAfter || cooldown);
        return;
      }
      if (mode === 'password') {
        signingIn = true;
        router.replace(redirect || setupDestination());
        return;
      }
      if (mode === 'magic') trackLogin('magic_link_sent', 'magic');
      startCooldown(key);
      setAnnouncement(resend ? 'Link requested again. Check your inbox.' : 'Check your inbox for the link.');
      if (!resend) {
        setEmail(address);
        focusNext.current = 'heading';
        setConfirmation(mode);
      }
    } finally {
      if (!signingIn) {
        pending.current = false;
        setBusy(false);
      }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !emailField.current) return;
    setSubmitted(true);
    setIssue(null);
    const { error: invalidEmail, correction } = checkEmail(emailField.current);
    const address = emailField.current.value.trim();
    const password = passwordField.current?.value || '';
    const missingPassword = mode === 'password' && !password;
    setPasswordError(missingPassword ? 'Enter your password.' : '');
    if (invalidEmail || missingPassword) {
      trackLogin('login_error', method, invalidEmail ? 'invalid_email' : 'password_required');
      (invalidEmail ? emailField.current : passwordField.current)?.focus();
      return;
    }
    if (correction && reviewedTypo.current !== address) {
      reviewedTypo.current = address;
      setAnnouncement(`Did you mean ${correction}? You can correct the address or continue with the address you entered.`);
      return;
    }
    void send(address, password);
  }

  function startOver() {
    if (pending.current) return;
    setIssue(null);
    setAnnouncement('');
    setSeconds(0);
    setResendAt(0);
    focusNext.current = 'email';
    setConfirmation(null);
  }

  useEffect(() => {
    if (signupView.current === isSignup) return;
    signupView.current = isSignup;
    document.title = (isSignup ? 'Create an account' : 'Sign in') + ' | Assistant Studio by Metanomic';
    heading.current?.focus({ preventScroll: true });
    if (!isSignup && !viewed.current) {
      viewed.current = true;
      trackLogin('login_view', method);
    }
  }, [isSignup, method]);

  function switchView(next: string) {
    if (next === signup) trackLogin('signup_click_from_login', method);
    window.history.pushState(null, '', next + suffix);
  }

  function updateSignupEmail(address: string) {
    setEmail(address);
    setConfirmation(null);
    setEmailError('');
    setSuggestion('');
    setIssue(null);
    setAnnouncement('');
  }

  if (isSignup) return <section className={s.card} aria-labelledby="studio-login-title">
    <h1 id="studio-login-title" ref={heading} tabIndex={-1}>Create your Assistant Studio account</h1>
    <SignupForm email={email} setEmail={updateSignupEmail} termsVersion={termsVersion} starterTrial={starterTrial} loginHref={login + suffix}
      onSignIn={() => switchView(login)} />
  </section>;

  const provider = confirmation ? inbox(email) : null;
  const recovery = mode === 'recover';
  const title = confirmation ? 'Check your inbox' : recovery ? 'Reset your password' : 'Sign in to Assistant Studio';
  const helper = recovery ? 'We’ll email you a link to reset your password.' : mode === 'password'
    ? 'Enter the email and password for your account.' : 'We’ll email you a secure sign-in link. No password needed.';

  return <section className={s.card} aria-labelledby="studio-login-title">
    {confirmation && <span className={s.mailIcon}><Icon name="mail" size={26} /></span>}
    <h1 id="studio-login-title" tabIndex={-1} ref={heading}>{title}</h1>
    <span className={s.visuallyHidden} role="status" aria-live="polite">{announcement}</span>
    <FeedbackToast tone="error" message={issue?.message}/>
    {confirmation ? <>
      <p className={s.helper}>If this email can {confirmation === 'magic' ? 'sign in' : 'reset its password'}, we sent a link to <strong>{email}</strong>. {confirmation === 'magic' && `It expires in ${expiresIn} minutes.`}</p>
      {provider && <a href={provider.href} target="_blank" rel="noopener noreferrer" className={s.inbox}>{provider.label}<span className={s.visuallyHidden}> (opens in a new tab)</span><span aria-hidden="true">↗</span></a>}
      <div className={s.confirmActions}>
        <button type="button" className={s.textAction} aria-disabled={busy || seconds > 0} onClick={() => void send(email, '', true)}>
          {busy ? 'Sending link…' : seconds ? `Resend link in ${seconds}s` : 'Resend link'}
        </button>
        <button type="button" className={s.textAction} disabled={busy} onClick={startOver}>Use a different email</button>
      </div>
      <p className={s.deliveryHelp}>Didn’t get it? Check spam or <Link href="/contact">contact support</Link>.</p>
      {confirmation === 'magic' && <Link className={s.textAction} href={signup + suffix} prefetch={false} onNavigate={event => { event.preventDefault(); switchView(signup); }}>Create an account with this email</Link>}
    </> : <>
      <p className={s.helper}>{helper}</p>
      {destination && <p className={s.destination}>Sign in to continue to {destination}.</p>}
      {showOAuthPlaceholders && !recovery && <div className={s.oauthGroup}>
        <OAuthButton provider="Google" />
        <OAuthButton provider="Microsoft" />
        <Divider />
      </div>}
      <form name="studio-sign-in" aria-labelledby="studio-login-title" className={s.form} onSubmit={submit} noValidate>
        <label htmlFor="studio-login-email">Email</label>
        <Input ref={emailField} id="studio-login-email" type="email" name="email" autoComplete="email"
          inputMode="email" autoCapitalize="off" spellCheck={false} required maxLength={254} readOnly={busy}
          placeholder="you@company.com" value={email} aria-invalid={!!emailError}
          aria-describedby={emailError ? 'studio-login-email-error' : suggestion ? 'studio-login-email-suggestion' : undefined}
          onBlur={event => { if (!busy) checkEmail(event.currentTarget); }}
          onChange={event => {
            reviewedTypo.current = '';
            setEmail(event.currentTarget.value);
            setEmailError('');
            setSuggestion('');
            setIssue(null);
            setAnnouncement('');
          }} />
        <div className={s.fieldFeedback}>
          {emailError && <p id="studio-login-email-error" className={s.error} role={submitted ? 'alert' : undefined}>{emailError}</p>}
          {suggestion && <button type="button" id="studio-login-email-suggestion" className={s.textAction} onClick={acceptSuggestion}>Did you mean {suggestion}?</button>}
        </div>
        <div className={s.passwordExpand} data-open={mode === 'password'} inert={mode !== 'password'}>
          <div className={s.passwordContent}>
            <div className={s.passwordLabel}>
              <label htmlFor="studio-login-password">Password</label>
              <button type="button" className={s.textAction} disabled={busy} onClick={() => changeMode('recover')}>Forgot password?</button>
            </div>
            <div className={s.passwordRow}>
              <Input ref={passwordField} id="studio-login-password" type={showPassword ? 'text' : 'password'} name="password"
                autoComplete="current-password" required={mode === 'password'} disabled={mode !== 'password'} readOnly={busy} maxLength={128}
                aria-invalid={!!passwordError} aria-describedby={passwordError ? 'studio-login-password-error' : undefined}
                onChange={() => { setPasswordError(''); setIssue(null); }} />
              <button type="button" className={s.showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-controls="studio-login-password" disabled={busy} onClick={() => setShowPassword(!showPassword)}>
                <Icon name={showPassword ? 'eyeOff' : 'eye'} />
              </button>
            </div>
            <div className={s.fieldFeedback}>
              {passwordError && <p id="studio-login-password-error" className={s.error} role="alert">{passwordError}</p>}
            </div>
          </div>
        </div>
        <Button type="submit" pending={busy ? (mode === 'password' ? 'Signing in…' : 'Sending link…') : undefined}>
          {mode === 'password' ? 'Sign in' : recovery ? 'Email a reset link' : 'Continue with email'}
        </Button>
        <div className={s.formFeedback}>
          {mode === 'magic' &&
            <p className={s.secure}><Icon name="lock" size={15} />Secure, passwordless sign-in</p>}
        </div>
      </form>
      <button type="button" className={s.method} disabled={busy} onClick={() => changeMode(mode === 'magic' || recovery ? 'password' : 'magic')}>
        {recovery ? 'Back to sign in' : mode === 'magic' ? 'Use a password instead' : 'Use an email link instead'}
      </button>
      <div className={s.signup}>
        <p>Don’t have an account? <Link href={signup + suffix} prefetch={false} onNavigate={event => { event.preventDefault(); switchView(signup); }}>Start free <span aria-hidden="true">→</span></Link></p>
        <small>No credit card required.</small>
      </div>
    </>}
  </section>;
}
