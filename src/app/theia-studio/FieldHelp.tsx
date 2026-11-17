'use client';
import {useRef, useState, type ReactNode} from 'react';
import s from './studio.module.css';

export default function FieldHelp({id, label, children}: {id: string; label: string; children: ReactNode}) {
    const [open, setOpen] = useState(false);
    const button = useRef<HTMLButtonElement>(null);
    return <div onKeyDown={event => {
        if (event.key === 'Escape' && open) {
            event.preventDefault();
            setOpen(false);
            button.current?.focus();
        }
    }}>
        <button ref={button} type='button' className={s.infoButton}
            aria-label={`Help for ${label}`} aria-expanded={open} aria-controls={id}
            onClick={() => setOpen(value => !value)}>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' aria-hidden='true'>
                <circle cx='12' cy='12' r='9'/><path d='M12 11v6'/><circle cx='12' cy='7.5' r='.7' fill='currentColor' stroke='none'/>
            </svg>
        </button>
        <p id={id} className={s.fieldHelp} hidden={!open}>{children}</p>
    </div>;
}
