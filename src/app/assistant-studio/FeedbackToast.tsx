'use client';

import {useEffect,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import s from './studio.module.css';

type Feedback = { message: ReactNode; tone?: 'info' | 'error'; children?: ReactNode };

export default function FeedbackToast({message, tone='info', children}: Feedback) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    queueMicrotask(() => setContainer(document.getElementById('studio-feedback')));
  }, []);
  return message && container
    ? createPortal(<Toast key={typeof message==='string' ? message : undefined}
        message={message} tone={tone}>{children}</Toast>, container)
    : null;
}

function Toast({message,tone,children}: Feedback) {
  const [dismissed, setDismissed] = useState(false);
  const [within, setWithin] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (tone === 'error' || within || hovered) return;
    const timeout = setTimeout(() => setDismissed(true), 7000);
    return () => clearTimeout(timeout);
  }, [tone, within, hovered]);
  if (dismissed) return null;
  return <div className={s.feedbackToast} data-tone={tone} onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)} onFocus={() => setWithin(true)}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setWithin(false); }}>
    <div className={s.feedbackBody}>
      <div role={tone==='error' ? 'alert' : 'status'}>{message}</div>
      {children}
    </div>
    <button type="button" className={s.dismissFeedback} aria-label="Dismiss notification" onClick={() => setDismissed(true)}>×</button>
  </div>;
}
