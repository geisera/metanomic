'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { isScopeModel, scopeLimits, scopeModels, type ScopeConfig } from '@/lib/studio/scope-control';
import s from './operations.module.css';

type Props = { request: <T>(body: object) => Promise<T>; onSessionChange: () => Promise<void> };

export default function ScopeConfiguration({ request, onSessionChange }: Props) {
  const [config, setConfig] = useState<ScopeConfig | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void request<ScopeConfig>({ action: 'scope_config' }).then(value => {
      if (active) setConfig(value);
    }).catch((problem: Error) => {
      if (active) setError(problem.message);
    });
    return () => { active = false; };
  }, [request]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!config || busy) return;
    const form = event.currentTarget;
    const reason = new FormData(form).get('reason');
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await request({ action: 'save_scope_config', ...config, reason });
      form.reset();
      setNotice('Scope Control configuration saved.');
    } catch (problem) {
      const failure = problem as Error & { status?: number };
      setError(failure.message);
      if (failure.status === 401 || failure.status === 403) await onSessionChange();
    } finally {
      setBusy(false);
    }
  }

  return <section className={s.panel} aria-labelledby="scope-config-title">
    <h2 id="scope-config-title">Scope Control Beta</h2>
    <p className={s.meta}>Monthly allowances use UTC and include Preview. A zero allowance stops hosted checks for that limit.</p>
    {error && <p className={s.message} data-error="true" role="alert">{error}</p>}
    {notice && <p className={s.message} role="status">{notice}</p>}
    {!config && !error && <p role="status">Loading configuration…</p>}
    {config && <form className={s.form} onSubmit={save}>
      <label><input type="checkbox" checked={config.enabled} disabled={busy}
        onChange={event => setConfig({ ...config, enabled: event.target.checked })} /> Enable Scope Control for eligible workspaces</label>
      <label>Classifier model
        <select value={config.model} disabled={busy} onChange={event => {
          const model = event.currentTarget.value;
          if (isScopeModel(model)) setConfig({ ...config, model });
        }}>
          {Object.entries(scopeModels).map(([id, { label }]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <p className={s.meta}>This selection applies to new hosted checks across Pro and Enterprise workspaces.</p>
      {Object.entries(scopeLimits).map(([name, { label, min, max }]) => {
        const key = name as keyof typeof scopeLimits;
        return <label key={key}>{label}<input type="number" required min={min} max={max} step={1}
          value={Number.isFinite(config[key]) ? config[key] : ''} disabled={busy}
          onChange={event => setConfig({ ...config, [key]: event.target.valueAsNumber })} /></label>;
      })}
      <label>Reason for change<textarea required name="reason" minLength={3} maxLength={300} disabled={busy} /></label>
      <button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save classifier configuration'}</button>
    </form>}
  </section>;
}
