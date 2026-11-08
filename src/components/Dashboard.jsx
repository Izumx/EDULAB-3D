import React, { useState } from 'react';
import { Atom, ChevronRight, Globe2, Grab, Hand, Lightbulb, Microscope, Pi, Ruler, Settings, Sigma, Telescope, Timer } from 'lucide-react';
import { useHandStatus } from '../hand/handStore';
import { useHandSettings, setHandSettings } from '../hand/settings';
import { startTracker } from '../hand/tracker';
import { Emblem, Logo } from '../ui/Emblem';
import { SUBJECTS } from '../ui/subjects';
import { LANGS, setLang, useLang, useTr } from '../i18n/lang';
import './Dashboard.css';

const SENSITIVITY = [['low', 'Низкая'], ['medium', 'Средняя'], ['high', 'Высокая']];
const DWELL = [[0, 'Выкл'], [700, '0,7 с'], [1000, '1 с'], [1500, '1,5 с']];

function CameraControl() {
    const tr = useTr();
    const settings = useHandSettings();
    const { status, error, present } = useHandStatus();
    const [open, setOpen] = useState(false);

    const label = tr(!settings.cameraEnabled ? 'Управление руками выключено'
        : status === 'loading' ? 'Запускаю камеру…'
            : status === 'error' ? 'Ошибка камеры'
                : present ? 'Рука найдена' : 'Покажите ладонь камере');

    return (
        <div className="camera-control">
            <div className={`camera-state ${settings.cameraEnabled ? status : 'off'} ${present ? 'present' : ''}`}>
                <span className="dot" />
                {label}
            </div>
            {settings.cameraEnabled ? (
                <button className="btn" onClick={() => setHandSettings({ cameraEnabled: false })}>{tr('Выключить камеру')}</button>
            ) : (
                <button className="btn btn-primary" onClick={() => setHandSettings({ cameraEnabled: true })}><Hand aria-hidden="true" />{tr('Включить управление руками')}</button>
            )}
            <button className={`btn btn-icon ${open ? 'active' : ''}`} onClick={() => setOpen(o => !o)} title={tr('Настройки')} aria-label={tr('Настройки')}><Settings aria-hidden="true" /></button>

            {open && (
                <div className="settings-panel panel">
                    <div className="panel-title">{tr('Чувствительность')}</div>
                    <p className="muted small">{tr('Чем выше, тем меньше нужно двигать рукой. Высокая — если стоите далеко.')}</p>
                    <div className="segmented">
                        {SENSITIVITY.map(([value, text]) => (
                            <button key={value} className={`btn btn-small ${settings.sensitivity === value ? 'active' : ''}`}
                                onClick={() => setHandSettings({ sensitivity: value })}>{tr(text)}</button>
                        ))}
                    </div>
                    <div className="panel-title">{tr('Нажатие задержкой руки')}</div>
                    <div className="segmented">
                        {DWELL.map(([value, text]) => (
                            <button key={value} className={`btn btn-small ${settings.dwellMs === value ? 'active' : ''}`}
                                onClick={() => setHandSettings({ dwellMs: value })}>{tr(text)}</button>
                        ))}
                    </div>
                    <div className="panel-title">{tr('Окно камеры')}</div>
                    <div className="segmented">
                        <button className={`btn btn-small ${settings.showPreview ? 'active' : ''}`} onClick={() => setHandSettings({ showPreview: true })}>{tr('Показывать')}</button>
                        <button className={`btn btn-small ${!settings.showPreview ? 'active' : ''}`} onClick={() => setHandSettings({ showPreview: false })}>{tr('Скрыть')}</button>
                    </div>
                    {status === 'error' && (
                        <div className="settings-error">
                            <p>{tr(error)}</p>
                            <button className="btn btn-small" onClick={() => startTracker()}>{tr('Повторить')}</button>
                        </div>
                    )}
                    <p className="muted small privacy">
                        {tr('Видео с камеры обрабатывается только на этом компьютере и никуда не отправляется.')}{' '}
                        {tr('Библиотека MediaPipe (Google) может отправлять обезличенную статистику работы.')}
                    </p>
                </div>
            )}
        </div>
    );
}

function greeting() {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Доброе утро';
    if (h >= 12 && h < 17) return 'Добрый день';
    if (h >= 17 && h < 23) return 'Добрый вечер';
    return 'Здравствуйте';
}

// Faint outline drawings in the background, like doodles in the margins of an exercise book
const DOODLES = [
    { Icon: Atom, x: '6%', y: '24%', s: 120, r: -12 },
    { Icon: Sigma, x: '88%', y: '18%', s: 96, r: 10 },
    { Icon: Ruler, x: '92%', y: '74%', s: 110, r: -28 },
    { Icon: Microscope, x: '3%', y: '78%', s: 104, r: 8 },
    { Icon: Globe2, x: '47%', y: '90%', s: 90, r: 0 },
    { Icon: Telescope, x: '70%', y: '6%', s: 86, r: 14 },
    { Icon: Pi, x: '30%', y: '7%', s: 80, r: -8 },
    { Icon: Lightbulb, x: '58%', y: '48%', s: 70, r: 12 },
];

// РУС / ҚАЗ switch for the whole interface
function LangSwitch() {
    const lang = useLang();
    const tr = useTr();
    return (
        <div className="lang-switch" role="group" aria-label={tr('Язык интерфейса')}>
            {LANGS.map(l => (
                <button key={l.id} className={`btn btn-small${lang === l.id ? ' active' : ''}`} aria-pressed={lang === l.id}
                    onClick={() => setLang(l.id)}>{l.label}</button>
            ))}
        </div>
    );
}

function SubjectCard({ s, onOpen }) {
    const tr = useTr();
    return (
        <article className="module-card" style={{ '--accent': s.color }}>
            <button className="module-main" onClick={() => onOpen(s.id)}>
                <span className="module-top">
                    <Emblem id={s.id} size="3.1rem" />
                    <span className="module-grade">{tr(s.grades)}</span>
                </span>
                <span className="module-title">{tr(s.title)}</span>
                <span className="module-desc">{tr(s.desc)}</span>
            </button>
            <div className="module-modes">
                {s.modes
                    ? s.modes.map(m => (
                        <button key={m.id} className="module-mode" onClick={() => onOpen(`${s.id}/${m.id}`)}>
                            {tr(m.label)}<ChevronRight aria-hidden="true" />
                        </button>
                    ))
                    : s.tags.map(t => <span key={t} className="module-tag">{tr(t)}</span>)}
            </div>
        </article>
    );
}

export const Dashboard = ({ onOpen }) => {
    const tr = useTr();
    return (
    <div className="dashboard">
        <div className="dashboard-bg" aria-hidden="true">
            {DOODLES.map((d, i) => {
                const Doodle = d.Icon;
                return <Doodle key={i} className="doodle" style={{ left: d.x, top: d.y, width: d.s, height: d.s, transform: `rotate(${d.r}deg)` }} strokeWidth={1.2} />;
            })}
        </div>

        <header className="dashboard-top">
            <div className="brand">
                <Logo size={48} />
                <div className="brand-text">
                    <span className="brand-name">EduLab <b>3D</b></span>
                    <span className="brand-sub">{tr('Интерактивные 3D-уроки')}</span>
                </div>
            </div>
            <div className="dashboard-top-actions">
                <LangSwitch />
                <CameraControl />
            </div>
        </header>

        <main className="dashboard-main">
            <div className="dashboard-hero">
                <div>
                    <h1 className="dashboard-heading">{tr(greeting())}! <span>{tr('Какой урок сегодня?')}</span></h1>
                    <p>{tr('Выберите предмет — или сразу тему внутри него.')}</p>
                </div>
                <ul className="help-strip" aria-label={tr('Управление руками')}>
                    <li title={tr('Ведите ладонью — двигается курсор')}><span className="help-ico"><Hand aria-hidden="true" /></span><span><b>{tr('Ладонь')}</b> — {tr('курсор')}</span></li>
                    <li title={tr('Задержите курсор на кнопке — она нажмётся')}><span className="help-ico"><Timer aria-hidden="true" /></span><span><b>{tr('Задержка')}</b> — {tr('нажать')}</span></li>
                    <li title={tr('Щипок или кулак — схватить, вращать, нажать сразу')}><span className="help-ico"><Grab aria-hidden="true" /></span><span><b>{tr('Кулак')}</b> — {tr('схватить')}</span></li>
                </ul>
            </div>
            <div className="module-grid">
                {SUBJECTS.map(s => <SubjectCard key={s.id} s={s} onOpen={onOpen} />)}
            </div>
        </main>
    </div>
    );
};
