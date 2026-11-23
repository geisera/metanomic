'use client';
import {cloneElement, useRef, useState, type ReactElement, type ReactNode} from 'react';
import {InformationCircleIcon} from '@heroicons/react/24/outline';
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
                <InformationCircleIcon width={22} height={22}/>
            </button>}
        </div>
        {!checkbox && input}
        <p id={id} className={s.fieldHelp}>{children}</p>{detail&&<p id={id+'-detail'} className={s.extraHelp} hidden={!open}>{detail}</p>}
    </div>;
}
