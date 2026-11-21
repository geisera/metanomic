'use client';

import { useEffect, useState } from 'react';
import { promptGuardAuditActions, type PromptGuardAuditPage } from '@/lib/studio/admin-contract';
import s from './operations.module.css';

type Props = {
  request: <T>(body: object) => Promise<T>;
  onSessionChange: () => Promise<void>;
  revision: number;
  onRefresh: () => void;
};
type History = { revision: number; page?: PromptGuardAuditPage; error?: string };

function displayValue(value: unknown) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  return String(value);
}

export default function PromptGuardHistory({ request, onSessionChange, revision, onRefresh }: Props) {
  const [history, setHistory] = useState<History | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const activeHistory = history?.revision === revision ? history : null;
  const page = activeHistory?.page;

  useEffect(() => {
    let active = true;
    void request<PromptGuardAuditPage>({ action: 'prompt_guard_history' }).then(result => {
      if (active) setHistory({ revision, page: result });
    }).catch((problem: Error & { status?: number }) => {
      if (!active) return;
      setHistory({ revision, error: problem.message });
      if (problem.status === 401 || problem.status === 403) void onSessionChange();
    });
    return () => { active = false; };
  }, [request, onSessionChange, revision]);

  async function loadOlder() {
    if (!page?.next || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const older = await request<PromptGuardAuditPage>({ action: 'prompt_guard_history', before: page.next });
      setHistory(current => current?.revision === revision ? {
        revision, page: { entries: [...page.entries, ...older.entries], next: older.next },
      } : current);
    } catch (error) {
      const problem = error as Error & { status?: number };
      setHistory(current => current?.revision === revision ? { ...current, error: problem.message } : current);
      if (problem.status === 401 || problem.status === 403) await onSessionChange();
    } finally {
      setLoadingOlder(false);
    }
  }

  return <section className={s.guardHistory} aria-labelledby="prompt-guard-history-title">
    <div className={s.row}>
      <h3 id="prompt-guard-history-title">Change history</h3>
      <button type="button" className="button button-outline" onClick={onRefresh} disabled={!activeHistory || loadingOlder}>Refresh history</button>
    </div>
    {!activeHistory && <p role="status">Loading Prompt Guard history…</p>}
    {activeHistory?.error && <p className={s.message} data-error="true" role="alert">{activeHistory.error}</p>}
    {page && (page.entries.length ? <div className={s.tableWrap}>
      <table className={s.table} aria-label="Prompt Guard changes">
        <thead><tr><th scope="col">Time and staff member</th><th scope="col">Change and reason</th></tr></thead>
        <tbody>{page.entries.map(entry => <tr key={entry.id}>
          <td><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString()}</time><br/>{entry.actor}</td>
          <td><strong>{promptGuardAuditActions[entry.action].label}</strong><p>{entry.reason}</p>
            <details><summary>Before and after</summary>
              {entry.changes.length ? <dl className={s.auditDiff}>{entry.changes.map(change => <div key={change.label}>
                <dt>{change.label}</dt>
                <dd><span>Before</span><pre>{displayValue(change.before)}</pre></dd>
                <dd><span>After</span><pre>{displayValue(change.after)}</pre></dd>
              </div>)}</dl> : <p>No values changed.</p>}
            </details>
          </td>
        </tr>)}</tbody>
      </table>
    </div> : <p>No Prompt Guard changes recorded.</p>)}
    {page?.next && <button type="button" className="button button-outline" onClick={loadOlder} disabled={loadingOlder}>
      {loadingOlder ? 'Loading…' : 'Show older changes'}
    </button>}
  </section>;
}
