// Shared frame for every lab: header with a big back button, the subject emblem, title, and optional actions.
// Put the lab's <LabCanvas> and panels (.lab-left / .lab-right / .lab-bottom) inside as children.
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Emblem } from './Emblem';
import { SUBJECT_BY_ID } from './subjects';
import { useTr } from '../i18n/lang';

export function LabShell({ subject, title, subtitle, onBack, actions, children }) {
    const tr = useTr();
    const s = SUBJECT_BY_ID[subject];
    return (
        <div className="lab" style={s ? { '--accent': s.color } : undefined}>
            {children}
            <header className="lab-header">
                <button className="btn lab-back" onClick={onBack}><ArrowLeft aria-hidden="true" />{tr('Меню')}</button>
                <div className="lab-title">
                    <div className="lab-title-icon"><Emblem id={subject} /></div>
                    <div>
                        <h1>{tr(title ?? s?.title)}</h1>
                        {subtitle && <p>{tr(subtitle)}</p>}
                    </div>
                </div>
                {actions && <div className="lab-header-actions">{actions}</div>}
            </header>
        </div>
    );
}
