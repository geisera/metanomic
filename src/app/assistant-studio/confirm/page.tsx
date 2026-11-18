'use client';
import { useEffect, useState, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import { call } from '../Studio';
import {track} from '@/lib/navigation-analytics';
import FieldHelp from '../FieldHelp';
import s from '../studio.module.css';
export default function Confirm() {
    const [link, setLink] = useState<{
        token_hash: string;
        type: string;
    } | null>(null), [recovery, setRecovery] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
    const initialized = useRef(false);
    useEffect(() => {
        if (initialized.current)
            return;
        initialized.current = true;
        const p = new URLSearchParams(location.search);
        const value = { token_hash: p.get('token_hash') || '', type: p.get('type') || '' };
        history.replaceState(null, '', location.pathname);
        queueMicrotask(() => setLink(value));
    }, []);
    async function verify() {
        if (!link)
            return;
        setBusy(true);
        setError('');
        try {
            const d = await call('auth', { action: 'verify', ...link });
            setRecovery(d.recovery);
            if(link.type==='signup')track('signup_complete',{});
            setNotice(d.message);
            setLink(null);
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    async function reset(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const d = await call('auth', { action: 'password', password: new FormData(e.currentTarget).get('password') });
            setRecovery(false);
            setNotice(d.message);
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return <main className={s.shell}><div className='container'><section className={'card ' + s.auth}><p className='eyebrow'>Assistant Studio</p><h1>Confirm your account request</h1><p className={s.help}>Only continue if you requested this email. Opening this page does not automatically use your link.</p>{link?.token_hash && <button className='button button-primary' onClick={verify} disabled={busy}>Confirm</button>}{recovery && <form className={s.form} onSubmit={reset}><FieldHelp id="studio-recovery-help-1" label="New password" caption={<>New password</>} control={<input name='password' type='password' autoComplete='new-password' minLength={12} maxLength={128} required aria-describedby="studio-recovery-help-1"/>}>Choose a unique password of 12–128 characters. After saving, return to Studio and sign in with this new password.</FieldHelp><button className='button button-primary' disabled={busy}>Set new password</button></form>}{error && <p className={s.alert} role='alert'>{error}</p>}{notice && <p className={s.alert} role='status'>{notice}</p>}<Link className={s.textButton} href='/assistant-studio'>Continue to Assistant Studio →</Link></section></div></main>;
}
