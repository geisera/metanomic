'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { SCOPE_PROMPT_MAX_LENGTH, isScopeModel, scopeLimits, scopeModels, type ScopeAdminConfig } from '@/lib/studio/scope-control';
import PromptGuardHistory from './PromptGuardHistory';
import s from './operations.module.css';

type Props = { request: <T>(body: object) => Promise<T>; onSessionChange: () => Promise<void> };
const promptEditors = [
  { field: 'guard_prompt', version: 'guard_prompt_version', action: 'save_guard_prompt', title: 'Guard prompt',
    label: 'Classifier instructions', reason: 'Reason for prompt change', saveLabel: 'Save guard prompt',
    help: 'Changes apply to new prompt injection and topic checks across Pro and Enterprise.' },
  { field: 'topic_prompt', version: 'topic_prompt_version', action: 'save_topic_prompt', title: 'Topic filtering instructions',
    label: 'Answer model instructions', reason: 'Reason for topic instructions change', saveLabel: 'Save topic instructions',
    help: 'These instructions guide Preview and live replies for Pro and Enterprise assistants with topic filtering enabled.' },
] as const;

export default function ScopeConfiguration({ request, onSessionChange }: Props) {
  const [config, setConfig] = useState<ScopeAdminConfig | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    let active = true;
    void request<ScopeAdminConfig>({ action: 'scope_config' }).then(value => {
      if (active) setConfig(value);
    }).catch((problem: Error) => {
      if (active) setError(problem.message);
    });
    return () => { active = false; };
  }, [request]);

  async function save(event: FormEvent<HTMLFormElement>, editor?: (typeof promptEditors)[number]) {
    event.preventDefault();
    if (!config || busy) return;
    const form = event.currentTarget;
    const reason = new FormData(form).get('reason');
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (editor) {
        const value = await request<{ prompt: string; version: number }>({
          action: editor.action, prompt: config[editor.field], version: config[editor.version], reason,
        });
        setConfig({ ...config, [editor.field]: value.prompt, [editor.version]: value.version });
      } else {
        const { model, enabled, pro_monthly, enterprise_monthly, global_monthly, timeout_ms } = config;
        await request({ action: 'save_scope_config', model, enabled, pro_monthly, enterprise_monthly, global_monthly, timeout_ms, reason });
      }
      form.reset();
      setNotice(editor ? editor.title + ' saved.' : 'Prompt Guard configuration saved.');
      setHistoryVersion(version => version + 1);
    } catch (problem) {
      const failure = problem as Error & { status?: number };
      setError(failure.message);
      if (failure.status === 401 || failure.status === 403) await onSessionChange();
    } finally {
      setBusy(false);
    }
  }

  return <section className={s.panel} aria-labelledby="scope-config-title">
    <h2 id="scope-config-title">Prompt Guard <span className={s.betaBadge}>Beta</span></h2>
    <p className={s.meta}>Monthly allowances use UTC and cover both topic and prompt injection checks in live chat and Preview. Replies pause for affected workspaces once an allowance is reached. A zero allowance pauses replies immediately.</p>
    {error && <p className={s.message} data-error="true" role="alert">{error}</p>}
    {notice && <p className={s.message} role="status">{notice}</p>}
    {!config && !error && <p role="status">Loading configuration…</p>}
    {config && <><form className={s.form} onSubmit={event => save(event)}>
      <fieldset className={s.optionGroup}><legend>Topic filtering</legend><label className={s.optionRow}><span><strong>Enable topic filtering</strong><small id="scope-enabled-help">Apply the configured topic filter to eligible workspaces.</small></span><input aria-describedby="scope-enabled-help" type="checkbox" checked={config.enabled} disabled={busy}
        onChange={event => setConfig({ ...config, enabled: event.target.checked })} /></label></fieldset>
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
    {promptEditors.map(editor => <form key={editor.field} className={s.form} onSubmit={event => save(event, editor)} aria-labelledby={editor.field + '-title'}>
      <h3 id={editor.field + '-title'}>{editor.title}</h3>
      <p className={s.meta} id={editor.field + '-help'}>{editor.help} Current saved version {config[editor.version]}.</p>
      <label>{editor.label}
        <textarea required rows={14} maxLength={SCOPE_PROMPT_MAX_LENGTH} value={config[editor.field]}
          aria-describedby={editor.field + '-help'} disabled={busy}
          onChange={event => setConfig({ ...config, [editor.field]: event.target.value })}/>
      </label>
      <label>{editor.reason}<textarea required name="reason" minLength={3} maxLength={300} disabled={busy}/></label>
      <button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : editor.saveLabel}</button>
    </form>)}</>}
    <PromptGuardHistory request={request} onSessionChange={onSessionChange} revision={historyVersion}
      onRefresh={() => setHistoryVersion(version => version + 1)}/>
  </section>;
}
