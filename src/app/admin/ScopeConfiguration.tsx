'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { GUARD_PROMPT_MAX_LENGTH, isScopeModel, scopeLimits, scopeModels, type ScopeAdminConfig } from '@/lib/studio/scope-control';
import s from './operations.module.css';

type Props = { request: <T>(body: object) => Promise<T>; onSessionChange: () => Promise<void> };

export default function ScopeConfiguration({ request, onSessionChange }: Props) {
  const [config, setConfig] = useState<ScopeAdminConfig | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void request<ScopeAdminConfig>({ action: 'scope_config' }).then(value => {
      if (active) setConfig(value);
    }).catch((problem: Error) => {
      if (active) setError(problem.message);
    });
    return () => { active = false; };
  }, [request]);

  async function save(event: FormEvent<HTMLFormElement>, savePrompt = false) {
    event.preventDefault();
    if (!config || busy) return;
    const form = event.currentTarget;
    const reason = new FormData(form).get('reason');
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { guard_prompt, guard_prompt_version, ...settings } = config;
      if (savePrompt) {
        const value = await request<{ prompt: string; version: number }>({
          action: 'save_guard_prompt', prompt: guard_prompt, version: guard_prompt_version, reason,
        });
        setConfig({ ...settings, guard_prompt: value.prompt, guard_prompt_version: value.version });
      } else {
        await request({ action: 'save_scope_config', ...settings, reason });
      }
      form.reset();
      setNotice(savePrompt ? 'Guard prompt saved.' : 'Scope Control configuration saved.');
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
    <p className={s.meta}>Monthly allowances use UTC and cover both topic and prompt injection checks in live chat and Preview. Replies pause for affected workspaces once an allowance is reached. A zero allowance pauses replies immediately.</p>
    {error && <p className={s.message} data-error="true" role="alert">{error}</p>}
    {notice && <p className={s.message} role="status">{notice}</p>}
    {!config && !error && <p role="status">Loading configuration…</p>}
    {config && <><form className={s.form} onSubmit={event => save(event)}>
      <label><input type="checkbox" checked={config.enabled} disabled={busy}
        onChange={event => setConfig({ ...config, enabled: event.target.checked })} /> Enable topic filtering for eligible workspaces</label>
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
    </form>
    <form className={s.form} onSubmit={event => save(event, true)} aria-labelledby="guard-prompt-title">
      <h3 id="guard-prompt-title">Guard prompt</h3>
      <p className={s.meta} id="guard-prompt-help">Changes apply to new prompt injection and topic checks across Pro and Enterprise. Current saved version {config.guard_prompt_version}.</p>
      <label>Classifier instructions
        <textarea required rows={14} maxLength={GUARD_PROMPT_MAX_LENGTH} value={config.guard_prompt}
          aria-describedby="guard-prompt-help" disabled={busy}
          onChange={event => setConfig({ ...config, guard_prompt: event.target.value })}/>
      </label>
      <label>Reason for prompt change<textarea required name="reason" minLength={3} maxLength={300} disabled={busy}/></label>
      <button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save guard prompt'}</button>
    </form></>}
  </section>;
}
