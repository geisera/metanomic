'use client';
import {useState,type FormEvent} from 'react';
import FieldHelp from './FieldHelp';
import SettingsNav,{SettingsIcon} from './SettingsNav';
import {LastSaved,Notice,call,type User} from './ui';
import s from './studio.module.css';
export function Account({ user, onUpdate }: {
    user: User;
    onUpdate: () => Promise<void>;
}) {
    const [saved,setSaved]=useState<Record<string,string>>({}), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
    async function action(e: FormEvent<HTMLFormElement>, kind: string) {
        e.preventDefault();
        const form = e.currentTarget;
        if (kind === 'delete' && !confirm('Permanently delete your account, assistants, knowledge and stored API key?'))
            return;
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const body = Object.fromEntries(new FormData(form));
            const d = await call('auth', { ...body, action: kind });
            form.reset();
            setNotice(d.message || 'Saved');setSaved(values=>({...values,[kind]:new Date().toISOString()}));
            await onUpdate();
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return <div className={s.settingsLayout}><SettingsNav label='Account settings'>
      <a href='#account-profile'><SettingsIcon name='profile'/>Profile</a>
      <a href='#account-password'><SettingsIcon name='security'/>Password</a>
      <a href='#account-email'><SettingsIcon name='profile'/>Email address</a>
      <a href='#account-sessions'><SettingsIcon name='status'/>Sessions</a>
      {!user.is_admin&&<a href='#account-delete'><SettingsIcon name='security'/>Delete account</a>}
    </SettingsNav><div className={s.account}>{error && <p className={s.alert} role='alert'>{error}</p>}<Notice>{notice}</Notice><section id='account-profile' className='card'><h2>Account profile</h2><p className={s.help}>{user.email}</p><form className={s.form} onSubmit={e => action(e, 'profile')}><FieldHelp id="studio-field-help-17" label="Display name" caption={<>Display name</>} control={<input name='name' defaultValue={user.name} maxLength={80} aria-describedby="studio-field-help-17"/>}>Optional account name, up to 80 characters. This does not change the name visitors see in your assistant’s chat.</FieldHelp><button className='button button-primary' disabled={busy}>Save profile</button><LastSaved value={saved.profile}/></form></section>
 
 <section id='account-password' className='card'><h2>Change password</h2><form className={s.form} onSubmit={e => action(e, 'password')}><FieldHelp id="studio-field-help-19" label="Current password" caption={<>Current password</>} control={<input name='current_password' type='password' autoComplete='current-password' required aria-describedby="studio-field-help-19"/>}>Enter your existing password to confirm this change. Do not enter your OpenAI API key.</FieldHelp><FieldHelp id="studio-field-help-20" label="New password" caption={<>New password</>} control={<input name='password' type='password' autoComplete='new-password' minLength={12} maxLength={128} required aria-describedby="studio-field-help-20"/>}>Choose a unique password of 12–128 characters. You&apos;ll be signed out on all devices.</FieldHelp><button className='button button-outline' disabled={busy}>Update password</button></form></section>
 <section id='account-email' className='card'><h2>Change email</h2><form className={s.form} onSubmit={e => action(e, 'email')}><FieldHelp id="studio-field-help-21" label="New email" caption={<>New email</>} control={<input name='email' type='email' maxLength={254} required aria-describedby="studio-field-help-21"/>}>Use an address you can access. Confirm the messages sent to both your current address and the new one to complete the change.</FieldHelp><FieldHelp id="studio-field-help-22" label="Current password" caption={<>Current password</>} control={<input name='current_password' type='password' autoComplete='current-password' required aria-describedby="studio-field-help-22"/>}>Enter your current Studio password to authorize the email change.</FieldHelp><button className='button button-outline' disabled={busy}>Send confirmation emails</button></form></section>
 <section id='account-sessions' className='card'><h2>Sessions</h2><p className={s.help}>Sign out of all sessions using this Metanomic login.</p><form onSubmit={e => action(e, 'logout-all')}><button className='button button-outline' disabled={busy}>Sign out everywhere</button></form></section>
 {!user.is_admin&&<section id='account-delete' className={'card ' + s.danger}><h2>Delete account</h2><p className={s.help}>Permanently deletes this login and its Studio assistants, knowledge, and key. {user.is_admin && 'Existing Metanomic administrator logins are protected from deletion here.'}</p><form className={s.form} onSubmit={e => action(e, 'delete')}><FieldHelp id="studio-field-help-23" label="Current password" caption={<>Current password</>} control={<input name='current_password' type='password' autoComplete='current-password' required aria-describedby="studio-field-help-23"/>}>Enter your current Studio password to confirm that you own the account being deleted.</FieldHelp><FieldHelp id="studio-field-help-24" label="Type DELETE" caption={<>Type DELETE</>} control={<input name='confirm' required pattern='DELETE' aria-describedby="studio-field-help-24"/>}>Type DELETE exactly, in capital letters. Deletion permanently removes your login, assistants, knowledge, and stored API key.</FieldHelp><button className='button button-outline' disabled={busy}>Permanently delete account</button></form></section>}</div></div>;
}
