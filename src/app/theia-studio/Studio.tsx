'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { MODELS, type Agent, type Document, type Message } from '@/lib/studio/core';
import FieldHelp from './FieldHelp';
import s from './studio.module.css';
import Instructions from './Instructions';
export async function call(path: string, body?: unknown) {
    const r = await fetch('/api/theia-studio/' + path, { cache: 'no-store', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
    const d = await r.json();
    if (!r.ok)
        throw new Error(d.error || 'Request failed.');
    return d;
}
type User = {
    id: string;
    email: string;
    name: string;
};
type KeyInfo = {
    last_four: string;
    validated_at: string;
};
type Usage = {
    agent_id: string;
    requests: number;
};
export default function Studio() {
    const [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(true), [view, setView] = useState<'agents' | 'account' | 'instructions'>('agents'), [error, setError] = useState('');
    const load = useCallback(async () => {
        try {
            const d = await call('auth');
            setUser(d.user);
        }
        catch {
            setUser(null);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { queueMicrotask(() => void load()); }, [load]);
    async function logout() {
        try {
            await call('auth', { action: 'logout' });
            setUser(null);
        }
        catch (e) {
            setError((e as Error).message);
        }
    }
    return <main className={s.shell}><div className='container'><header className={s.header}><Link className={s.brand} href='/theia-studio'>Theia <span>Studio</span></Link><nav aria-label='Studio navigation'>{user && <><button className={s.textButton} onClick={() => setView('agents')}>Assistants</button><button className={s.textButton} onClick={() => setView('account')}>Account</button><button className={s.textButton} onClick={logout}>Sign out</button></>}<button className={s.textButton} aria-pressed={view === 'instructions'} onClick={() => setView(view === 'instructions' ? 'agents' : 'instructions')}>Instructions</button><Link href='/'>Metanomic →</Link></nav></header>
 <div className={s.intro}><p className='eyebrow'>Your knowledge. Your key. Your assistant.</p><h1>{user ? 'Make it your own.' : 'An AI assistant that knows your business.'}</h1><p>Configure your assistant, connect your OpenAI key, and bring it to your website. Hosted by Metanomic.</p></div>{error && <p className={s.alert} role='alert'>{error}</p>}
 {view === 'instructions' ? <section className={'card ' + s.guide}><Instructions /></section> : loading ? <p role='status'>Checking your account…</p> : !user ? <Auth onLogin={load}/> : view === 'account' ? <Account key={user.id} user={user} onUpdate={load}/> : <Workspace key={user.id}/>}
 <footer className={s.footer}>Theia Studio by Metanomic · <Link href='/theia-studio/privacy'>Privacy and data handling</Link> · <Link href='/contact'>Contact our team</Link></footer></div></main>;
}
function Auth({ onLogin }: {
    onLogin: () => Promise<void>;
}) {
    const [mode, setMode] = useState<'login' | 'signup' | 'recover'>('login'), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
    async function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const d = await call('auth', { action: mode, email: f.get('email'), password: f.get('password') });
            if (mode === 'login')
                await onLogin();
            else
                setNotice(d.message);
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return <section className={'card ' + s.auth}><h2>{mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'}</h2><form className={s.form} onSubmit={submit}><FieldHelp id="studio-field-help-1" label="Email" caption={<>Email</>} control={<input type='email' name='email' autoComplete='email' required maxLength={254} aria-describedby="studio-field-help-1"/>}>Use the email address for your Studio account. Verification and password-reset links are sent here.</FieldHelp>{mode !== 'recover' && <FieldHelp id="studio-field-help-2" label="Password" caption={<>Password</>} control={<input type='password' name='password' autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'signup' ? 12 : 1} maxLength={128} required aria-describedby="studio-field-help-2"/>}>For a new account, choose a unique password of 12–128 characters. To sign in, enter your existing password.</FieldHelp>}{mode === 'signup' && <p className={s.help}>Use at least 12 characters. We’ll email a confirmation link. OpenAI usage is billed to your OpenAI account. <Link href='/theia-studio/privacy'>Read how your data is handled.</Link></p>}<button className='button button-primary' disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}</button></form>{error && <p role='alert' className={s.alert}>{error}</p>}{notice && <p role='status' className={s.alert}>{notice}</p>}<div className={s.actions}>{(['login', 'signup', 'recover'] as const).filter(x => x !== mode).map(x => <button key={x} type='button' className={s.textButton} disabled={busy} onClick={() => { setMode(x); setNotice(''); setError(''); }}>{x === 'login' ? 'Sign in' : x === 'signup' ? 'Create an account' : 'Forgot password?'}</button>)}</div></section>;
}
function Workspace() {
    const [agents, setAgents] = useState<Agent[]>([]), [keys, setKeys] = useState<KeyInfo[]>([]), [usage, setUsage] = useState<Usage[]>([]), [active, setActive] = useState(''), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    const refresh = useCallback(async () => { const d = await call('manage'); setAgents(d.agents); setKeys(d.keys); setUsage(d.usage); setActive(a => d.agents.some((x: Agent) => x.id === a) ? a : d.agents[0]?.id || ''); setLoading(false); }, []);
    useEffect(() => { queueMicrotask(() => { refresh().catch(e => { setError(e.message); setLoading(false); }); }); }, [refresh]);
    async function create(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        setError('');
        try {
            const d = await call('manage', { action: 'create-agent', name: new FormData(form).get('name') });
            await refresh();
            setActive(d.agent.id);
            form.reset();
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    const agent = agents.find(a => a.id === active);
    return <>{error && <p role='alert' className={s.alert}>{error}</p>}{!keys.length && <p className={s.alert}>Start by connecting your OpenAI API key in <strong>Account</strong>. You can configure assistants before connecting a key.</p>}<div className={s.columns}><aside className={s.sidebar}><form className={s.form} onSubmit={create}><FieldHelp id="studio-field-help-3" label="New assistant name" caption={<>New assistant name</>} control={<input name='name' maxLength={80} required placeholder='e.g. Customer advisor' aria-describedby="studio-field-help-3"/>}>Give this assistant a recognizable name, such as “Customer advisor”. You can rename it later. Up to 80 characters.</FieldHelp><button className='button button-primary' disabled={busy || agents.length >= 10}>Create assistant</button><p className={s.help}>{agents.length} of 10 assistants</p></form>{agents.map(a => <button key={a.id} className={s.agentButton} aria-pressed={a.id === active} onClick={() => setActive(a.id)}>{a.name}<small>{a.published ? 'Published' : 'Draft'} · {usage.find(u => u.agent_id === a.id)?.requests || 0}/{a.daily_limit} messages today</small></button>)}</aside><div>{loading ? <p role='status'>Loading assistants…</p> : agent ? <Editor key={agent.id} agent={agent} onSaved={refresh}/> : <div className={'card ' + s.empty}>Create your first assistant. Add its instructions and knowledge, test it privately, then publish it on your website.</div>}</div></div></>;
}
function Editor({ agent, onSaved }: {
    agent: Agent;
    onSaved: () => Promise<void>;
}) {
    const [draft, setDraft] = useState(agent), [tab, setTab] = useState('settings'), [sites, setSites] = useState(agent.origins.join('\n')), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
    async function save(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const d = await call('manage', { action: 'save-agent', agent_id: agent.id, ...draft, origins: sites.split('\n').map(v => v.trim()).filter(Boolean) });
            setDraft(d.agent);
            await onSaved();
            setNotice('Settings saved. Preview uses these saved settings.');
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    async function remove() {
        if (!confirm('Delete this assistant and all its knowledge? Its widget will stop working.'))
            return;
        setBusy(true);
        try {
            await call('manage', { action: 'delete-agent', agent_id: agent.id });
            await onSaved();
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    async function unpublish() {
        setBusy(true);
        try {
            await call('manage', { action: 'unpublish', agent_id: agent.id });
            setDraft(d => ({ ...d, published: false }));
            await onSaved();
            setNotice('Widget unpublished.');
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    const code = `<script src="https://metanomic.ai/theia-embed.js" data-agent="${agent.id}" data-label="Chat with us" defer></script>`;
    return <section className='card'><div className={s.actions}><h2>{agent.name}</h2><span className={s.badge}>{agent.published ? 'Published' : 'Draft'}</span></div><div className={s.tabs} aria-label='Assistant sections'>{['settings', 'knowledge', 'preview', 'embed', 'instructions'].map(t => <button key={t} type='button' aria-pressed={tab === t} onClick={() => { setTab(t); setNotice(''); }}>{t[0].toUpperCase() + t.slice(1)}</button>)}</div>{error && <p className={s.alert} role='alert'>{error}</p>}{notice && <p className={s.alert} role='status'>{notice}</p>}
 {tab === 'settings' && <form className={s.form} onSubmit={save}><FieldHelp id="studio-field-help-4" label="Assistant name" caption={<>Assistant name</>} control={<input value={draft.name} maxLength={80} required onChange={e => setDraft({ ...draft, name: e.target.value })} aria-describedby="studio-field-help-4"/>}>This name appears at the top of the visitor’s chat. Use your business or assistant name. Up to 80 characters.</FieldHelp><FieldHelp id="studio-field-help-5" label="Welcome message" caption={<>Welcome message</>} control={<input value={draft.greeting} maxLength={300} required onChange={e => setDraft({ ...draft, greeting: e.target.value })} aria-describedby="studio-field-help-5"/>}>The first message visitors see when they open the widget. Explain how the assistant can help. Up to 300 characters.</FieldHelp><FieldHelp id="studio-field-help-6" label="Instructions" caption={<>Instructions</>} control={<textarea rows={7} maxLength={8000} value={draft.instructions} onChange={e => setDraft({ ...draft, instructions: e.target.value })} placeholder='Describe the business, who this assistant helps, its tone, and when it should refer visitors to your team.' aria-describedby="studio-field-help-6"/>}>Define the assistant’s role, tone, boundaries, and when to refer someone to your team. Put business facts in Knowledge. Up to 8,000 characters; never include passwords or API keys.</FieldHelp><FieldHelp id="studio-field-help-7" label="OpenAI model" caption={<>OpenAI model</>} control={<select value={draft.model} onChange={e => setDraft({ ...draft, model: e.target.value })} aria-describedby="studio-field-help-7">{MODELS.map(m => <option key={m}>{m}</option>)}</select>}>Choose the model used for answers. Your OpenAI project must have access to it and available credit. Model choice affects cost, speed, and answer quality.</FieldHelp><div className={s.two}><FieldHelp id="studio-field-help-8" label="Daily message limit" caption={<>Daily message limit</>} control={<input type='number' min={1} max={1000} value={draft.daily_limit} onChange={e => setDraft({ ...draft, daily_limit: Number(e.target.value) })} aria-describedby="studio-field-help-8"/>}>Allow 1–1,000 model requests per assistant each day, shared across all visitors and private previews. The counter resets at midnight UTC; requests that reach the model may count even if they fail.</FieldHelp><FieldHelp id="studio-field-help-9" label="Maximum output tokens" caption={<>Maximum output tokens</>} control={<input type='number' min={200} max={2000} value={draft.max_output} onChange={e => setDraft({ ...draft, max_output: Number(e.target.value) })} aria-describedby="studio-field-help-9"/>}>Allow 200–2,000 output tokens per answer. Tokens are pieces of text; a higher limit permits longer answers and can increase cost. This does not limit input usage or set a dollar budget.</FieldHelp></div><p className={s.help}>Limits include private preview and failed model attempts, and reset at midnight UTC. Each visitor is also limited to 20 requests per hour. These are request and output limits, not a guaranteed dollar spending cap. Set an appropriate OpenAI project budget too.</p><FieldHelp id="studio-field-help-10" label="Approved website origins" caption={<>Approved website origins</>} control={<textarea rows={3} value={sites} onChange={e => setSites(e.target.value)} placeholder={'https://example.com\nhttps://www.example.com'} aria-describedby="studio-field-help-10"/>}>Enter up to 10 exact HTTPS website origins, one per line, such as https://example.com. Add https://www.example.com separately if used. Do not include page paths or wildcards.</FieldHelp><p className={s.help}>One exact HTTPS origin per line. Include www separately when used. Maximum 10. Browser origin restrictions reduce unwanted embeds but are not a substitute for usage limits.</p><FieldHelp id="studio-field-help-11" label="Publish widget on approved websites" caption={<>Publish widget on approved websites</>} control={<input type='checkbox' checked={draft.published} onChange={e => setDraft({ ...draft, published: e.target.checked })} aria-describedby="studio-field-help-11"/>} checkbox>Check this and save to enable the public widget. A connected API key and at least one approved website are required. Leave unchecked while preparing your assistant.</FieldHelp><div className={s.actions}><button className='button button-primary' disabled={busy}>Save settings</button>{agent.published && <button type='button' className='button button-outline' disabled={busy} onClick={unpublish}>Unpublish now</button>}<button type='button' className={s.textButton} disabled={busy} onClick={remove}>Delete assistant</button></div></form>}
 {tab === 'instructions' && <Instructions />}{tab === 'knowledge' && <Knowledge agent={agent}/>}{tab === 'preview' && <Preview agent={agent}/>}{tab === 'embed' && <><h3>Add your assistant to your website</h3><p className={s.help}>Save an approved origin and publish the assistant, then paste this snippet before your website’s closing body tag. It adds a floating chat launcher. Visitors do not need accounts.</p><pre className={s.code}>{code}</pre><button className={s.textButton} onClick={async () => {
                try {
                    await navigator.clipboard.writeText(code);
                    setNotice('Embed code copied.');
                }
                catch {
                    setNotice('Copy the code above manually.');
                }
            }}>Copy embed code</button>{!agent.published && <p className={s.alert}>This assistant is a draft. The public widget stays unavailable until you publish it.</p>}<p className={s.help}>The widget sends messages through Metanomic to OpenAI using your encrypted key. It keeps conversation text only in the open widget’s memory. No transcripts are stored in Studio. Clear or reload to start over. Widget sessions expire after one hour.</p></>}
 </section>;
}
function Knowledge({ agent }: {
    agent: Agent;
}) {
    const [docs, setDocs] = useState<Document[]>([]), [id, setId] = useState(''), [title, setTitle] = useState(''), [content, setContent] = useState(''), [published, setPublished] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const refresh = useCallback(async () => { setDocs((await call('manage?agent=' + agent.id)).documents); }, [agent.id]);
    useEffect(() => { queueMicrotask(() => { refresh().catch(e => setError(e.message)); }); }, [refresh]);
    function reset() { setId(''); setTitle(''); setContent(''); setPublished(false); }
    async function save(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            await call('manage', { action: 'save-document', agent_id: agent.id, ...(id ? { id } : {}), title, content, published });
            await refresh();
            reset();
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return <><p className={s.help}>Add business facts, FAQs, and policies. Only published documents are used in answers. Up to 20 documents, 50,000 characters each. Do not upload secrets or personal customer data.</p>{error && <p className={s.alert} role='alert'>{error}</p>}<div className={s.documents}>{docs.map(d => <div className={s.document} key={d.id}><h3>{d.title}</h3><p className={s.help}>{d.published ? 'Published' : 'Draft'} · {d.content.length.toLocaleString()} characters</p><div className={s.actions}><button className={s.textButton} onClick={() => { setId(d.id); setTitle(d.title); setContent(d.content); setPublished(d.published); }}>Edit</button><button className={s.textButton} disabled={busy} onClick={async () => {
                if (!confirm('Delete this knowledge document?'))
                    return;
                try {
                    await call('manage', { action: 'delete-document', agent_id: agent.id, id: d.id });
                    await refresh();
                    if (id === d.id)
                        reset();
                }
                catch (e) {
                    setError((e as Error).message);
                }
            }}>Delete</button></div></div>)}</div><form className={s.form} onSubmit={save}><h3>{id ? 'Edit document' : 'Add knowledge'}</h3><FieldHelp id="studio-field-help-12" label="Import plain text or Markdown" caption={<>Import plain text or Markdown</>} control={<input type='file' accept='.txt,.md,text/plain,text/markdown' onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f)
                return;
            if (f.size > 200000 || !(/\.(txt|md)$/i.test(f.name))) {
                setError('Choose a .txt or .md file under 200 KB.');
                return;
            }
            const v = await f.text();
            if (v.length > 50000) {
                setError('Documents are limited to 50,000 characters. Split this file into smaller documents.');
                return;
            }
            setContent(v);
            if (!title)
                setTitle(f.name.slice(0, 160));
        }} aria-describedby="studio-field-help-12"/>}>Optional: import a .txt or .md file up to 200 KB and 50,000 characters. Import fills the editor; select Save document to store it. PDF and Word files are not supported.</FieldHelp><FieldHelp id="studio-field-help-13" label="Title" caption={<>Title</>} control={<input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} required aria-describedby="studio-field-help-13"/>}>Use a descriptive source name, such as “Returns policy”. The assistant can cite this title in answers. Up to 160 characters.</FieldHelp><FieldHelp id="studio-field-help-14" label="Content" caption={<>Content</>} control={<textarea rows={10} value={content} onChange={e => setContent(e.target.value)} maxLength={50000} required aria-describedby="studio-field-help-14"/>}>Paste the facts, FAQs, or policies the assistant should use. Keep each document focused and current. Up to 50,000 characters; exclude secrets and private customer data.</FieldHelp><FieldHelp id="studio-field-help-15" label="Publish this document for answers" caption={<>Publish this document for answers</>} control={<input type='checkbox' checked={published} onChange={e => setPublished(e.target.checked)} aria-describedby="studio-field-help-15"/>} checkbox>Check this and save to make the document available to both preview and public answers. Leave unchecked to keep a draft. Publishing a document does not publish the widget.</FieldHelp><div className={s.actions}><button className='button button-primary' disabled={busy || (!id && docs.length >= 20)}>Save document</button><button type='button' className={s.textButton} onClick={reset}>New document</button></div></form></>;
}
function Preview({ agent }: {
    agent: Agent;
}) {
    const [history, setHistory] = useState<Message[]>([]), [input, setInput] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const abort = useRef<AbortController | null>(null), log = useRef<HTMLDivElement>(null);
    useEffect(() => () => abort.current?.abort(), []);
    useEffect(() => {
        if (log.current)
            log.current.scrollTop = log.current.scrollHeight;
    }, [history]);
    async function send(e: FormEvent) {
        e.preventDefault();
        if (busy || !input.trim())
            return;
        const outgoing = [...history, { role: 'user' as const, content: input.trim() }].slice(-15);
        while (outgoing.length > 1 && (outgoing[0]?.role !== 'user' || outgoing.reduce((n, m) => n + m.content.length, 0) > 16000))
            outgoing.splice(0, 2);
        setInput('');
        setBusy(true);
        setError('');
        setHistory([...outgoing, { role: 'assistant', content: '' }]);
        abort.current = new AbortController();
        let reply = '';
        try {
            const r = await fetch('/api/theia-studio/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agent_id: agent.id, preview: true, messages: outgoing }), signal: abort.current.signal });
            if (!r.ok)
                throw new Error((await r.json()).error);
            const reader = r.body!.getReader(), decoder = new TextDecoder();
            let buffer = '', doneEvent = false;
            while (true) {
                const { value, done } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                let at;
                while ((at = buffer.indexOf('\n')) >= 0) {
                    const line = buffer.slice(0, at);
                    buffer = buffer.slice(at + 1);
                    if (!line)
                        continue;
                    const data = JSON.parse(line);
                    if (data.error)
                        throw new Error(data.error);
                    if (data.delta) {
                        reply += data.delta;
                        setHistory([...outgoing, { role: 'assistant', content: reply }]);
                    }
                    if (data.done)
                        doneEvent = true;
                }
            }
            if (!doneEvent)
                throw new Error('Response interrupted.');
        }
        catch (e) {
            setError((e as Error).message);
            setHistory(outgoing.slice(0, -1));
        }
        finally {
            setBusy(false);
        }
    }
    return <><p className={s.help}>Private preview uses saved settings, published knowledge, and your OpenAI key. Requests count toward this assistant’s daily limit.</p><div ref={log} className={s.log} role='log' aria-label='Preview conversation'><div className={s.message}>{agent.greeting}</div>{history.map((m, i) => <div key={i} className={s.message} data-role={m.role}><strong>{m.role === 'user' ? 'You' : agent.name}</strong><p>{m.content || 'Thinking…'}</p></div>)}</div>{error && <p role='alert' className={s.alert}>{error}</p>}<form className={s.form} onSubmit={send}><FieldHelp id="studio-field-help-16" label="Test message" caption={<>Test message</>} control={<textarea rows={2} value={input} maxLength={4000} onChange={e => setInput(e.target.value)} required aria-describedby="studio-field-help-16"/>}>Ask a realistic customer question to test saved settings and published knowledge. Up to 4,000 characters. Preview uses your key and counts toward the daily limit.</FieldHelp><div className={s.actions}><button className='button button-primary' disabled={busy}>{busy ? 'Answering…' : 'Send message'}</button><button type='button' className={s.textButton} disabled={busy} onClick={() => { setHistory([]); setError(''); }}>Clear conversation</button></div></form></>;
}
function Account({ user, onUpdate }: {
    user: User;
    onUpdate: () => Promise<void>;
}) {
    const [keys, setKeys] = useState<KeyInfo[]>([]), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
    useEffect(() => { call('manage').then(d => setKeys(d.keys)).catch(e => setError(e.message)); }, []);
    async function action(e: FormEvent<HTMLFormElement>, endpoint: string, kind: string) {
        e.preventDefault();
        const form = e.currentTarget;
        if (kind === 'delete' && !confirm('Permanently delete your account, assistants, knowledge and stored API key?'))
            return;
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const body = Object.fromEntries(new FormData(form));
            const d = await call(endpoint, { ...body, action: kind });
            form.reset();
            setNotice(d.message || 'Saved.');
            if (endpoint === 'manage')
                setKeys((await call('manage')).keys);
            if (endpoint === 'auth')
                await onUpdate();
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return <div className={s.account}>{error && <p className={s.alert} role='alert'>{error}</p>}{notice && <p className={s.alert} role='status'>{notice}</p>}<section className='card'><h2>Account profile</h2><p className={s.help}>{user.email}</p><form className={s.form} onSubmit={e => action(e, 'auth', 'profile')}><FieldHelp id="studio-field-help-17" label="Display name" caption={<>Display name</>} control={<input name='name' defaultValue={user.name} maxLength={80} aria-describedby="studio-field-help-17"/>}>Optional account name, up to 80 characters. This does not change the name visitors see in your assistant’s widget.</FieldHelp><button className='button button-primary' disabled={busy}>Save profile</button></form></section>
 <section className='card'><h2>Your OpenAI API key</h2><p className={s.help}>{keys[0] ? `Connected · ending ${keys[0].last_four} · validated ${new Date(keys[0].validated_at).toLocaleString()}` : 'No key connected.'}</p><p className={s.help}>Encrypted on Metanomic’s server and never sent to visitors. Usage is billed directly by OpenAI. Model-list validation does not guarantee model access or available credit. Use a dedicated project key with an appropriate OpenAI budget.</p><form className={s.form} onSubmit={e => action(e, 'manage', 'key')}><FieldHelp id="studio-field-help-18" label="OpenAI API key" caption={<>{keys.length ? 'Replace key' : 'Connect key'}</>} control={<input name='key' type='password' autoComplete='off' maxLength={2000} required placeholder='Paste your OpenAI API key' aria-describedby="studio-field-help-18"/>}>Paste an OpenAI API key, not a ChatGPT password. Use a dedicated project key with model-list and Responses API access. It is encrypted when saved; a replacement applies to all assistants in this account.</FieldHelp><button className='button button-primary' disabled={busy}>Validate and save key</button></form>{keys.length > 0 && <form onSubmit={e => action(e, 'manage', 'remove-key')}><p className={s.help}>Removing the key also unpublishes all your assistants.</p><button className={s.textButton} disabled={busy}>Remove API key</button></form>}</section>
 <section className='card'><h2>Change password</h2><form className={s.form} onSubmit={e => action(e, 'auth', 'password')}><FieldHelp id="studio-field-help-19" label="Current password" caption={<>Current password</>} control={<input name='current_password' type='password' autoComplete='current-password' required aria-describedby="studio-field-help-19"/>}>Enter your existing password to confirm this change. Do not enter your OpenAI API key.</FieldHelp><FieldHelp id="studio-field-help-20" label="New password" caption={<>New password</>} control={<input name='password' type='password' autoComplete='new-password' minLength={12} maxLength={128} required aria-describedby="studio-field-help-20"/>}>Choose a unique password of 12–128 characters. Saving it signs you out of all sessions; sign back in with the new password.</FieldHelp><button className='button button-outline' disabled={busy}>Change password and sign out</button></form></section>
 <section className='card'><h2>Change email</h2><form className={s.form} onSubmit={e => action(e, 'auth', 'email')}><FieldHelp id="studio-field-help-21" label="New email" caption={<>New email</>} control={<input name='email' type='email' maxLength={254} required aria-describedby="studio-field-help-21"/>}>Use an address you can access. Confirm the messages sent to both your current address and the new one to complete the change.</FieldHelp><FieldHelp id="studio-field-help-22" label="Current password" caption={<>Current password</>} control={<input name='current_password' type='password' autoComplete='current-password' required aria-describedby="studio-field-help-22"/>}>Enter your current Studio password to authorize the email change.</FieldHelp><button className='button button-outline' disabled={busy}>Send confirmation emails</button></form></section>
 <section className='card'><h2>Sessions</h2><p className={s.help}>Sign out of all sessions using this Metanomic login.</p><form onSubmit={e => action(e, 'auth', 'logout-all')}><button className='button button-outline' disabled={busy}>Sign out everywhere</button></form></section>
 <section className={'card ' + s.danger}><h2>Delete account</h2><p className={s.help}>Permanently deletes this login and its Studio assistants, knowledge, and key. Existing Metanomic administrator logins are protected from deletion here.</p><form className={s.form} onSubmit={e => action(e, 'auth', 'delete')}><FieldHelp id="studio-field-help-23" label="Current password" caption={<>Current password</>} control={<input name='current_password' type='password' autoComplete='current-password' required aria-describedby="studio-field-help-23"/>}>Enter your current Studio password to confirm that you own the account being deleted.</FieldHelp><FieldHelp id="studio-field-help-24" label="Type DELETE" caption={<>Type DELETE</>} control={<input name='confirm' required pattern='DELETE' aria-describedby="studio-field-help-24"/>}>Type DELETE exactly, in capital letters. Deletion permanently removes your login, assistants, knowledge, and stored API key.</FieldHelp><button className='button button-outline' disabled={busy}>Permanently delete account</button></form></section></div>;
}
