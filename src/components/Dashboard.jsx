import React, { useState } from 'react';
import { Atom, ChevronRight, Globe2, Grab, Hand, Lightbulb, Microscope, Pi, Ruler, Settings, Sigma, Telescope, Timer } from 'lucide-react';
import { useHandStatus } from '../hand/handStore';
import { useHandSettings, setHandSettings } from '../hand/settings';
import { startTracker } from '../hand/tracker';
import { Emblem, Logo } from '../ui/Emblem';
import { SUBJECTS } from '../ui/subjects';
import './Dashboard.css';

const SENSITIVITY = [['low', 'Низкая'], ['medium', 'Средняя'], ['high', 'Высокая']];
const DWELL = [[0, 'Выкл'], [700, '0,7 с'], [1000, '1 с'], [1500, '1,5 с']];

function CameraControl() {
    const settings = useHandSettings();
    const { status, error, present } = useHandStatus();
    const [open, setOpen] = useState(false);

    const label = !settings.cameraEnabled ? 'Управление руками выключено'
        : status === 'loading' ? 'Запускаю камеру…'
            : status === 'error' ? 'Ошибка камеры'
                : present ? 'Рука найдена' : 'Покажите ладонь камере';

    return (
        <div className="camera-control">
            <div className={`camera-state ${settings.cameraEnabled ? status : 'off'} ${present ? 'present' : ''}`}>
                <span className="dot" />
                {label}
            </div>
            {settings.cameraEnabled ? (
                <button className="btn" onClick={() => setHandSettings({ cameraEnabled: false })}>Выключить камеру</button>
            ) : (
                <button className="btn btn-primary" onClick={() => setHandSettings({ cameraEnabled: true })}><Hand aria-hidden="true" />Включить управление руками</button>
            )}
            <button className={`btn btn-icon ${open ? 'active' : ''}`} onClick={() => setOpen(o => !o)} title="Настройки" aria-label="Настройки"><Settings aria-hidden="true" /></button>

            {open && (
                <div className="settings-panel panel">
                    <div className="panel-title">Чувствительность</div>
                    <p className="muted small">Чем выше, тем меньше нужно двигать рукой. Высокая — если стоите далеко.</p>
                    <div className="segmented">
                        {SENSITIVITY.map(([value, text]) => (
                            <button key={value} className={`btn btn-small ${settings.sensitivity === value ? 'active' : ''}`}
                                onClick={() => setHandSettings({ sensitivity: value })}>{text}</button>
                        ))}
                    </div>
                    <div className="panel-title">Нажатие задержкой руки</div>
                    <div className="segmented">
                        {DWELL.map(([value, text]) => (
                            <button key={value} className={`btn btn-small ${settings.dwellMs === value ? 'active' : ''}`}
                                onClick={() => setHandSettings({ dwellMs: value })}>{text}</button>
                        ))}
                    </div>
                    <div className="panel-title">Окно камеры</div>
                    <div className="segmented">
                        <button className={`btn btn-small ${settings.showPreview ? 'active' : ''}`} onClick={() => setHandSettings({ showPreview: true })}>Показывать</button>
                        <button className={`btn btn-small ${!settings.showPreview ? 'active' : ''}`} onClick={() => setHandSettings({ showPreview: false })}>Скрыть</button>
                    </div>
                    {status === 'error' && (
                        <div className="settings-error">
                            <p>{error}</p>
                            <button className="btn btn-small" onClick={() => startTracker()}>Повторить</button>
                        </div>
                    )}
                    <p className="muted small privacy">
                        Видео с камеры обрабатывается только на этом компьютере и никуда не отправляется.
                        Библиотека MediaPipe (Google) может отправлять обезличенную статистику работы.
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

function SubjectCard({ s, onOpen }) {
    return (
        <article className="module-card" style={{ '--accent': s.color }}>
            <button className="module-main" onClick={() => onOpen(s.id)}>
                <span className="module-top">
                    <Emblem id={s.id} size="3.1rem" />
                    <span className="module-grade">{s.grades}</span>
                </span>
                <span className="module-title">{s.title}</span>
                <span className="module-desc">{s.desc}</span>
            </button>
            <div className="module-modes">
                {s.modes
                    ? s.modes.map(m => (
                        <button key={m.id} className="module-mode" onClick={() => onOpen(`${s.id}/${m.id}`)}>
                            {m.label}<ChevronRight aria-hidden="true" />
                        </button>
                    ))
                    : s.tags.map(t => <span key={t} className="module-tag">{t}</span>)}
            </div>
        </article>
    );
}

export const Dashboard = ({ onOpen }) => (
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
                    <span className="brand-sub">Интерактивные 3D-уроки</span>
                </div>
            </div>
            <CameraControl />
        </header>

        <main className="dashboard-main">
            <div className="dashboard-hero">
                <div>
                    <h1 className="dashboard-heading">{greeting()}! <span>Какой урок сегодня?</span></h1>
                    <p>Выберите предмет — или сразу тему внутри него.</p>
                </div>
                <ul className="help-strip" aria-label="Управление руками">
                    <li title="Ведите ладонью — двигается курсор"><span className="help-ico"><Hand aria-hidden="true" /></span><span><b>Ладонь</b> — курсор</span></li>
                    <li title="Задержите курсор на кнопке — она нажмётся"><span className="help-ico"><Timer aria-hidden="true" /></span><span><b>Задержка</b> — нажать</span></li>
                    <li title="Щипок или кулак — схватить, вращать, нажать сразу"><span className="help-ico"><Grab aria-hidden="true" /></span><span><b>Кулак</b> — схватить</span></li>
                </ul>
            </div>
            <div className="module-grid">
                {SUBJECTS.map(s => <SubjectCard key={s.id} s={s} onOpen={onOpen} />)}
            </div>
        </main>
    </div>
);
