// Shared frame for every lab: header with a big back button, title, and optional actions.
// Put the lab's <LabCanvas> and panels (.lab-left / .lab-right / .lab-bottom) inside as children.
import React from 'react';

export function LabShell({ title, subtitle, icon, accent, onBack, actions, children }) {
    return (
        <div className="lab" style={accent ? { '--accent': accent } : undefined}>
            {children}
            <header className="lab-header">
                <button className="btn" onClick={onBack}>← Меню</button>
                <div className="lab-title">
                    <div className="lab-title-icon" aria-hidden="true">{icon}</div>
                    <div>
                        <h1>{title}</h1>
                        {subtitle && <p>{subtitle}</p>}
                    </div>
                </div>
                {actions && <div className="lab-header-actions">{actions}</div>}
            </header>
        </div>
    );
}
