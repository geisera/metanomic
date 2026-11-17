'use client';
import {cloneElement, useRef, useState, type ReactElement, type ReactNode} from 'react';
import s from './studio.module.css';

type Props = {
    id: string;
    label: string;
    caption: ReactNode;
    control: ReactElement<{id?: string; 'aria-describedby'?: string}>;
    checkbox?: boolean;
    children: ReactNode;
    detail?: ReactNode;
};

export default function FieldHelp({id, label, caption, control, checkbox, children, detail}: Props) {
    const [open, setOpen] = useState(false);
    const button = useRef<HTMLButtonElement>(null);
    const controlId = `${id}-control`;
    const input = cloneElement(control, {id: controlId, 'aria-describedby': id+(detail?' '+id+'-detail':'')});
    return <div className={s.field} onKeyDown={event => {
        if (event.key === 'Escape' && open) {
            event.preventDefault();
            setOpen(false);
            button.current?.focus();
        }
    }}>
        <div className={s.fieldHeading}>
            <label htmlFor={controlId} className={checkbox ? s.check : undefined}>
                {checkbox && input}{caption}
            </label>
            {detail && <button ref={button} type='button' className={s.infoButton}
                aria-label={`Help for ${label}`} aria-expanded={open} aria-controls={id+'-detail'}
                onClick={() => setOpen(value => !value)}>
                <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.7' aria-hidden='true'>
                    <circle cx='12' cy='12' r='9'/><path d='M12 11v6'/><circle cx='12' cy='7.5' r='.7' fill='currentColor' stroke='none'/>
                </svg>
            </button>}
        </div>
        {!checkbox && input}
        <p id={id} className={s.fieldHelp}>{children}</p>{detail&&<p id={id+'-detail'} className={s.extraHelp} hidden={!open}>{detail}</p>}
    </div>;
}
